# ADR 0009: M0 Terraform foundation — modules, state, networking, scope

**Status:** Accepted
**Date:** 2026-07-26
**Milestone:** M0

## Context

The Milestone Roadmap requires Terraform for VPC, RDS, Redis, S3, and
ECS/Fargate services in M0, with "empty/hello-world containers" as the
explicit bar for this milestone — the point is proving the infrastructure
shape works, not running real application traffic through it (that begins
in later milestones, particularly M4's first Vapi call loop and this
roadmap's Task #7 deployment work). The TDD (§16.1, §2) confirms the
target: AWS, ECS Fargate for compute, RDS Postgres, ElastiCache Redis,
Terraform "modularized per service, reviewed like application code."

Several implementation-level decisions aren't specified by either document
and needed to be made explicitly rather than assumed, given real AWS cost
and blast radius are involved:

## Decisions

**1. No AWS credentials, no `plan`/`apply` in this work.** This package
delivers Terraform *code*, validated with `terraform fmt`/`init`/`validate`
(none of which require an AWS account). `terraform plan`/`apply` — which
create real, billable resources — are left to whoever has real AWS
credentials, to run deliberately, reviewing the plan output first.

**2. Local state, not S3+DynamoDB remote state.** Remote state is the
standard pattern for team collaboration on infrastructure, but requires a
bootstrap step (the state bucket must exist before Terraform can use it as
a backend) and real AWS access to set up — neither of which is available or
appropriate to do from this environment. Local state has no bootstrap
dependency and is what can actually be `init`-validated without any AWS
account. Revisit once this is actually being applied against a real AWS
account by someone who can run the bootstrap step.

**3. Public subnets for the ECS/Fargate compute, private subnets for
RDS/Redis.** A NAT Gateway (the conventional way to give private-subnet
Fargate tasks outbound internet access) costs real money continuously
(~$32/month plus data processing) regardless of whether anything is
running. For M0's placeholder containers — which handle no real traffic or
data — that recurring cost isn't justified yet. RDS and Redis remain in
private subnets with security groups scoped to only the ECS service's
security group, never internet-reachable — the data layer's isolation
doesn't depend on the NAT Gateway question at all. Revisit (add a NAT
Gateway or VPC endpoints) once real workloads run in ECS.

**4. RDS's native `manage_master_user_password`, not a hand-rolled secret.**
AWS/RDS can generate and store the master password in Secrets Manager
itself, with zero extra Terraform resources or providers. This is simpler
than provisioning a `random_password` + `aws_secretsmanager_secret` pair
ourselves, and the secret ends up in exactly the place Task #6 (Secrets
Manager *application* integration) will need to read it from anyway. This
is not Task #6's scope creeping in — it's the only reasonably secure way to
create an RDS instance in Terraform at all; hardcoding a password in state
or tfvars is not an acceptable alternative per the project's security
principles ("never expose secrets").

**5. Staging only, not dev/prod too.** The M0 Definition of Done explicitly
calls out staging ("Terraform apply is repeatable and destructible — can
tear down/rebuild staging cleanly"). The module structure (below) makes
adding `environments/dev` and `environments/prod` later a matter of
instantiating the same modules with different variables, not a redesign —
building them now, unused, would be building ahead of actual need.

**6. `us-east-1`, single region.** No constraint stated anywhere in the TDD
beyond "start single-region" (§16.4). `us-east-1` is AWS's cheapest,
most feature-complete region and the reasonable default absent a
data-residency requirement.

**7. ECR deferred to Task #7, not provisioned here.** The Roadmap's M0 line
for this task doesn't mention a registry; Task #7 is specifically about
deployment via CI/CD, which is where a registry naturally belongs. The
ECS "hello-world" service here uses a public placeholder image instead.

## Alternatives considered

- **S3+DynamoDB remote state now**: rejected for this task specifically —
  correct long-term, but requires AWS access this work doesn't have to
  bootstrap safely; better sequenced once real credentials are in the
  picture (see decision #2).
- **NAT Gateway from the start**: rejected for now on cost grounds given
  these containers do nothing yet (see decision #3); not a security
  compromise on the data layer, which stays private regardless.
- **Provisioning dev/prod environments now**: rejected — no current need,
  and the module structure means it costs little to add later (see
  decision #5).

## Consequences

- `infrastructure/terraform/modules/{vpc,rds,redis,s3,ecs}` hold reusable,
  per-service modules; `infrastructure/terraform/environments/staging`
  instantiates them.
- Migrating to remote state, adding a NAT Gateway, and adding dev/prod
  environments are all straightforward, explicitly-flagged follow-ups —
  not redesigns — once there's real AWS access and real workloads to
  justify them.
