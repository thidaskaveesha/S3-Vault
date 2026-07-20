import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { MOCK_S3_DIR } from "@/lib/mockDb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const fileId = searchParams.get("fileId");
    const fileName = searchParams.get("fileName");

    if (!userId || !fileId || !fileName) {
      return new Response("Missing parameters", { status: 400 });
    }

    const filePath = path.join(MOCK_S3_DIR, userId, `${fileId}-${fileName}`);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found in local mock S3 storage.", { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    let contentType = "application/octet-stream";
    const ext = path.extname(fileName).toLowerCase();
    
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".svg") contentType = "image/svg+xml";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Mock download route error:", error);
    return new Response(error.message || "Download error", { status: 500 });
  }
}
