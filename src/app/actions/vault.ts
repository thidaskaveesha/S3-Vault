"use server";

import { 
  IS_MOCK_MODE, 
  s3Client, 
  dynamoClient, 
  S3_BUCKET_NAME, 
  DYNAMODB_TABLE_NAME, 
  KMS_KEY_ARN 
} from "@/lib/aws";
import { getCurrentUser } from "./auth";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutCommand, QueryCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { readMockDB, writeMockDB, MOCK_S3_DIR } from "@/lib/mockDb";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface PhotoMetadata {
  fileId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  uploadedAt: string;
  downloadUrl?: string; // Signed GET url mapping
}

export interface UploadUrlResponse {
  success: boolean;
  message: string;
  url?: string;
  fileId?: string;
  s3Key?: string;
}

// 1. Generate Presigned URL for Upload (PUT)
export async function getUploadUrlAction(
  fileName: string, 
  fileType: string, 
  fileSize: number
): Promise<UploadUrlResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Unauthorized. Please log in first." };
  }

  const fileId = crypto.randomUUID();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `vault/${user.sub}/${fileId}-${cleanFileName}`;

  if (IS_MOCK_MODE) {
    // Generate Mock upload action url
    const mockUrl = `/api/mock-s3/upload?userId=${user.sub}&fileId=${fileId}&fileName=${encodeURIComponent(cleanFileName)}`;
    
    return {
      success: true,
      message: "Mock presigned upload URL generated.",
      url: mockUrl,
      fileId,
      s3Key,
    };
  } else {
    try {
      // PutObjectCommand parameters with KMS encryption settings
      const commandParams: any = {
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType,
        ServerSideEncryption: "aws:kms",
      };

      // Apply customer managed key if ARN is provided, otherwise falls back to aws/s3 default key
      if (KMS_KEY_ARN) {
        commandParams.SSEKMSKeyId = KMS_KEY_ARN;
      }

      const command = new PutObjectCommand(commandParams);
      
      // Presign the upload URL, valid for 15 minutes (900 seconds)
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 900,
      });

      return {
        success: true,
        message: "Presigned S3 upload URL generated with KMS encryption.",
        url: presignedUrl,
        fileId,
        s3Key,
      };
    } catch (e: any) {
      console.error("AWS S3 Key Presign Error:", e);
      return { success: false, message: e.message || "Failed to generate S3 upload link." };
    }
  }
}

// 2. Save Uploaded File Metadata in Database
export async function savePhotoMetadataAction(
  fileId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  s3Key: string
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Unauthorized." };
  }

  const uploadedAt = new Date().toISOString();

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    
    // Save metadata
    db.photos.push({
      userId: user.sub,
      fileId,
      fileName,
      fileType,
      fileSize,
      s3Key,
      uploadedAt,
    });

    writeMockDB(db);
    console.log(`📸 [DEMO MOCK DYNAMODB] Metdata saved for: ${fileName} (owner: ${user.email})`);
    
    return { success: true, message: "Metadata saved locally." };
  } else {
    try {
      const command = new PutCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Item: {
          userId: user.sub, // Partition Key
          fileId: fileId,   // Sort Key
          fileName,
          fileType,
          fileSize,
          s3Key,
          uploadedAt,
        },
      });

      await dynamoClient.send(command);
      console.log(`📸 [AWS DYNAMODB] Metadata saved for: ${fileName} (owner: ${user.email})`);

      return { success: true, message: "Photo metadata secured in DynamoDB." };
    } catch (e: any) {
      console.error("AWS DynamoDB Put Error:", e);
      return { success: false, message: e.message || "Failed to save photo metadata." };
    }
  }
}

// 3. Fetch User Photos with custom signed access URLs (GET)
export async function getPhotosAction(): Promise<{ success: boolean; photos: PhotoMetadata[]; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, photos: [], message: "Unauthorized." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const userPhotos = db.photos.filter((p) => p.userId === user.sub);
    
    // Map to mock download urls
    const photosWithUrls = userPhotos.map((p) => {
      // In mock, we expose a local download api endpoint
      const mockDownloadUrl = `/api/mock-s3/download?userId=${user.sub}&fileId=${p.fileId}&fileName=${encodeURIComponent(p.fileName)}`;
      return {
        ...p,
        downloadUrl: mockDownloadUrl,
      };
    });

    // Sort by uploadedAt descending
    photosWithUrls.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return { 
      success: true, 
      photos: photosWithUrls, 
      message: "Fetched local photos successfully." 
    };
  } else {
    try {
      // Query DynamoDB for items matching the logged-in user's ID
      const command = new QueryCommand({
        TableName: DYNAMODB_TABLE_NAME,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": user.sub,
        },
      });

      const result = await dynamoClient.send(command);
      const items = (result.Items || []) as PhotoMetadata[];

      // Generate a temporary S3 secure signed url for each photo
      const photosWithUrls = await Promise.all(
        items.map(async (item) => {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: item.s3Key,
            });

            // Signed link expires in 15 minutes (900 seconds)
            const downloadUrl = await getSignedUrl(s3Client, getCommand, {
              expiresIn: 900,
            });

            return {
              ...item,
              downloadUrl,
            };
          } catch (urlErr) {
            console.error(`S3 signed URL error for ${item.fileName}:`, urlErr);
            return item;
          }
        })
      );

      // Sort by uploadedAt descending
      photosWithUrls.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      return {
        success: true,
        photos: photosWithUrls,
        message: "Secured photos loaded successfully via S3 signed URLs.",
      };
    } catch (e: any) {
      console.error("AWS DynamoDB Query Error:", e);
      return { success: false, photos: [], message: e.message || "Failed to load photos." };
    }
  }
}

// 4. Delete photo from database and S3
export async function deletePhotoAction(fileId: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Unauthorized." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const photoIndex = db.photos.findIndex((p) => p.userId === user.sub && p.fileId === fileId);

    if (photoIndex === -1) {
      return { success: false, message: "Photo not found or unauthorized delete target." };
    }

    const targetPhoto = db.photos[photoIndex];
    
    // Remote local S3 emulated file
    const targetPath = path.join(MOCK_S3_DIR, user.sub, `${fileId}-${targetPhoto.fileName}`);
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (e) {
        console.error("Failed to delete local mock file:", e);
      }
    }

    // Delete database entry
    db.photos.splice(photoIndex, 1);
    writeMockDB(db);

    console.log(`🗑️ [DEMO MOCK S3/DYNAMODB] Deleted photo: ${targetPhoto.fileName}`);

    return { success: true, message: "Photo deleted successfully." };
  } else {
    try {
      // 1. Fetch metadata first to confirm ownership and key
      const getCommand = new GetCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          userId: user.sub,
          fileId: fileId,
        },
      });

      const getResult = await dynamoClient.send(getCommand);
      const targetPhoto = getResult.Item as PhotoMetadata;

      if (!targetPhoto) {
        return { success: false, message: "Photo not found or ownership validation failed." };
      }

      // 2. Delete file from S3
      const s3Delete = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: targetPhoto.s3Key,
      });
      await s3Client.send(s3Delete);

      // 3. Delete metadata from DynamoDB
      const dynamoDelete = new DeleteCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          userId: user.sub,
          fileId: fileId,
        },
      });
      await dynamoClient.send(dynamoDelete);

      console.log(`🗑️ [AWS S3/DYNAMODB] Deleted photo: ${targetPhoto.fileName}`);

      return { success: true, message: "Photo deleted from cloud vault." };
    } catch (e: any) {
      console.error("AWS Delete Error:", e);
      return { success: false, message: e.message || "Failed to delete photo from vault." };
    }
  }
}
