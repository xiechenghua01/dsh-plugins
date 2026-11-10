#!/usr/bin/env node
/**
 * Publish the current state of one or more plugins to the plugin market index.
 *
 * Plugins install from npm, so a release records the version numbers that `pnpm run publish:npm`
 * will push: bump a plugin's `version`, commit it, then run this script, which appends one version
 * entry per selected plugin and commits `index.json`. Re-running for a version already in the
 * index is a no-op; changing code without bumping the version cannot ship, because npm refuses to
 * overwrite a published version.
 *
 * Usage: node scripts/release.mjs [plugin ...] [--dry-run] [--no-commit]
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  ROOT,
  gitClean,
  gitDiffClean,
  gitHead,
  listPlugins,
  readJson,
  readMarketConfig,
  run,
  shippedPaths,
} from './lib/repo.mjs'
import {
  buildIndexDocument,
  buildVersionEntry,
  installTargets,
  validateIndexDocument,
} from './lib/index-doc.mjs'

const INDEX_FILE = join(ROOT, 'index.json')

const options = { dryRun: false, commit: true }
const requested = []
for (const argument of process.argv.slice(2)) {
  if (argument === '--dry-run') options.dryRun = true
  else if (argument === '--no-commit') options.commit = false
  else if (argument === '--help' || argument === '-h') {
    console.log('usage: pnpm run release [plugin ...] [--dry-run] [--no-commit]')
    process.exit(0)
  } else if (argument.startsWith('-')) {
    console.error(`release: unknown option ${argument}`)
    process.exit(1)
  } else {
    requested.push(argument)
  }
}

const short = (commit) => commit.slice(0, 7)

function select(plugins) {
  if (requested.length === 0) return plugins
  const selected = plugins.filter(
    (plugin) => requested.includes(plugin.slug) || requested.includes(plugin.manifest.name),
  )
  if (selected.length !== requested.length) {
    const found = new Set(selected.flatMap((plugin) => [plugin.slug, plugin.manifest.name]))
    const missing = requested.filter((name) => !found.has(name))
    throw new Error(`unknown plugin: ${missing.join(', ')}; plugins are ${plugins.map((item) => item.slug).join(', ')}`)
  }
  return selected
}

async function main() {
  const config = await readMarketConfig()
  const plugins = await listPlugins()
  const selected = select(plugins)

  const head = gitHead()
  if (options.commit && !options.dryRun && !gitClean()) {
    throw new Error(
      'the working tree is dirty; commit the plugin change first, because the index pins that commit as HEAD',
    )
  }

  let previous
  try {
    previous = await readJson(INDEX_FILE)
  } catch {
    previous = undefined
  }
  if (previous !== undefined) validateIndexDocument(previous, config)

  const publishedAt = Math.floor(Date.now() / 1000)
  const document = buildIndexDocument(config, plugins, previous)
  const released = []
  for (const plugin of selected) {
    const entry = document.plugins.find((item) => item.name === plugin.manifest.name)
    const version = plugin.manifest.version
    const existing = entry.versions.find((item) => item.version === version)
    if (existing !== undefined) {
      if (existing.source.type === 'git' && existing.source.commit !== undefined) {
        // 历史条目仍按 commit 判断，保持原有严格性；新条目不再产生这种来源。
        if (existing.source.commit === head) {
          console.log(`${entry.name}@${version} is already published at ${short(head)}; nothing to do`)
          continue
        }
        if (gitDiffClean(existing.source.commit, head, shippedPaths(plugin))) {
          console.log(
            `${entry.name}@${version} is already published at ${short(existing.source.commit)} and the files it ships are unchanged since; nothing to do`,
          )
          continue
        }
        throw new Error(
          `${entry.name}@${version} is already published at ${short(existing.source.commit)}; ` +
            `bump "version" in ${plugin.relDir}/package.json to release changed code`,
        )
      }
      // npm 条目：版本本身就是唯一身份，同版本已在索引里即视为已发布。
      // 内容是否真的变过由 npm registry 的同版本不可覆盖来兜底（publish 会报 EPUBLISHCONFLICT）。
      console.log(`${entry.name}@${version} is already in the index; nothing to do`)
      continue
    }
    const versionEntry = buildVersionEntry(config, plugin, head, publishedAt)
    entry.versions.push(versionEntry)
    released.push({ name: entry.name, version, entry: versionEntry })
  }

  if (released.length === 0) {
    console.log('no plugin version to publish')
    return
  }

  const index = validateIndexDocument(document, config)
  const targets = installTargets(index)
  const releasedNames = new Set(released.map((item) => item.name))

  if (options.dryRun) {
    console.log(`dry run: would publish ${released.length} plugin version(s) to index.json`)
  } else {
    await writeFile(INDEX_FILE, `${JSON.stringify(document, null, 2)}\n`)
    console.log(`wrote ${INDEX_FILE}`)
  }
  for (const target of targets.filter((item) => releasedNames.has(item.name))) {
    console.log(`  ${target.name}@${target.version}`)
    console.log(`    install target: ${target.spec}`)
  }

  if (!options.dryRun && options.commit) {
    run('git', ['add', 'index.json'])
    const message =
      released.length === 1
        ? `chore(release): publish ${released[0].name}@${released[0].version}`
        : `chore(release): publish ${String(released.length)} plugin versions`
    run('git', ['commit', '-m', message])
    console.log(`committed index.json at ${short(gitHead())}`)
    console.log(`next: git push origin ${config.branch}`)
  } else if (!options.dryRun) {
    console.log('index.json written but not committed (--no-commit)')
  }
}

main().catch((error) => {
  console.error(`release: ${error.message}`)
  process.exit(1)
})
