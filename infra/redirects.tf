# <project>.pages.dev bypasses zone WAF rules (including the geo rule) and `_redirects`
# can't match on host, so an account-level Bulk Redirect sends it to the custom domain.
#
# include_subdomains = false keeps PR previews (<branch>.<project>.pages.dev) reachable.

locals {
  # Bulk Redirect list names: lowercase letters, numbers and underscores only.
  redirect_list_name = "${replace(var.project_name, "-", "_")}_pages_dev"
}

resource "cloudflare_list" "pages_dev_redirect" {
  account_id  = var.account_id
  name        = local.redirect_list_name
  kind        = "redirect"
  description = "Managed by Terraform: ${local.pages_dev} -> ${local.site_url}"
}

resource "cloudflare_list_item" "pages_dev_redirect" {
  account_id = var.account_id
  list_id    = cloudflare_list.pages_dev_redirect.id
  redirect = {
    source_url            = "${local.pages_dev}/"
    target_url            = "${local.site_url}/"
    status_code           = 301
    include_subdomains    = false
    subpath_matching      = true
    preserve_path_suffix  = true
    preserve_query_string = true
  }
}

resource "cloudflare_ruleset" "bulk_redirects" {
  account_id  = var.account_id
  name        = "ascii-banner bulk redirects"
  description = "Managed by Terraform"
  kind        = "root"
  phase       = "http_request_redirect"

  rules = [
    {
      description = "pages.dev to custom domain"
      expression  = format("http.request.full_uri in $%s", cloudflare_list.pages_dev_redirect.name)
      action      = "redirect"
      enabled     = true
      action_parameters = {
        from_list = {
          name = cloudflare_list.pages_dev_redirect.name
          key  = "http.request.full_uri"
        }
      }
    },
  ]

  depends_on = [cloudflare_list_item.pages_dev_redirect]
}
