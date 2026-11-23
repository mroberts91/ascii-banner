# ascii-banner.us — Discovery

Nov 21, 2026 · @Michael Robertson

## Summary

Build a static, client-side FIGlet banner generator at `ascii-banner.us`, hosted on Cloudflare Pages and managed with Terraform, to replace [ascii-banner.oaix.tech](https://ascii-banner.oaix.tech/), which can't be used because of its China-based ownership.

**Goals**

- Feature parity with the reference site's core workflow: type text, preview it in every font, copy it in the format you need.
- No backend, no user data leaving the browser, $0/month hosting.
- Whole stack (app, infra, CI) reproducible from one repo.

**Success criteria**

- `https://ascii-banner.us` serves the app over HTTPS from Cloudflare's edge.
- Typing re-renders all fonts with no visible lag on a mid-range laptop.
- `terraform apply` + a push to `main` is the entire deploy path; nothing is clicked in the dashboard except one-time bootstrap.

## Constraints

Every vendor, library and service must be US-based or plain open source with no ties to Chinese companies; the plan should name each dependency's origin.

- **Domain:** `ascii-banner.us`, bought through Cloudflare Registrar *outside this project*. The zone already exists in the Cloudflare account when this project starts. Terraform reads it with a `data` source and never creates, transfers or deletes the zone or registration.
- **Hosting:** Cloudflare Pages (static assets are free and unlimited). AWS S3 + CloudFront stays a documented fallback, not part of v1.
- **IaC:** Terraform with the Cloudflare provider pinned to `~> 5` (v5 resource names: `cloudflare_dns_record`, `cloudflare_ruleset` with `rules = [...]`).
- **Rendering library:** `figlet` on npm (figlet.js, MIT, maintained by patorjk, US). Use its bundled fonts only.
- **No telemetry:** no third-party analytics, fonts, CDNs or tracking scripts. All assets self-hosted from the Pages project.
- **Do not copy the reference site's** UI design, copy text or guide pages. Feature ideas are fine; expression is not.

## Functional requirements

The MVP is input → live gallery of every font → copy in one of six formats; everything else follows.

| Feature | Detail | Phase |
| --- | --- | --- |
| Text input | Printable ASCII only, max 40 chars; empty input previews "Hello World" | MVP |
| Font gallery | Live preview of every bundled FIGlet font (\~300) | MVP |
| Search | Filter fonts by name | MVP |
| Copy | One-click copy per font card, with toast confirmation | MVP |
| Export formats | Raw text, ANSI truecolor, Markdown code block, C-style `/* */` comment, hash `#` comment, HTML/XML `<!-- -->` comment | MVP |
| Target width | 80 / 100 / 120 columns; wrap or flag output that exceeds it | MVP |
| Letter spacing | Font default, fitted, full width (figlet.js `horizontalLayout`) | MVP |
| Colors | Mono, plus gradient presets and a custom color; applied to preview and ANSI export | v1.1 |
| Categories | Compact, Block, 3D, Script, Novelty, derived from a curated JSON map | v1.1 |
| Favorites | Star fonts, persisted in localStorage | v1.1 |
| Sort | Featured first, or A–Z | v1.1 |
| History | Recent inputs in localStorage; delete one or clear all | v1.1 |
| Shareable URL | Text and options in the query string so a banner can be linked | v1.1 |
| Per-font pages / guides | Static pages per featured font and use-case guides | Later |

## Non-functional requirements

| Area | Target |
| --- | --- |
| Performance | First render of visible cards < 1 s on broadband; re-render on keystroke debounced (\~100 ms) and limited to cards in view |
| Payload | Initial JS < 150 KB gzipped; font files lazy-loaded, not bundled into the main chunk |
| Privacy | Text never leaves the browser; no cookies; no analytics |
| Accessibility | Keyboard-navigable gallery, visible focus, labelled controls, WCAG 2.1 AA contrast |
| Browsers | Last 2 versions of Chrome, Edge, Firefox, Safari; usable on mobile |
| Cost | $0/month on Cloudflare Free (domain renewal excluded) |
| Security headers | CSP with `default-src 'self'`, HSTS, `X-Content-Type-Options`, `Referrer-Policy` via Pages `_headers` |
| Caching | Hashed assets `Cache-Control: public, max-age=31536000, immutable`; `index.html` short TTL |

## Architecture and stack

A static Vite build served from Cloudflare Pages; all rendering runs in the browser, so there is no origin server to protect or pay for.

&#91;embedded content: request path and deploy path\]

Requests pass the zone's WAF and rate-limit rules before reaching cached Pages assets. Only GitHub Actions (assets) and Terraform (config) write to Cloudflare; the registrar-created zone is read, never managed.

| Layer | Choice | Origin / license |
| --- | --- | --- |
| Build | Vite + TypeScript | US-led OSS, MIT |
| UI | Vanilla TS or Preact (plan picks one) | MIT |
| Rendering | `figlet` (figlet.js); fonts via `figlet/importable-fonts/*`, dynamically imported | US maintainer, MIT |
| Gallery virtualization | IntersectionObserver, or `@tanstack/virtual` if needed | US, MIT |
| Styling | Plain CSS, system font stack; no web-font CDN | — |
| State | URL query string + localStorage | — |
| Tests | Vitest, Playwright | MIT / Apache-2.0 (Microsoft, US) |
| Hosting | Cloudflare Pages, Free plan | Cloudflare, US |
| IaC | Terraform + `cloudflare/cloudflare` provider `~> 5` | HashiCorp/IBM, US |
| CI | GitHub Actions + `wrangler` | Microsoft / Cloudflare, US |

## Infrastructure as code

Terraform owns the Pages project, the custom domain, DNS and edge rules; it reads, but never manages, the registrar-created zone.

| Resource | Purpose |
| --- | --- |
| `data.cloudflare_zone` | Look up the `ascii-banner.us` zone by name (created by Cloudflare Registrar) |
| `cloudflare_pages_project` | Project `ascii-banner`, `production_branch = "main"`, **no `source` block** (direct upload from CI) |
| `cloudflare_pages_domain` | Attach `ascii-banner.us` (apex) and optionally `www.ascii-banner.us` |
| `cloudflare_dns_record` | Proxied CNAME for apex (flattened) and `www` → `<project>.pages.dev` |
| `cloudflare_ruleset` (`http_request_firewall_custom`) | Geo and hostname rules (see Edge security) |
| `cloudflare_ruleset` (`http_ratelimit`) | One IP-based rate-limit rule (Free plan allows 1) |
| `cloudflare_ruleset` (`http_request_dynamic_redirect`) | `www` → apex 301 |
| `cloudflare_bot_management` or zone setting | Turn on Bot Fight Mode, if the provider exposes it on Free; otherwise document as a manual step |

**Layout and state**

- `infra/` with `versions.tf`, `providers.tf`, `variables.tf` (`account_id`, `zone_name = "ascii-banner.us"`, `allowed_countries`), `main.tf`, `outputs.tf`.
- Remote state: open question — Terraform Cloud (US) or an R2 / S3 backend. Must not be local-only.
- API token scoped to this account and zone only: Pages Write, DNS Write, Zone WAF Write, Zone Settings Write. A separate, narrower token (Pages Write only) for CI deploys.

**One-time manual bootstrap** (documented in the README, not automated): buy the domain, create the Terraform API token, create the CI deploy token.

## Edge security

Cloudflare Free covers this site: 5 WAF custom rules, 1 rate-limit rule, Bot Fight Mode, the Free Managed Ruleset and DDoS protection.

| Control | Implementation | Notes |
| --- | --- | --- |
| Geo restriction | Custom rule: `(not ip.src.country in {"US"})` → Block | Country list from `var.allowed_countries`; default open question |
| `*.pages.dev` exposure | `_redirects` can't redirect by host; use an account-level Bulk Redirect (cloudflare\_list + cloudflare\_ruleset, phase http\_request\_redirect) sending `ascii-banner.pages.dev` to `https://ascii-banner.us` | WAF rules only apply to the custom domain, so pages.dev bypasses geo rules otherwise |
| Rate limiting | 1 rule: per-IP request count over 10 s window → Block for 10 s | Threshold generous; a static site needs only abuse protection |
| Bots | Bot Fight Mode on | Can't be skipped by custom rules; acceptable for a static tool |
| Managed rules | Free Managed Ruleset (on by default) | No action needed |
| TLS | SSL mode Full (strict), Always Use HTTPS, min TLS 1.2, HSTS | Set via zone settings in Terraform |

Pages assets are already cached at the edge; no custom cache rules are needed for v1.

## CI/CD

GitHub Actions builds, tests and deploys with `wrangler pages deploy`; the Cloudflare GitHub app is not installed.

| Workflow | Trigger | Steps |
| --- | --- | --- |
| `ci.yml` | PR | Install, lint, typecheck, unit tests, build, Playwright smoke test |
| `deploy.yml` | Push to `main` | Build → `wrangler pages deploy dist --project-name=ascii-banner --branch=main` |
| `preview.yml` | PR (optional) | Deploy to a preview branch; post the URL as a PR comment |
| `infra.yml` | PR / push touching `infra/**` | `terraform fmt -check`, `validate`, `plan` on PR (plan as comment); `apply` on `main` with manual approval (GitHub environment) |

**Secrets:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN_DEPLOY` (Pages only), `CLOUDFLARE_API_TOKEN_TF` (infra only). Actions pinned to commit SHAs.

## Risks, open questions, out of scope

**Risks**

| Risk | Mitigation |
| --- | --- |
| Rendering \~300 fonts per keystroke janks the UI | Virtualize the grid, render only visible cards, debounce input, consider a Web Worker |
| A few FIGlet fonts carry their own license terms | Ship only the fonts figlet.js bundles; generate a `FONTS-LICENSES.md` from `.flf` header comments |
| Geo-blocking the US-only list blocks legitimate travellers or VPN users | Make the country list a variable; start permissive if unsure |
| Bot Fight Mode challenges legitimate CLI or link-preview fetches | Acceptable for v1; revisit if reported |
| Cloudflare provider v5 resource gaps (e.g. Bot Fight Mode toggle) | Fall back to a documented manual step; don't block on it |

**Open questions**

- [ ] Allowed countries for the geo rule: US only, or US + allies, or no geo restriction?
- [ ] Terraform remote state backend: Terraform Cloud, R2 or S3?
- [ ] Serve `www` at all, or apex only?
- [ ] Framework: vanilla TS vs Preact (both acceptable; plan should pick one with a reason).
- [ ] Repo host: GitHub assumed — confirm.

**Out of scope for v1:** accounts or sign-in, server-side rendering or APIs, Pages Functions, analytics, image/PNG export, uploading custom `.flf` fonts, AWS deployment.

## Instructions for Claude Code

Produce an implementation plan, not code, from this document; stop and ask on any open question that changes the plan.

The plan should contain:

1. **Repo layout** — tree for `app/`, `infra/`, `.github/workflows/`, with one line per top-level file.
2. **Dependency list** — every npm package and Terraform provider with version, license and country of origin of the maintainer/company.
3. **Milestones** — each shippable on its own:
   1. Scaffold + figlet.js rendering one font locally.
   2. Full gallery with search, width, spacing, and the six export formats (MVP).
   3. Terraform: Pages project, domain, DNS, TLS settings; first manual `wrangler` deploy to `ascii-banner.us`.
   4. Edge rules: geo, rate limit, pages.dev redirect, Bot Fight Mode.
   5. CI/CD workflows.
   6. v1.1 features (colors, categories, favorites, history, shareable URL).
4. **Per milestone** — tasks, files touched, acceptance criteria, and how to verify (command or URL).
5. **Testing strategy** — unit tests for export formatters and width handling; Playwright smoke test for type → render → copy.
6. **Rollback** — how to roll back a bad deploy (Pages deployment rollback) and a bad `terraform apply`.

Assume the zone `ascii-banner.us` already exists in the Cloudflare account. Never add Terraform that creates, imports or deletes the zone or the registration.

