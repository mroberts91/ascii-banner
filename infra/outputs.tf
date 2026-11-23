output "site_url" {
  value = local.site_url
}

output "pages_subdomain" {
  description = "Default *.pages.dev hostname (redirected to site_url)."
  value       = cloudflare_pages_project.app.subdomain
}

output "zone_id" {
  value = local.zone_id
}
