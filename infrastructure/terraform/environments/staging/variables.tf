variable "aws_region" {
  description = "AWS region for the staging environment. See ADR-0009 for why us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "name" {
  description = "Name prefix applied to every resource in this environment."
  type        = string
  default     = "platform-staging"
}

variable "s3_bucket_name" {
  description = "Globally-unique S3 bucket name. No default — bucket names collide across all of AWS, not just this account, so this must be set explicitly in terraform.tfvars."
  type        = string
}
