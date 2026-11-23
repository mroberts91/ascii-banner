# Cloudflare Free plan limits: 5 WAF custom rules, 1 rate-limiting rule.

# --- WAF custom rules (http_request_firewall_custom) ---
resource "cloudflare_ruleset" "waf_custom" {
  count = length(var.allowed_countries) > 0 ? 1 : 0

  zone_id     = local.zone_id
  name        = "ascii-banner custom WAF rules"
  description = "Managed by Terraform"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = [
    {
      description = "Geo: block countries not in allowed_countries"
      expression  = "(not ip.src.country in {${join(" ", [for c in var.allowed_countries : "\"${c}\""])}})"
      action      = "block"
      enabled     = true
    },
  ]
}

# --- Rate limiting (http_ratelimit), the single Free-plan rule ---
# Hashed /assets/* are immutable and edge-cached; scrolling the gallery fetches hundreds of
# font chunks, so they are excluded from the count.
resource "cloudflare_ruleset" "rate_limit" {
  zone_id     = local.zone_id
  name        = "ascii-banner rate limit"
  description = "Managed by Terraform"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [
    {
      description = "Per-IP burst limit on non-asset paths"
      expression  = "(not http.request.uri.path wildcard \"/assets/*\")"
      action      = "block"
      enabled     = true
      ratelimit = {
        characteristics     = ["ip.src", "cf.colo.id"]
        period              = 10
        requests_per_period = var.rate_limit_requests
        mitigation_timeout  = 10
      }
    },
  ]
}

# --- www → apex 301 (http_request_dynamic_redirect) ---
resource "cloudflare_ruleset" "www_redirect" {
  zone_id     = local.zone_id
  name        = "ascii-banner redirects"
  description = "Managed by Terraform"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      description = "www to apex"
      expression  = "(http.host eq \"${local.www}\")"
      action      = "redirect"
      enabled     = true
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"${local.site_url}\", http.request.uri.path)"
          }
        }
      }
    },
  ]
}

# --- Bot Fight Mode ---
# The API rejects fight_mode unless JavaScript detections (enable_js) are on too.
resource "cloudflare_bot_management" "this" {
  count = var.enable_bot_fight_mode ? 1 : 0

  zone_id    = local.zone_id
  enable_js  = true
  fight_mode = true
}
