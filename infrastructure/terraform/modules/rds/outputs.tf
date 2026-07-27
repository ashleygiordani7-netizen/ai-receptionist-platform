output "endpoint" {
  description = "Connection endpoint (host:port) for the RDS instance."
  value       = aws_db_instance.this.endpoint
}

output "address" {
  description = "Hostname of the RDS instance, without port."
  value       = aws_db_instance.this.address
}

output "database_name" {
  description = "Name of the default database."
  value       = aws_db_instance.this.db_name
}

output "master_user_secret_arn" {
  description = "Secrets Manager ARN holding the auto-generated master password. Task #6 reads from this to wire the running application to the real credentials."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  description = "Security group ID attached to the RDS instance."
  value       = aws_security_group.this.id
}
