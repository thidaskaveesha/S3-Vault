variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name used as the base for resource names."
  default     = "signed-s3-vault"
}

variable "environment" {
  type        = string
  description = "Environment label used in resource names."
  default     = "dev"
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "Allowed browser origins for direct S3 uploads and downloads."
  default     = ["http://localhost:3000"]
}

variable "iam_user_name" {
  type        = string
  description = "IAM user that will own the app credentials."
  default     = "signed-s3-vault-app"
}
