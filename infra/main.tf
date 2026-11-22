# The zone is bought and created by Cloudflare Registrar outside this project.
# Terraform only READS it. Never add a cloudflare_zone resource or import it.
data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

locals {
  zone_id   = data.cloudflare_zone.this.zone_id
  apex      = var.zone_name
  www       = "www.${var.zone_name}"
  site_url  = "https://${var.zone_name}"
  pages_dev = cloudflare_pages_project.app.subdomain # e.g. ascii-banner.pages.dev (may get a suffix)
}

# Direct-upload project: no `source` block, CI pushes builds with `wrangler pages deploy`.
resource "cloudflare_pages_project" "app" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = "main"
}

resource "cloudflare_pages_domain" "apex" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.app.name
  name         = local.apex
}

# Attached so Pages provisions a certificate for www; the www → apex redirect rule runs first.
resource "cloudflare_pages_domain" "www" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.app.name
  name         = local.www
}

resource "cloudflare_dns_record" "apex" {
  zone_id = local.zone_id
  name    = local.apex
  type    = "CNAME" # flattened at the apex by Cloudflare
  content = local.pages_dev
  proxied = true
  ttl     = 1
  comment = "Managed by Terraform: Pages project ${var.project_name}"
}

resource "cloudflare_dns_record" "www" {
  zone_id = local.zone_id
  name    = local.www
  type    = "CNAME"
  content = local.pages_dev
  proxied = true
  ttl     = 1
  comment = "Managed by Terraform: redirected to apex"
}

# --- TLS / HTTPS zone settings ---

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = local.zone_id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = local.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = local.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "hsts" {
  zone_id    = local.zone_id
  setting_id = "security_header"
  value = {
    strict_transport_security = {
      enabled            = true
      max_age            = 31536000
      include_subdomains = true
      preload            = true
      nosniff            = true
    }
  }
}
