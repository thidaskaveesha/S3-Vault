# Static Next.js + Lambda version

This folder contains a Next.js app configured for static export and a separate Lambda handler for the AWS-backed workflows.

## Front end

- Build from `static-site/`
- Set `NEXT_PUBLIC_API_BASE_URL` to your Lambda Function URL or API Gateway base URL
- Run `next build` to generate static files

- Deploy `static-site/lambda/app.py` as a Python Lambda function
- Set these environment variables:
  - `AWS_REGION`
  - `COGNITO_USER_POOL_ID`
  - `COGNITO_CLIENT_ID`
  - `DYNAMODB_TABLE_NAME`
  - `S3_BUCKET_NAME`
  - `KMS_KEY_ARN` (optional)
  - `ALLOWED_ORIGIN`

The Python Lambda code handles auth, signed S3 upload URLs, metadata storage, photo listing, and delete operations.
