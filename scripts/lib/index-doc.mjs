/**
 * Assembling and checking the plugin market index (format 1) from the repository's declarations.
 *
 * The index is generated, never hand-edited: display metadata comes from `market.json`, versions
 * from each plugin's `package.json`, and a version's source is npm, which installs as
 * `<name>@<version>` from the registry. Validation uses the same
 * `@deepseek-ai/dsh-plugin-market-index` package the DeepSeek Harness plugin market reads indexes
 * with, so a published index cannot drift from the reader's rules.
 */
import { marketInstallTarget, parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { pluginSource } from './repo.mjs'

/**
 * One plugin entry for the index document.
 * @param {object} config - the root market declaration.
 * @param {{ manifest: object, market: object, relDir: string }} plugin - one plugin package.
 * @param {object[]} versions - version entries, oldest first; the validator orders them for readers.
 */
export function buildPluginEntry(config, plugin, versions) {
  const { manifest, market } = plugin
  const entry = {
    name: manifest.name,
    author: market.author ?? config.author,
    homepage: market.homepage ?? `${config.repository}/tree/${config.branch}/${plugin.relDir}`,
    repository: market.repository ?? { url: config.repository, directory: plugin.relDir },
    metadata: {
      ...(market.category === undefined ? {} : { category: market.category }),
      ...(market.keywords === undefined ? {} : { keywords: market.keywords }),
      ...(market.labels === undefined ? {} : { labels: market.labels }),
      ...(market.sortKeys === undefined ? {} : { sortKeys: market.sortKeys }),
    },
    versions,
  }
  for (const field of ['title', 'description', 'icon']) {
    if (market[field] !== undefined) entry[field] = market[field]
  }
  return entry
}

/** One version entry: the package version plus where to install it from. */
export function buildVersionEntry(config, plugin, commit, publishedAt) {
  const entry = {
    version: plugin.manifest.version,
    publishTimestamp: publishedAt,
    source: pluginSource(config, plugin, commit),
  }
  const range = plugin.manifest.engines?.dsh
  if (typeof range === 'string' && range !== '') entry.engines = { dsh: range }
  return entry
}

/**
 * Build the whole index document.
 * @param {object} config - the root market declaration.
 * @param {Array} plugins - every plugin package (`listPlugins()`).
 * @param {object | undefined} previous - the previously published document, whose version entries are retained.
 */
export function buildIndexDocument(config, plugins, previous) {
  const previousPlugins = Array.isArray(previous?.plugins) ? previous.plugins : []
  return {
    format: 1,
    title: config.title,
    ...(config.description === undefined ? {} : { description: config.description }),
    metadata: {
      categories: config.categories ?? {},
      labels: config.labels ?? {},
      ...(config.sortKeys === undefined ? {} : { sortKeys: config.sortKeys }),
    },
    plugins: plugins.map((plugin) => {
      const published = previousPlugins.find((item) => item.name === plugin.manifest.name)
      const versions = Array.isArray(published?.versions) ? [...published.versions] : []
      return buildPluginEntry(config, plugin, versions)
    }),
  }
}

/**
 * Validate a document with the Harness plugin market validator.
 * @throws {Error} naming the first violated rule and its JSON path.
 */
export function validateIndexDocument(document, config) {
  try {
    return parseMarketIndex(document, config.indexUrl)
  } catch (error) {
    throw new Error(`index.json violates plugin market index format 1: ${error.message}`)
  }
}

/** The newest version of every plugin, with the exact install target the Harness would pass to `plugin_manager`. */
export function installTargets(index) {
  return index.plugins.map((plugin) => {
    const version = plugin.versions[0]
    return { name: plugin.name, version: version.version, ...marketInstallTarget(plugin.name, version) }
  })
}
