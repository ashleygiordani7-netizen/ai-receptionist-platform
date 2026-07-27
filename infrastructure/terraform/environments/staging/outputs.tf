output "vpc_id" {
  value = module.vpc.vpc_id
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "rds_master_user_secret_arn" {
  description = "Secrets Manager ARN holding the RDS master password. Task #6 wires the application to read from here."
  value       = module.rds.master_user_secret_arn
}

output "redis_endpoint" {
  value = module.redis.primary_endpoint_address
}

output "s3_bucket_name" {
  value = module.s3.bucket_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}
