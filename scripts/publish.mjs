#!/usr/bin/env node
/**
 * Publish the plugin packages and the catalog package to npm.
 *
 * Plugins install with `pnpm add <name>@<version>`, so every npm version listed in `index.json`
 * must already exist on the registry before the index pointing at it goes live. The order is
 * therefore fixed: plugin packages first, the catalog package last, and this script refuses to
 * publish a catalog while any indexed version is still missing.
 *
 * The catalog carries no version of its own beyond cache-busting: when the declared version is
 * already on the registry it publishes under a UTC timestamp instead, and `package.json` is left
 * untouched afterwards, so a CI run never has to write back to the repository.
 *
 * Authentication is whatever npm can find: `NPM_TOKEN` for the first release, OIDC trusted
 * publishing for every release after the package exists. Local runs need `npm login`.
 *
 * Usage: node scripts/publish.mjs [--dry-run] [--otp=<code>]
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import { ROOT, listPlugins } from './lib/repo.mjs'

const INDEX_FILE = join(ROOT, 'index.json')
const MANIFEST_FILE = join(ROOT, 'package.json')
const dryRun = process.argv.includes('--dry-run')
// 账号开启 auth-and-writes 时，每次 publish 都要一次性验证码；透传给每一个 npm publish。
const otpArg = process.argv.find((item) => item.startsWith('--otp='))
const otp = otpArg === undefined ? [] : ['--otp', otpArg.slice('--otp='.length)]

function npm(args, cwd = ROOT) {
  const result = spawnSync('npm', args, { cwd, encoding: 'utf8' })
  if (result.error !== undefined) throw new Error(`npm ${args.join(' ')}: ${result.error.message}`)
  return result
}

/** Whether one exact name@version is already on the registry. */
function isPublished(name, version) {
  return npm(['view', `${name}@${version}`, 'version']).status === 0
}

function publish(dir, label) {
  if (dryRun) {
    console.log(`dry run: would publish ${label}`)
    return
  }
  // stdio 必须是 inherit：账号开了 auth-and-writes 时 npm 要交互式读 OTP，管道会把提示吞掉。
  const result = spawnSync('npm', ['publish', '--access', 'public', ...otp], { cwd: dir, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`npm publish failed for ${label} (see npm output above)`)
  console.log(`published ${label}`)
}

const whoami = npm(['whoami'])
if (whoami.status !== 0) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    // CI 里没有交互式登录：NPM_TOKEN 或 OIDC 在 publish 那一刻才生效，whoami 探不到。
    console.log('npm whoami unavailable; CI authenticates at publish time (NPM_TOKEN or OIDC)')
  } else {
    console.error('publish: not logged in to npm; run `npm login` first')
    process.exit(1)
  }
} else {
  console.log(`npm user: ${whoami.stdout.trim()}`)
}

for (const plugin of await listPlugins()) {
  const { name, version } = plugin.manifest
  const label = `${name}@${version}`
  if (isPublished(name, version)) {
    console.log(`skip ${label} (already on registry)`)
    continue
  }
  publish(plugin.dir, label)
}

const index = JSON.parse(readFileSync(INDEX_FILE, 'utf8'))
const missing = []
for (const entry of index.plugins) {
  const npmVersions = entry.versions.filter((item) => item.source?.type === 'npm')
  if (npmVersions.length === 0) continue
  const newest = npmVersions.reduce((a, b) => (semver.gt(b.version, a.version) ? b : a))
  if (!isPublished(entry.name, newest.version)) missing.push(`${entry.name}@${newest.version}`)
}
if (missing.length > 0) {
  if (dryRun) {
    console.log(`dry run: ${String(missing.length)} indexed version(s) are not on the registry yet: ${missing.join(', ')}`)
  } else {
    console.error(`publish: index.json points at versions the registry does not have: ${missing.join(', ')}`)
    console.error('publish: push the plugin packages first, or rerun `pnpm run release`')
    process.exit(1)
  }
}

// The catalog has no semantic version of its own — the number only exists to give the registry and
// the CDN a fresh key. When the declared version is taken, publish under a UTC timestamp instead of
// bumping `package.json`: CI cannot write the bump back, so a stored bump would collide on the next
// run, while a timestamp is unique by construction. The file is restored afterwards either way.
const MANIFEST_TEXT = readFileSync(MANIFEST_FILE, 'utf8')
const manifest = JSON.parse(MANIFEST_TEXT)
const declared = manifest.version
let catalogVersion = declared
if (isPublished(manifest.name, declared)) {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  catalogVersion = `${String(now.getUTCFullYear())}.${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}.${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
  console.log(`catalog ${declared} is taken; publishing ${catalogVersion}`)
}
if (dryRun) {
  console.log(`dry run: would publish ${manifest.name}@${catalogVersion}`)
} else {
  manifest.version = catalogVersion
  writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`)
  try {
    publish(ROOT, `${manifest.name}@${catalogVersion}`)
  } finally {
    writeFileSync(MANIFEST_FILE, MANIFEST_TEXT)
  }
}
