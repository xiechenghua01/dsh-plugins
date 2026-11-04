# AGENTS.md

Instructions for anyone (human or agent) changing this repository. Read
[README.md](README.md) first.

## What this repository is

- A monorepo of DeepSeek Harness plugins: one installable bundle per directory under `plugins/`.
- A plugin market **index source**: `index.json` is a format-1 index generated from
  `market.json` + `plugins/*/package.json` and consumed by the Harness **Discover** page.

`index.json` is generated. Never hand-edit it; run `pnpm run release` instead.

## Commands

```bash
pnpm install          # devDependencies: the official index validator, semver
pnpm test             # scripts/check-plugins.mjs + scripts/validate-index.mjs
pnpm run release      # append version entries for HEAD to index.json and commit it
pnpm run release --dry-run
pnpm run validate     # index-only check (also prints install targets)
```

CI (`.github/workflows/validate.yml`) runs `pnpm install --frozen-lockfile && pnpm test` on
every push and pull request. A red check blocks the release.

## Invariants enforced by `pnpm test`

- `plugins/<slug>/package.json`: valid npm package name, exact SemVer version,
  `"private": true`, `exports["."]`, `dsh.bundle.patch`, and an `engines.dsh` SemVer range.
- The bundle patch inserts a row named exactly the package name, with a unique row id.
- Host half (`index.js`): imports only `node:` builtins and relative files; exports `name`,
  `inject`, `apply`.
- Browser half (`client.js`): registers `window.__ModuleLoader__.load({ id, factory })` with
  `id` equal to the package name; `require()`s only `react`; does not mention `@deepseek-ai/`.
- `locale/en.json` and `locale/zh.json` have identical key sets and no empty values.
- `plugins/<slug>/market.json`: localized `title`/`description` (must include `en`), an `icon`
  path relative to the repository root, and a `category`/`labels` declared in the root
  `market.json`.
- No committed file contains an absolute home path (`/Users/...`, `/home/...`).
- `index.json`: every plugin directory is listed, every version pins a commit present in this
  Git history, `repository.url`/`directory` match the plugin, and the document equals a
  regeneration from the committed metadata.

## Adding a plugin

1. `mkdir plugins/<slug>`; copy the runtime contract of an existing plugin
   (`plugins/session-stats/CONTRACT.md` explains slots, routes, locale, theme tokens).
2. Write `package.json` with the bundle and (if it renders UI) the `dsh.client` block.
3. Add `market.json` with display metadata; declare any new category or label in the root
   `market.json` first.
4. Give the bundle patch a row id that collides with neither shipped rows nor other plugins.
   Shipped `@deepseek-ai/dsh-web-app` already uses `session-stats`; this repository uses
   `session-stats-panel`.
5. `pnpm test`, then commit the new plugin.
6. `pnpm run release <slug>` to publish its first version, then `git push origin main`.

## Releasing

The index pins a commit, so a release is always two commits: the plugin change, then the
generated `index.json`.

1. Bump `version` in `plugins/<slug>/package.json` (required — releasing changed code under an
   already published version is refused).
2. Commit the plugin change.
3. `pnpm run release <slug>` (omit the slug to release every pending plugin version).
4. `git push origin main`.

`pnpm run release` refuses a dirty tree, validates the generated document with
`@deepseek-ai/dsh-plugin-market-index` before writing, and commits only `index.json`.

## Verifying against a real Harness

- The package targets DSH `>=0.2.1-rc.5 <0.3.0`. The verified version is `0.2.1-rc.5` (desktop
  app; its `dsh` tree can be inspected read-only from
  `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`).
- Install from the local directory for iteration:
  `plugin_manager action=install_bundle target=<repo>/plugins/<slug>`.
- Install exactly what the index publishes:
  `plugin_manager action=install_bundle target=git+https://github.com/xiechenghua01/dsh-plugins.git#<commit>&path:/plugins/<slug>`.
- After installing, refresh the Web GUI and check the sidebar entry and routes (`401` from an
  unauthenticated curl means a guarded route is registered; `404` means it is not installed).
- The profile's own `cordis.patch.yml`, applied after bundle layers, is the documented place for
  per-machine config overrides, so upgrades keep local settings.

## Constraints that cost time if forgotten

- The index URL in `market.json` must stay canonical, `https`, without credentials or fragment,
  and the Harness refuses redirects; `raw.githubusercontent.com/.../main/index.json` answers
  directly. The repository must stay public.
- Relative `icon` references resolve against the index URL, so `market.json` icons are written
  repository-root-relative (`plugins/<slug>/icon.svg`).
- Index versions are immutable (commit-pinned); fix a bad release with a new version, never by
  editing an entry.
- `version` in `package.json` and the latest index version are expected to differ between a
  plugin change and its release commit; that is normal.
