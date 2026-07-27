locals {
  tags = {
    Environment = "staging"
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name = var.name
  tags = local.tags
}

module "ecs" {
  source = "../../modules/ecs"

  name              = var.name
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  tags              = local.tags
}

module "rds" {
  source = "../../modules/rds"

  name                       = var.name
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.ecs.security_group_id]
  tags                       = local.tags
}

module "redis" {
  source = "../../modules/redis"

  name                       = var.name
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.ecs.security_group_id]
  tags                       = local.tags
}

module "s3" {
  source = "../../modules/s3"

  bucket_name = var.s3_bucket_name
  tags        = local.tags
}
