variable "name" {
  description = "Name prefix for resources created by this module (e.g. \"platform-staging\")."
  type        = string
}

variable "vpc_id" {
  description = "VPC to create the security group in."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the cache subnet group."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to Redis on port 6379 (the ECS service's security group)."
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type. Smallest viable tier for M0 (see ADR-0009) — single node, not cluster mode, per the TDD's own \"cluster mode once volume demands it\" guidance."
  type        = string
  default     = "cache.t4g.micro"
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "tags" {
  description = "Tags applied to all resources created by this module."
  type        = map(string)
  default     = {}
}
