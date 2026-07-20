import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { MOCK_S3_DIR } from "@/lib/mockDb";

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const fileId = searchParams.get("fileId");
    const fileName = searchParams.get("fileName");

    if (!userId || !fileId || !fileName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Read the arrayBuffer of the upload
    const data = await request.arrayBuffer();
    const buffer = Buffer.from(data);

    // Create user subdirectory
    const userDir = path.join(MOCK_S3_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filePath = path.join(userDir, `${fileId}-${fileName}`);
    
    // Save file
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 [MOCK S3] Saved simulated file: ${filePath}`);

    return NextResponse.json({ success: true, message: "File uploaded successfully." });
  } catch (error: any) {
    console.error("Mock upload route error:", error);
    return NextResponse.json({ error: error.message || "Upload error" }, { status: 500 });
  }
}
