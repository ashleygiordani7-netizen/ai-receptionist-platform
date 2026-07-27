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

`modules/{vpc,rds,redis,s3,ecs}` and `environments/staging` exist and are
`fmt`/`init`/`validate`-clean. Nothing has been applied — see ADR-0009 for
the full reasoning, summarized below.

- **No AWS credentials were used or introduced anywhere in this repo.**
  `terraform plan`/`apply` were not run; both require real AWS credentials
  and create real, billable resources, which is a decision for whoever
  applies this, not something done as part of writing the code.
- **Local state** (`environments/staging/versions.tf`), not S3+DynamoDB —
  no AWS account was available to bootstrap a remote backend from here.
  Migrate once this is actually being applied for real.
- **ECS/Fargate compute runs in public subnets**, not behind a NAT Gateway
  — avoids a real recurring cost (~$32/month+) for placeholder containers
  serving no real traffic. RDS and Redis are in private subnets regardless,
  security-group-scoped to the ECS service only, never internet-reachable.
- **The ECS service runs a public placeholder image** (nginx), not the
  platform's own `apps/api`/`apps/dashboard` images — matches the Milestone
  Roadmap's explicit "empty/hello-world containers is fine at this stage."
  Deploying the real images is Task #7's job, once a registry (ECR) and a
  deploy pipeline exist.
- **Staging only** — dev/prod aren't provisioned yet; the module structure
  makes adding them later a matter of a new `environments/<name>` directory
  instantiating the same modules, not a redesign.

## Applying this for real

Requires real AWS credentials (not provided or used by any work in this
repo so far):

```bash
cd environments/staging
cp terraform.tfvars.example terraform.tfvars   # fill in a globally-unique bucket name
terraform init
terraform plan    # review carefully — this is real, billable AWS infrastructure
terraform apply
```
