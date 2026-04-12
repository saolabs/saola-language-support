# HCL Template Example
# This is an HCL configuration file

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  type        = string
  description = "AWS region to deploy resources"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "instance_count" {
  type        = number
  description = "Number of instances"
  default     = 1
}

# Locals
locals {
  common_tags = {
    Environment = var.environment
    Managed_By  = "Terraform"
  }
}

# Resource declaration
resource "aws_instance" "example" {
  count = var.instance_count

  ami           = "ami-12345678"
  instance_type = "t2.micro"

  tags = merge(
    local.common_tags,
    {
      Name = "example-${count.index}"
    }
  )
}

# Data source
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "instance_ids" {
  value       = aws_instance.example[*].id
  description = "IDs of the created instances"
}

output "availability_zones" {
  value = data.aws_availability_zones.available.names
}

# Module
module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  cidr_block  = "10.0.0.0/16"
}
