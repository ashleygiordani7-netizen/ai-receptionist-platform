variable "name" {
  description = "Name prefix for resources created by this module (e.g. \"platform-staging\")."
  type        = string
}

variable "vpc_id" {
  description = "VPC to create the RDS instance and its security group in."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the DB subnet group. At least two, in different availability zones."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to Postgres on port 5432 (the ECS service's security group)."
  type        = list(string)
}

variable "engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16"
}

variable "instance_class" {
  description = "RDS instance class. Smallest viable tier for M0 — this milestone proves the shape works, not real load (see ADR-0009)."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB."
  type        = number
  default     = 20
}

variable "database_name" {
  description = "Name of the default database created on the instance."
  type        = string
  default     = "platform"
}

variable "master_username" {
  description = "Master username. The password itself is never set here — RDS generates and stores it in Secrets Manager directly (see ADR-0009)."
  type        = string
  default     = "platform_admin"
}

variable "skip_final_snapshot" {
  description = "Whether to skip the final snapshot on destroy. true for staging at this stage (no real data exists yet, and the M0 DoD requires staging to be cleanly destructible/rebuildable) — revisit once real data exists."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to all resources created by this module."
  type        = map(string)
  default     = {}
}
