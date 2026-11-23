# ascii-banner.us

A static, client-side FIGlet banner generator. You type text, see it in every font bundled with
[figlet.js](https://github.com/patorjk/figlet.js), and copy it as plain text, ANSI truecolor, a Markdown
code block, or a `/* */`, `#` or `<!-- -->` comment. Everything runs in the browser: there's no backend,
no cookies and no analytics.

- **App:** Vite + TypeScript + Preact, in `app/`
- **Hosting:** Cloudflare Pages (direct upload)
- **Infra:** Terraform with the Cloudflare provider `~> 5`, in `infra/`, with state in Cloudflare R2
- **CI/CD:** GitHub Actions, in `.github/workflows/`

See [`docs/DISCOVERY.md`](docs/DISCOVERY.md) for the requirements and constraints.

## Local development

Requires Node 22+.

```sh
cd app
npm ci
npm run dev          # http://localhost:5173
npm test             # Vitest unit tests
npm run lint && npm run typecheck
npm run build && npm run size   # production build + 150 KB gzip budget for the entry chunk
npm run e2e          # Playwright smoke tests against `vite preview`
```

Playwright's bundled Chromium needs glibc. On musl systems such as Alpine, install a system Chromium and run
`PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run e2e`. CI runs the suite on Ubuntu.

After upgrading `figlet`, regenerate the font credits with `npm run gen:licenses`. It rewrites
[`FONTS-LICENSES.md`](FONTS-LICENSES.md) and `app/public/font-licenses.txt`, the copy the site serves and
links from its footer.

## Dependencies and origin

| Dependency | License | Maintainer / origin |
|---|---|---|
| `figlet` (figlet.js) | MIT | patorjk, US |
| `preact`, `@preact/preset-vite` | MIT | Preact team, OSS |
| `vite`, `vitest` | MIT | VoidZero / Vite team, OSS |
| `typescript` | Apache-2.0 | Microsoft, US |
| `@playwright/test` | Apache-2.0 | Microsoft, US |
| `eslint`, `@eslint/js`, `typescript-eslint`, `globals` | MIT | OpenJS Foundation / OSS |
| `wrangler` | MIT / Apache-2.0 | Cloudflare, US |
| `tsx`, `size-limit` | MIT | OSS |
| Terraform CLI | BUSL-1.1 | HashiCorp / IBM, US |
| `cloudflare/cloudflare` provider | MPL-2.0 | Cloudflare, US |
| GitHub Actions (`actions/*`, `hashicorp/setup-terraform`) | MIT / MPL-2.0 | GitHub (Microsoft) / HashiCorp, US |

Exact versions are pinned in `app/package-lock.json` and `infra/.terraform.lock.hcl`. Actions are pinned to
commit SHAs.

## One-time bootstrap (manual)

You do these steps once in the Cloudflare and GitHub dashboards. Everything after that is Terraform plus a
push to `main`.

1. **Domain:** buy `ascii-banner.us` through Cloudflare Registrar. The zone then exists in the account.
   Terraform only *reads* it.
2. **State bucket:** in R2, create a bucket named `ascii-banner-tfstate`. Then create an **R2 API token**
   with Object Read & Write access to that bucket, and note its Access Key ID and Secret Access Key.
3. **Terraform API token** (My Profile → API Tokens → Create custom token), scoped to this account and
   zone only:
   - Zone: DNS Edit, Zone Settings Edit, Zone WAF Edit, Dynamic Redirect Edit (Bot Management Edit only if you enable Bot Fight Mode)
     (Single Redirect and rate-limit rules are covered by Zone WAF / Dynamic Redirect)
   - Account: Cloudflare Pages Edit, Account Filter Lists Edit, Account Rulesets Edit
     (the last two are for the pages.dev Bulk Redirect)
4. **CI deploy token:** a separate token with **Account → Cloudflare Pages Edit** only.
5. **GitHub repo settings:**
   - Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN_DEPLOY`, `CLOUDFLARE_API_TOKEN_TF`,
     `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
   - Optional variable: `TF_STATE_BUCKET`, if you used a bucket name other than `ascii-banner-tfstate`.
   - Environment `production` with **required reviewers**. `infra.yml`'s `apply` job waits on it.

### First apply and deploy

```sh
cd infra
cp backend.hcl.example backend.hcl      # fill in your account ID
export AWS_ACCESS_KEY_ID=...            # R2 token
export AWS_SECRET_ACCESS_KEY=...
export CLOUDFLARE_API_TOKEN=...         # Terraform token
export TF_VAR_account_id=...
terraform init -backend-config=backend.hcl
terraform plan                          # must show no cloudflare_zone changes
terraform apply

cd ../app
npm ci && npm run build
CLOUDFLARE_API_TOKEN=<deploy token> CLOUDFLARE_ACCOUNT_ID=... \
  npx wrangler pages deploy dist --project-name=ascii-banner --branch=main
```

Check the result:

```sh
curl -sI https://ascii-banner.us               # 200, with CSP and HSTS headers
curl -sI https://www.ascii-banner.us           # 301 → https://ascii-banner.us/
curl -sI https://ascii-banner.pages.dev        # 301 → https://ascii-banner.us/
```

**Bot Fight Mode is off on purpose.** Cloudflare only allows it together with JavaScript detections, which add a
bot-detection script to every page. That script conflicts with the strict CSP and with the site's no-tracking
promise. The rate limit and Cloudflare's always-on DDoS protection cover abuse for a static, cached site. To turn it
on anyway, set `enable_bot_fight_mode = true` and allow `/cdn-cgi/challenge-platform/` in the CSP.

## Edge security (Cloudflare Free)

| Control | Where |
|---|---|
| Geo block (only `allowed_countries`, default `["US"]`) | `infra/security.tf`, WAF custom rule |
| Per-IP rate limit (non-`/assets/*` paths, 10 s window) | `infra/security.tf` |
| `www` → apex 301 | `infra/security.tf`, dynamic redirect |
| `*.pages.dev` → apex 301 (account Bulk Redirect) | `infra/redirects.tf` |
| DDoS protection (always on) | Cloudflare default |
| SSL Full (strict), Always HTTPS, TLS ≥ 1.2, HSTS | `infra/main.tf` |
| CSP, HSTS, nosniff, Referrer-Policy, caching | `app/public/_headers` |

PR previews (`pr-N.<project>.pages.dev`) are not redirected, so they stay reachable for review. They're
unlisted, but they bypass the zone's geo rule.

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR / push touching `app/**` | lint, typecheck, unit tests, build, size budget, Playwright |
| `deploy.yml` | push to `main` touching `app/**`; manual with `ref` | build → `wrangler pages deploy` → checks that the live site serves the new build |
| `preview.yml` | PR touching `app/**` | deploys branch `pr-N` and comments the preview URL |
| `infra.yml` | PR / push touching `infra/**` | zone guard, fmt, validate; plan as a PR comment; `apply` on `main` after approval, with a state backup first |

## Rollback

**Bad app deploy:**

1. **Fastest:** Cloudflare dashboard → Workers & Pages → `ascii-banner` → Deployments → pick the last good
   production deployment → **Rollback to this deployment**. (API:
   `POST /accounts/{account_id}/pages/projects/ascii-banner/deployments/{deployment_id}/rollback`.)
2. **Durable:** `git revert` the bad commit and push to `main`, or run **Deploy** manually
   (Actions → Deploy → Run workflow) with `ref` set to a known-good SHA.

**Bad `terraform apply`:**

1. `git revert` the infra commit and merge it. `infra.yml` plans and, after approval, applies the previous
   configuration.
2. If the state itself is damaged, every apply first copies the state to
   `state-backups/<commit-sha>.tfstate` in the R2 bucket. Copy the last good backup over
   `ascii-banner/terraform.tfstate`, then run `terraform plan` to reconcile.
3. **Emergency** (an edge rule blocking everyone): disable the rule in the dashboard right away, then fix
   it in code. The next plan will show and correct the drift.

Terraform never manages the zone or the registration, so no rollback can delete the domain.
