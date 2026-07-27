output "cluster_name" {
  description = "Name of the ECS cluster."
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "Name of the ECS service."
  value       = aws_ecs_service.this.name
}

output "security_group_id" {
  description = "Security group ID attached to the ECS service — pass this to the RDS/Redis modules' allowed_security_group_ids."
  value       = aws_security_group.service.id
}

output "log_group_name" {
  description = "CloudWatch log group the placeholder container's logs are written to."
  value       = aws_cloudwatch_log_group.this.name
}
