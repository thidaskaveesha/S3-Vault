import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

// Configure variables from environment
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const AWS_REGION = process.env.AWS_REGION || "us-east-1";

export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

export const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "";
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
export const KMS_KEY_ARN = process.env.KMS_KEY_ARN || ""; // Optional - KMS key for S3 encryption

// Check if we should run in simulated local mode
export const IS_MOCK_MODE =
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !COGNITO_USER_POOL_ID ||
  !COGNITO_CLIENT_ID ||
  !DYNAMODB_TABLE_NAME ||
  !S3_BUCKET_NAME;

// Helper to log current status on start
if (IS_MOCK_MODE) {
  console.log("⚠️ AWS credentials not fully configured. Running photo vault in LOCAL DEMO MOCK MODE.");
} else {
  console.log("✅ AWS credentials found. Connecting to Cognito, DynamoDB, and KMS-encrypted S3.");
}

// Credentials config
const awsConfig = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
};

// Initialize clients (only if not in mock mode, otherwise pass empty configs to avoid constructor validate errors)
export const s3Client = !IS_MOCK_MODE 
  ? new S3Client(awsConfig) 
  : null as unknown as S3Client;

const rawDynamoClient = !IS_MOCK_MODE 
  ? new DynamoDBClient(awsConfig) 
  : null as unknown as DynamoDBClient;

export const dynamoClient = !IS_MOCK_MODE 
  ? DynamoDBDocumentClient.from(rawDynamoClient, {
      marshallOptions: { removeUndefinedValues: true },
    }) 
  : null as unknown as DynamoDBDocumentClient;

export const cognitoClient = !IS_MOCK_MODE 
  ? new CognitoIdentityProviderClient(awsConfig) 
  : null as unknown as CognitoIdentityProviderClient;
