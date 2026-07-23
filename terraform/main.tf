provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  bucket_name = lower("${var.project_name}-${data.aws_caller_identity.current.account_id}-${var.environment}")
}

resource "aws_cognito_user_pool" "this" {
  name                       = "${local.name_prefix}-users"
  username_attributes        = ["email"]
  auto_verified_attributes   = ["email"]
  mfa_configuration          = "OFF"
  deletion_protection        = "INACTIVE"
  email_verification_subject = "Verify your email address"
  email_verification_message = "Your verification code is {####}"

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = true
    temporary_password_validity_days = 7
  }
}

resource "aws_cognito_user_pool_client" "this" {
  name                                 = "${local.name_prefix}-app-client"
  user_pool_id                         = aws_cognito_user_pool.this.id
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  supported_identity_providers         = ["COGNITO"]
  read_attributes                      = ["email"]
  write_attributes                     = ["email"]
  enable_token_revocation              = true
  allowed_oauth_flows_user_pool_client = false
  explicit_auth_flows                  = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

resource "aws_kms_key" "this" {
  description             = "KMS key for ${local.name_prefix} S3 uploads"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "this" {
  name          = "alias/${local.name_prefix}-s3"
  target_key_id = aws_kms_key.this.key_id
}

resource "aws_s3_bucket" "this" {
  bucket        = local.bucket_name
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.this.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_cors_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_dynamodb_table" "this" {
  name         = "${local.name_prefix}-photos"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "fileId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "fileId"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.this.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

data "aws_iam_policy_document" "app_access" {
  statement {
    sid    = "CognitoAuth"
    effect = "Allow"
    actions = [
      "cognito-idp:SignUp",
      "cognito-idp:ConfirmSignUp",
      "cognito-idp:InitiateAuth",
      "cognito-idp:ForgotPassword",
      "cognito-idp:ConfirmForgotPassword",
      "cognito-idp:ResendConfirmationCode",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "S3VaultAccess"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = [
      aws_s3_bucket.this.arn,
      "${aws_s3_bucket.this.arn}/*",
    ]
  }

  statement {
    sid    = "DynamoVaultAccess"
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:DeleteItem",
    ]
    resources = [aws_dynamodb_table.this.arn]
  }

  statement {
    sid    = "KmsVaultAccess"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.this.arn]
  }
}

resource "aws_iam_user" "app" {
  name = var.iam_user_name
}

resource "aws_iam_user_policy" "app" {
  name   = "${local.name_prefix}-app-access"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app_access.json
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
