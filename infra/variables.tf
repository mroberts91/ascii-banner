variable "account_id" {
  description = "Cloudflare account ID that owns the zone and the Pages project."
  type        = string
}

variable "zone_name" {
  description = "Existing zone, created by Cloudflare Registrar outside Terraform. Read only."
  type        = string
  default     = "ascii-banner.us"
}

variable "project_name" {
  description = "Cloudflare Pages project name."
  type        = string
  default     = "ascii-banner"
}

variable "allowed_countries" {
  description = "ISO 3166-1 alpha-2 codes allowed through the geo rule. Empty list disables the rule."
  type        = list(string)
  default     = ["US"]

  validation {
    condition     = alltrue([for c in var.allowed_countries : can(regex("^[A-Z]{2}$", c))])
    error_message = "Use two-letter uppercase country codes, e.g. \"US\"."
  }
}

variable "rate_limit_requests" {
  description = "Requests per 10 s per IP (per colo) to non-asset paths before blocking for 10 s."
  type        = number
  default     = 100
}

variable "enable_bot_fight_mode" {
  description = "Manage Bot Fight Mode from Terraform. Set false if the API rejects it on this plan and toggle it in the dashboard instead."
  type        = bool
  default     = true
}
