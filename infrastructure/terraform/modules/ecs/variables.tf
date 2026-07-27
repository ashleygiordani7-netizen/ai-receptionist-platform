variable "name" {
  description = "Name prefix for resources created by this module (e.g. \"platform-staging\")."
  type        = string
}

variable "vpc_id" {
  description = "VPC to create the service's security group in."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs the Fargate service runs in — see ADR-0009 for why compute is public at this stage (no NAT Gateway)."
  type        = list(string)
}

variable "container_image" {
  description = "Container image for the placeholder \"hello world\" service. A public image, not one of the platform's own apps — proving the ECS/Fargate wiring works is this milestone's job, not running real application code (see ADR-0009 and the Milestone Roadmap's \"empty/hello-world containers is fine at this stage\")."
  type        = string
  default     = "public.ecr.aws/nginx/nginx:1.27-alpine"
}

variable "container_port" {
  description = "Port the placeholder container listens on."
  type        = number
  default     = 80
}

variable "cpu" {
  description = "Fargate task CPU units. Smallest viable size — this task runs a static placeholder page, not real load."
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory (MB)."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of tasks the service keeps running."
  type        = number
  default     = 1
}

variable "log_retention_days" {
  description = "CloudWatch log retention for the task's container logs."
  type        = number
  default     = 14
}

variable "tags" {
  description = "Tags applied to all resources created by this module."
  type        = map(string)
  default     = {}
}
