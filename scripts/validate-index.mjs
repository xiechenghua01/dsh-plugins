#!/usr/bin/env node
/**
 * Check the published plugin market index against the repository.
 *
 * Fails when `index.json` is missing, when it violates format 1 (validated with the same package
 * the Harness plugin market reads indexes with), when a plugin directory is not listed, when a
 * version pins a commit this Git history does not contain, or when the document is out of date
 * with the plugins' committed metadata (run `pnpm run release` to regenerate it).
 */
import { join } from 'node:path'
import {
  ROOT,
  hasCommit,
  listPlugins,
  readJson,
  readMarketConfig,
} from './lib/repo.mjs'
import {
  buildIndexDocument,
  installTargets,
  validateIndexDocument,
} from './lib/index-doc.mjs'

const INDEX_FILE = join(ROOT, 'index.json')

async function main() {
  const config = await readMarketConfig()
  const plugins = await listPlugins()
  const raw = await readJson(INDEX_FILE)
  const index = validateIndexDocument(raw, config)

  const problems = []
  const indexed = new Map(index.plugins.map((entry) => [entry.name, entry]))

  for (const plugin of plugins) {
    if (!indexed.has(plugin.manifest.name)) {
      problems.push(`index.json does not list ${plugin.manifest.name} (${plugin.relDir})`)
    }
  }
  for (const entry of index.plugins) {
    const plugin = plugins.find((item) => item.manifest.name === entry.name)
    if (plugin === undefined) {
      problems.push(`index.json lists ${entry.name}, which is not a directory under plugins/`)
      continue
    }
    if (entry.repository?.url !== config.repository) {
      problems.push(`${entry.name}: repository.url must be ${config.repository}`)
    }
    if (entry.repository?.directory !== plugin.relDir) {
      problems.push(`${entry.name}: repository.directory must be ${plugin.relDir}`)
    }
    for (const version of entry.versions) {
      const label = `${entry.name}@${version.version}`
      // Git entries are historical (the catalog now installs from npm); they still have to pin
      // a commit this clone has, or the recorded provenance is a lie. npm entries carry no
      // commit, because the registry's own version immutability replaces that guarantee.
      if (version.source.type === 'git') {
        if (version.source.path !== plugin.relDir) {
          problems.push(`${label}: source.path must be ${plugin.relDir}`)
        }
        if (!hasCommit(version.source.commit)) {
          problems.push(`${label}: pins ${version.source.commit}, which is not in this Git history`)
        }
      }
    }
  }

  const regenerated = buildIndexDocument(config, plugins, raw)
  if (JSON.stringify(regenerated) !== JSON.stringify(raw)) {
    problems.push('index.json is out of date with the plugins; run `pnpm run release` and commit the result')
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ✗ ${problem}`)
    throw new Error(`${String(problems.length)} problem(s) in index.json`)
  }

  console.log(`index.json: ${String(index.plugins.length)} plugin(s), ${String(index.plugins.reduce((sum, entry) => sum + entry.versions.length, 0))} version(s), valid for ${config.indexUrl}`)
  for (const target of installTargets(index)) {
    console.log(`  ${target.name}@${target.version}: ${target.spec}`)
  }
}

main().catch((error) => {
  console.error(`validate: ${error.message}`)
  process.exit(1)
})
