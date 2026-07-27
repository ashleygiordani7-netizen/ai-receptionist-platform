# RDS PostgreSQL. Private-subnet only, security group scoped to the ECS
# service, master password managed natively by RDS/Secrets Manager rather
# than a hand-rolled secret (see ADR-0009 for why).

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-db"
  })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-rds"
  description = "Allows Postgres access from the platform's ECS service only."
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.name}-rds"
  })
}

resource "aws_vpc_security_group_ingress_rule" "postgres" {
  for_each = toset(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = each.value
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Postgres from the ECS service"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.this.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  description       = "Allow all outbound"
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage           = var.allocated_storage
  storage_encrypted           = true
  db_name                     = var.database_name
  username                    = var.master_username
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = false
  multi_az               = false

  skip_final_snapshot = var.skip_final_snapshot
  deletion_protection = false

  tags = merge(var.tags, {
    Name = var.name
  })
}
