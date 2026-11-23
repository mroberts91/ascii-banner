terraform {
  required_version = ">= 1.10.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Remote state in Cloudflare R2 (S3-compatible). Bucket and endpoint come from
  # `-backend-config=backend.hcl`; credentials from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  # (an R2 API token). See README "One-time bootstrap".
  backend "s3" {
    key                         = "ascii-banner/terraform.tfstate"
    region                      = "auto"
    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
