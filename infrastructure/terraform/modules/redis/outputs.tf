output "primary_endpoint_address" {
  description = "Hostname of the Redis node."
  value       = aws_elasticache_cluster.this.cache_nodes[0].address
}

output "port" {
  description = "Port Redis listens on."
  value       = aws_elasticache_cluster.this.port
}

output "security_group_id" {
  description = "Security group ID attached to the Redis cluster."
  value       = aws_security_group.this.id
}
