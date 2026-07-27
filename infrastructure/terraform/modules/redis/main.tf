# Single-node ElastiCache Redis. Private-subnet only, security group scoped
# to the ECS service. Not cluster mode — the TDD explicitly says to
# introduce cluster mode "once volume demands it," not from day one.

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-redis"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-redis"
  })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-redis"
  description = "Allows Redis access from the platform's ECS service only."
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.name}-redis"
  })
}

resource "aws_vpc_security_group_ingress_rule" "redis" {
  for_each = toset(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = each.value
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  description                  = "Redis from the ECS service"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.this.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  description       = "Allow all outbound"
}

resource "aws_elasticache_cluster" "this" {
  cluster_id         = var.name
  engine             = "redis"
  engine_version     = var.engine_version
  node_type          = var.node_type
  num_cache_nodes    = 1
  port               = 6379
  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.this.id]

  tags = merge(var.tags, {
    Name = var.name
  })
}
