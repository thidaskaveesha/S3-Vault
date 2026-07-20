"use client";

import { useState, useEffect, useRef } from "react";
import { 
  getUploadUrlAction, 
  savePhotoMetadataAction, 
  getPhotosAction, 
  deletePhotoAction,
  PhotoMetadata 
} from "../actions/vault";
import { 
  UploadCloud, 
  Trash2, 
  Download, 
  FileImage, 
  ShieldAlert, 
  Activity, 
  Lock,
  Loader2,
  Grid
} from "lucide-react";

interface DashboardClientProps {
  user: { email: string; sub: string; isMock: boolean };
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    setLoadingPhotos(true);
    const res = await getPhotosAction();
    if (res.success) {
      setPhotos(res.photos);
    } else {
      console.error(res.message);
    }
    setLoadingPhotos(false);
  }

  // Handle Drag Over
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // Handle Dropped File
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  }

  // Handle File Input Change
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await uploadFile(file);
    }
  }

  // Trigger File Input Click
  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  // Upload Logic: Presigned PUT URL + Direct upload to S3 + Save to DB
  async function uploadFile(file: File) {
    // 1. Client-side file checks (only images)
    if (!file.type.startsWith("image/")) {
      setUploadError("Security Policy: Only image files are allowed in this photo vault.");
      return;
    }

    // Limit size is 15MB for demo sanity
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Security Policy: Photo size must be under 15 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // 2. Query server for S3/Mock PUT Url with KMS settings
      const signRes = await getUploadUrlAction(file.name, file.type, file.size);
      
      if (!signRes.success || !signRes.url || !signRes.fileId || !signRes.s3Key) {
        throw new Error(signRes.message || "Failed to generate presigned upload URL.");
      }

      const { url, fileId, s3Key } = signRes;

      // 3. PUT request directly to S3 / Mock endpoint
      const uploadResponse = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Direct S3 upload upload failed (network/CORS/policy error).");
      }

      // 4. Save metadata in DynamoDB (and local database in mock)
      const saveRes = await savePhotoMetadataAction(
        fileId,
        file.name,
        file.type,
        file.size,
        s3Key
      );

      if (!saveRes.success) {
        throw new Error(saveRes.message || "Failed to catalog S3 photo metadata.");
      }

      setUploadSuccess(`SUCCESS: Encrypted photo "${file.name}" saved in S3.`);
      
      // Reload listing
      await loadPhotos();
    } catch (e: any) {
      console.error(e);
      setUploadError(e.message || "An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
      // Clean up input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Delete Action
  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Are you sure you want to purge "${fileName}" from the secure vault? This is irreversible.`)) {
      return;
    }

    try {
      const res = await deletePhotoAction(fileId);
      if (res.success) {
        // Optimistic update
        setPhotos(photos.filter((p) => p.fileId !== fileId));
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete photo.");
    }
  }

  // Format File Size
  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="neo-container" style={{ padding: "30px 20px" }}>
      {/* Page Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "30px" }}>
        <div>
          <span className="neo-badge primary font-mono">FILE VAULT v1.1.0</span>
          <h2 style={{ fontSize: "2.2rem", WebkitTextStroke: "0.5px #000", marginTop: "8px" }}>PHOTO CABINET</h2>
        </div>
        
        {/* User context widget */}
        <div className="neo-box" style={{ padding: "10px 16px", display: "flex", gap: "16px", alignItems: "center", backgroundColor: "#fff" }}>
          <Activity size={18} style={{ color: user.isMock ? "var(--color-secondary)" : "var(--color-accent)" }} />
          <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
            Storage: <span className="font-mono">{user.isMock ? "MOCK_S3" : "AWS_S3_CLOUD"}</span>
            <br />
            Policy: <span className="font-mono">{user.isMock ? "PLAINTEXT_FS" : "AES256_SSE_KMS"}</span>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="neo-toast error">
          <div>
            <div className="neo-toast-title">SECURE_UPLOAD_ERROR.SYS</div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>{uploadError}</div>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="neo-toast success">
          <div>
            <div className="neo-toast-title">SECURE_UPLOAD_SUCCESS.EXE</div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>{uploadSuccess}</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "30px" }}>
        
        {/* 1. Drag & Drop Upload Zone */}
        <div 
          className="neo-box hoverable" 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ 
            borderStyle: "dashed", 
            borderWidth: "4px", 
            textAlign: "center", 
            padding: "50px 20px", 
            cursor: "pointer",
            backgroundColor: uploading ? "#fffde7" : "#ffffff",
          }}
          onClick={triggerFileInput}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: "none" }} 
          />
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <Loader2 className="animate-spin" size={48} style={{ color: "var(--color-tertiary)", animation: "spin 2s linear infinite" }} />
              <h3 style={{ textTransform: "uppercase", fontSize: "1.4rem" }}>SHIELDING & UPLOADING DATA...</h3>
              <p className="font-mono" style={{ fontSize: "0.85rem" }}>Generating KMS Presigned Keys & Piping Payload Directly to S3</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <UploadCloud size={48} style={{ color: "var(--color-secondary)" }} />
              <h3 style={{ textTransform: "uppercase", fontSize: "1.4rem" }}>Drag & Drop Secure Photo</h3>
              <p style={{ fontWeight: 600 }}>or click to browse local files</p>
              <span className="neo-badge primary font-mono" style={{ fontSize: "0.75rem", marginTop: "8px" }}>
                Allowed: PNG, JPG, JPEG, GIF, WEBP (Max 15MB)
              </span>
            </div>
          )}
        </div>

        {/* 2. Photo Gallery Cabin */}
        <div className="neo-window">
          <div className="neo-window-header" style={{ backgroundColor: "var(--color-tertiary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Grid size={16} /> SECURE_RESOURCES [Count: {photos.length}]
            </span>
            <div className="neo-window-dots">
              <div className="neo-window-dot red"></div>
              <div className="neo-window-dot yellow"></div>
              <div className="neo-window-dot green"></div>
            </div>
          </div>

          <div className="neo-window-body" style={{ minHeight: "300px" }}>
            {loadingPhotos ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px" }}>
                <Loader2 className="animate-spin" size={32} style={{ animation: "spin 2s linear infinite" }} />
                <p className="font-mono" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>RETRIEVING CRYPTOGRAPHIC INDEXES...</p>
              </div>
            ) : photos.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "250px", textAlign: "center" }}>
                <Lock size={40} style={{ color: "var(--color-secondary)", marginBottom: "16px" }} />
                <h3 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>VAULT EMPTY</h3>
                <p style={{ maxWidth: "400px", fontSize: "0.9rem", color: "#666" }}>
                  No photos found under your sub identity key. Drop files in the upload zone above to shield them with S3 KMS parameters.
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", 
                gap: "24px" 
              }}>
                {photos.map((photo) => (
                  <div key={photo.fileId} className="neo-box hoverable" style={{ padding: "12px", display: "flex", flexDirection: "column" }}>
                    {/* Media Preview Box */}
                    <div style={{ 
                      width: "100%", 
                      height: "180px", 
                      backgroundColor: "#eee", 
                      border: "2px solid #000", 
                      borderRadius: "2px",
                      position: "relative",
                      overflow: "hidden",
                      backgroundImage: `radial-gradient(#ccc 1px, transparent 1px)`,
                      backgroundSize: '10px 10px',
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={photo.downloadUrl} 
                        alt={photo.fileName} 
                        style={{ 
                          width: "100%", 
                          height: "100%", 
                          objectFit: "contain" 
                        }} 
                        loading="lazy"
                        onError={(e) => {
                          // Simple fallback error image UI
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>

                    {/* Metadata summary */}
                    <div style={{ marginTop: "12px", flexGrow: 1 }}>
                      <div className="font-mono" style={{ 
                        fontSize: "0.85rem", 
                        fontWeight: "bold", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap",
                        marginBottom: "4px"
                      }} title={photo.fileName}>
                        📁 {photo.fileName}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666", marginBottom: "8px" }}>
                        <span>Size: {formatBytes(photo.fileSize)}</span>
                        <span>Date: {new Date(photo.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: "#f5f5f5", 
                        border: "1px dashed #aaa", 
                        padding: "6px", 
                        fontSize: "0.65rem", 
                        fontFamily: "var(--font-mono)", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap",
                        borderRadius: "2px",
                        marginBottom: "12px"
                      }} title={photo.s3Key}>
                        S3: {photo.s3Key}
                      </div>
                    </div>

                    {/* Actions toolbar */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                      <a 
                        href={photo.downloadUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="neo-btn accent font-mono" 
                        style={{ 
                          flex: 1, 
                          padding: "6px 12px", 
                          fontSize: "0.75rem", 
                          boxShadow: "2px 2px 0px 0px #000" 
                        }}
                      >
                        <Download size={12} /> GET_URL
                      </a>
                      
                      <button 
                        onClick={() => handleDelete(photo.fileId, photo.fileName)}
                        className="neo-btn danger font-mono" 
                        style={{ 
                          padding: "6px 12px", 
                          fontSize: "0.75rem", 
                          boxShadow: "2px 2px 0px 0px #000" 
                        }}
                      >
                        <Trash2 size={12} /> PURGE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
