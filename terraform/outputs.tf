output "aws_region" {
  value = var.aws_region
}

output "aws_access_key_id" {
  value = aws_iam_access_key.app.id
}

output "aws_secret_access_key" {
  value     = aws_iam_access_key.app.secret
  sensitive = true
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.this.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.this.name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.this.bucket
}

output "kms_key_arn" {
  value = aws_kms_key.this.arn
}
