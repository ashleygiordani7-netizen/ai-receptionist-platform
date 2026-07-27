terraform {
  required_version = ">= 1.15"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Local state, deliberately, for now — see ADR-0009. No AWS account is
  # available to bootstrap an S3+DynamoDB remote backend from this work;
  # migrate once someone with real AWS credentials is applying this.
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ai-receptionist-platform"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}
