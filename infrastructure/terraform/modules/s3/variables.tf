variable "bucket_name" {
  description = "Globally-unique S3 bucket name (e.g. \"platform-staging-storage\")."
  type        = string
}

variable "tags" {
  description = "Tags applied to the bucket."
  type        = map(string)
  default     = {}
}
