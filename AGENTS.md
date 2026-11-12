# AGENTS.md

Instructions for anyone (human or agent) changing this repository. Read
[README.md](README.md) first.

## What this repository is

- A monorepo of DeepSeek Harness plugins: one installable bundle per directory under `plugins/`.
- A plugin market **index source**: `index.json` is a format-1 index generated from
  `market.json` + `plugins/*/package.json` and consumed by the Harness **Discover** page.

`index.json` is generated. Never hand-edit it; run `pnpm run release` instead.

## UI: read `DESIGN.md` first

[`DESIGN.md`](DESIGN.md) is the single source of truth for every UI plugin: design tokens,
font scale, page skeleton, buttons/icon buttons/tabs/dialogs/tooltips, the icon set, interaction
states, copy and the pre-flight checklist. It wins over a plugin's own `DESIGN.md` when the two
disagree. Do not invent a second button, tooltip or dialog implementation — copy the spec from
`DESIGN.md` and keep `--dsw-*` tokens only.

## Commands

```bash
pnpm install          # devDependencies: the official index validator, semver
pnpm test             # scripts/check-plugins.mjs + scripts/validate-index.mjs
pnpm run release      # append version entries for HEAD to index.json and commit it
pnpm run release --dry-run
pnpm run validate     # index-only check (also prints install targets)
```

Local-only tools for this plugin (they read real session logs; never in CI):

```bash
node tools/verify-render.mjs   # payload invariants + headless render checks against ~/.dsh
node tools/preview.mjs         # static panel preview -> .preview/session-stats.html
node tools/preview.mjs --theme light|dark --mode model|type --hover N|none --out <path>
```

They require `zstd`. For a screenshot, open the preview in a headless browser, e.g.
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars
--screenshot=/abs/path.png --window-size=1180,2400 file:///abs/path/.preview/session-stats.html`.

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
- A plugin may ship `selftest.mjs` exporting `run(report)`; `pnpm test` runs it with
  synthetic input only, so plugin payload logic is covered in CI. Keep it dependency-free.
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
5. Add `selftest.mjs` (pure synthetic payload checks); `pnpm test` runs it.
6. `pnpm test`, then commit the new plugin.
7. `pnpm run release <slug>` to publish its first version, then `git push origin main`.

## Releasing

A release touches two registries: npm holds the plugin code, `index.json` holds the catalog. Publishing
runs in CI (`.github/workflows/publish.yml`), because this account's 2FA is a security key and
`npm publish` only accepts a 6-digit TOTP — there is no code to type locally.

1. Bump `version` in `plugins/<slug>/package.json` (required — npm refuses to overwrite a
   published version; files the package does not ship, such as this repo's Markdown docs, do not
   require a bump).
2. Commit the plugin change.
3. `pnpm run release <slug>` (omit the slug for every pending plugin). It appends one version entry
   per plugin, validates the document with `@deepseek-ai/dsh-plugin-market-index` before writing,
   and commits only `index.json`.
4. Push, then run the **publish** workflow from the Actions tab (`dry-run` first if unsure).
5. The workflow runs the tests, publishes every plugin version missing from the registry, publishes
   the catalog, then purges the jsDelivr cache. It refuses to publish the catalog while an indexed
   plugin version is still missing.

The catalog publishes under a UTC timestamp when its declared version is already taken, so CI never
writes back to the repository and the workflow can be re-run.

First release only: trusted publishing requires the package to already exist, so bootstrap it with an
`NPM_TOKEN` repository secret — a granular token with **Read and write** (not `stage only`) and
bypass 2FA. Once all four packages exist, add a trusted publisher on npmjs.com for each one pointing
at this repository and `publish.yml`, then delete the secret.

`pnpm run release` still refuses a dirty tree, because it records HEAD as `publishTimestamp`
provenance.

## Verifying against a real Harness

- The package targets DSH `>=0.2.1-rc.5 <0.3.0`. The verified version is `0.2.1-rc.5` (desktop
  app; its `dsh` tree can be inspected read-only from
  `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`).
- Install from the local directory for iteration:
  `plugin_manager action=install_bundle target=<repo>/plugins/<slug>`.
- Install exactly what the index publishes:
  `plugin_manager action=install_bundle target=<name>@<version>` — the packages live on npm.
- After installing, refresh the Web GUI and check the sidebar entry and routes (`401` from an
  unauthenticated curl means a guarded route is registered; `404` means it is not installed).
- The profile's own `cordis.patch.yml`, applied after bundle layers, is the documented place for
  per-machine config overrides, so upgrades keep local settings.

## Constraints that cost time if forgotten

- The index is published on npm as `@chengze/dsh-plugins-market` and read through
  `https://cdn.jsdelivr.net/npm/@chengze/dsh-plugins-market/index.json`, which answers `200`
  with zero redirects (verified — the Harness refuses redirects). It is distributed through npm
  rather than `raw.githubusercontent.com` because jsDelivr pulls npm tarballs from the registry and
  never touches github.com. The repository must stay public.
- The unversioned address resolves to npm's `latest` and caches for 7 days, so the `purge` job in
  `.github/workflows/validate.yml` calls the jsDelivr purge endpoint after every push to `main`.
  Purge is best-effort: if it is throttled, the index still goes live within 7 days.
- Relative `icon` references resolve against the index URL, so `market.json` icons are written
  repository-root-relative (`plugins/<slug>/icon.svg`). The published catalog ships those files via
  its `files` list, which keeps icon URLs inside the npm package instead of pointing at a repo host.
- Plugins install from npm: `versions[].source` is `{"type":"npm"}`, so the install target is
  `<name>@<version>`. A git source makes `pnpm` clone the whole monorepo over github.com, which no
  CDN can accelerate — do not reintroduce one.
- Index versions are immutable; fix a bad release with a new version, never by editing an entry.
  Git sources were pinned by commit; npm versions are immutable because the registry refuses to
  overwrite a published version.
- `version` in `package.json` and the latest index version are expected to differ between a
  plugin change and its release commit; that is normal.
- UI plugins style with `--dsw-*` tokens only. Data-visualization series may use the eight
  `--ss-series-1..8` colors the panel defines on `.ss-page`; they exist because a
  multi-model chart needs distinguishable hues in both light and dark mode.
- The browser half is `require('react')` only. Interactive parts of charts should stay
  CSS-driven where possible (the trend hover is per-day hit regions plus `:hover`); the
  headless test shim can prescribe `useState` values, not events.
