variable "name" {
  description = "Prefix applied to all resource names/tags created by this module (e.g. \"platform-staging\")."
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per availability zone). Hosts the ECS/Fargate compute — see ADR-0009 on why compute is public and data is private."
  type        = list(string)
  default     = ["10.0.0.0/24", "10.0.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per availability zone). Hosts RDS and ElastiCache — never internet-reachable."
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "tags" {
  description = "Tags applied to all resources created by this module."
  type        = map(string)
  default     = {}
}
