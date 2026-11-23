# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static, client-side FIGlet banner generator for `ascii-banner.us`: Vite + TS + Preact in `app/`, Terraform
(Cloudflare provider `~> 5`) in `infra/`, and GitHub Actions in `.github/workflows/`. The requirements live
in `docs/DISCOVERY.md`. The README has the bootstrap steps and the rollback runbook.

## Commands

All app commands run from `app/`:

```sh
npm run dev | build | preview
npm test                                   # Vitest (tests/unit)
npx vitest run tests/unit/formats.test.ts  # single file;  -t "<name>" for a single test
npm run lint && npm run typecheck
npm run size                               # 150 KB gzip budget on the entry chunk (run after build)
npm run e2e                                # Playwright (tests/e2e) against `vite preview`
npm run gen:licenses                       # regenerate ../FONTS-LICENSES.md + public/font-licenses.txt after a figlet upgrade
```

Local e2e: this dev box is Alpine (musl), where Playwright's bundled Chromium doesn't run. Set
`PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium` if a system Chromium is installed; otherwise rely on CI.

Infra, from `infra/`: `terraform fmt -check && terraform init -backend=false && terraform validate`.
A real plan needs `-backend-config=backend.hcl` plus R2 and Cloudflare credentials (see README).

## Architecture

- **Font loading:** `src/fonts/loader.ts` uses `import.meta.glob('/node_modules/figlet/importable-fonts/*.js')`,
  which emits one lazy chunk per font. The font list comes from the glob keys, so there's no manifest file.
  `vite.config.ts` sanitizes chunk file names because font names contain spaces and apostrophes.
- **Rendering:** `src/render/render.ts` takes `textSync` as a parameter, so the same code runs with the
  browser figlet build (from the loader) and the Node figlet build (in tests, where fonts load from disk).
  figlet's `width` wraps per character, so only a single glyph wider than the target overflows.
  `width.ts` flags that case.
- **Virtualization:** `FontCard` loads its font and renders only while near the viewport (one shared
  IntersectionObserver in `src/hooks.ts`). Off-screen cards keep stale output until they're visible again.
  Card settings flow through `SettingsContext` (`src/settings.ts`).
- **Pure, unit-tested modules:** `export/formats.ts` (the six copy formats, with escaping for `*/`, `--` and
  backtick fences), `color/color.ts` (gradients → colored segments, shared by the preview and the ANSI
  export), `state/url.ts` (validated query-string state), `state/storage.ts` (localStorage that never
  throws), `fonts/catalog.ts` with `categories.json` (curated categories, featured order). A unit test checks
  that every font named in `categories.json` exists in figlet.
- **Theme:** light/dark/system with a red/white/blue palette as CSS tokens in `src/styles.css`.
  `public/theme.js` is an external script that applies the saved theme before first paint. It's external
  because the CSP forbids inline scripts.

## Hard constraints

- **Dependencies:** US-based or plain OSS with no ties to Chinese companies. Record the license and origin
  in the README table whenever you add one.
- **No third-party requests:** no analytics, CDNs or web fonts, and no inline scripts or styles in HTML
  (CSP is `default-src 'self'`, set in `app/public/_headers`; the e2e tests enforce it). Setting styles
  through the DOM, as Preact `style={{}}` does, is fine.
- **No backend:** no Pages Functions, SSR or APIs.
- **Zone is read-only:** the zone is read via `data "cloudflare_zone"`. Never add a `cloudflare_zone`
  resource or an `import` block; CI greps for both and fails the plan if a zone change appears.
- **Free plan limits:** 5 WAF custom rules and 1 rate-limit rule. The rate-limit rule excludes `/assets/*`
  because scrolling the gallery fetches hundreds of font chunks.
- **Separate tokens:** CI deploys with `wrangler pages deploy` using `CLOUDFLARE_API_TOKEN_DEPLOY` (Pages
  only). Terraform uses `CLOUDFLARE_API_TOKEN_TF`. Never mix them.
- **Pinned Actions:** Actions are pinned to commit SHAs. Keep the `# vX.Y.Z` comment when you bump one.
- **Reference site:** don't copy ascii-banner.oaix.tech's UI, copy text or guides.
