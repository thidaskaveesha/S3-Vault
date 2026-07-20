import fs from "fs";
import path from "path";

// Ensure mock directories exist
const TMP_DIR = path.join(process.cwd(), "tmp");
const MOCK_DB_FILE = path.join(TMP_DIR, "mock_database.json");
export const MOCK_S3_DIR = path.join(TMP_DIR, "mock_s3");

interface MockUser {
  sub: string;
  email: string;
  passwordHash: string;
  status: "UNCONFIRMED" | "CONFIRMED";
  confirmationCode?: string;
  resetCode?: string;
}

interface MockPhoto {
  userId: string;
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  uploadedAt: string;
}

interface MockDBData {
  users: MockUser[];
  photos: MockPhoto[];
}

function initMockDB() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  if (!fs.existsSync(MOCK_S3_DIR)) {
    fs.mkdirSync(MOCK_S3_DIR, { recursive: true });
  }
  if (!fs.existsSync(MOCK_DB_FILE)) {
    const initialData: MockDBData = { users: [], photos: [] };
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

// Read database
export function readMockDB(): MockDBData {
  initMockDB();
  try {
    const content = fs.readFileSync(MOCK_DB_FILE, "utf8");
    return JSON.parse(content);
  } catch (e) {
    return { users: [], photos: [] };
  }
}

// Write database
export function writeMockDB(data: MockDBData) {
  initMockDB();
  fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Simple base64 "hash" for demonstration mock security
export function simpleHash(str: string): string {
  return Buffer.from(str).toString("base64");
}
