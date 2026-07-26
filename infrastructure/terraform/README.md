# infrastructure/terraform

Infrastructure as Code for every environment (dev, staging, production):
VPC, RDS (PostgreSQL), ElastiCache (Redis), S3 buckets, ECS/Fargate
services, CloudFront, and Secrets Manager.

## Rules

- All infrastructure changes go through Terraform and code review — never
  manual console changes to production infrastructure.
- Modularized per service/concern so a change to one component doesn't
  require touching unrelated resources.
- Each environment is fully isolated (separate state, separate resources).

## Status

Empty. No resources are defined yet. Terraform modules are introduced
alongside the milestone that first needs real infrastructure provisioned
(the foundational platform milestone), not before.
