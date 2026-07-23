"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredToken,
  deletePhoto,
  getUploadUrl,
  listPhotos,
  me,
  savePhotoMetadata,
  type PhotoItem,
} from "@/lib/api";

type DashboardClientProps = {
  user: {
    email: string;
    sub: string;
  };
};

export function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const items = await listPhotos();
      setPhotos(items);
    } catch (error: any) {
      setStatus(error.message || "Failed to load dashboard.");
      clearStoredToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setStatus("");

    try {
      const sign = await getUploadUrl(file.name, file.type, file.size);

      const uploadResponse = await fetch(sign.url ?? "", {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload to S3 failed.");
      }

      await savePhotoMetadata(sign.fileId ?? "", file.name, file.type, file.size, sign.s3Key ?? "");
      await load();
      setStatus("Upload complete.");
    } catch (error: any) {
      setStatus(error.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    event.currentTarget.value = "";
  }

  async function onDelete(fileId: string) {
    if (!confirm("Delete this photo?")) return;
    await deletePhoto(fileId);
    await load();
  }

  return (
    <main className="static-page">
      <div className="neo-container" style={{ padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 30 }}>
          <div>
            <span className="neo-badge primary font-mono">FILE VAULT v1.1.0</span>
            <h2 style={{ fontSize: "2.2rem", WebkitTextStroke: "0.5px #000", marginTop: 8 }}>PHOTO CABINET</h2>
          </div>

          <div className="neo-box" style={{ padding: "10px 16px", display: "flex", gap: 16, alignItems: "center", backgroundColor: "#fff" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              User: <span className="font-mono">{user.email}</span>
              <br />
              Runtime: <span className="font-mono">STATIC + LAMBDA</span>
            </div>
          </div>
        </div>

        {status ? (
          <div className="neo-toast success">
            <div className="neo-toast-title">STATUS</div>
            <div style={{ fontSize: "0.85rem" }}>{status}</div>
          </div>
        ) : null}

        <div className="static-grid" style={{ marginBottom: 30 }}>
          <div
            className="neo-box hoverable upload-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                void uploadFile(file);
              }
            }}
          >
            <input type="file" accept="image/*" onChange={onPickFile} disabled={uploading || loading} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <span className="neo-badge accent font-mono">UPLOAD ZONE</span>
              <h3 style={{ textTransform: "uppercase", fontSize: "1.4rem" }}>Drag & Drop Secure Photo</h3>
              <p style={{ fontWeight: 600 }}>or click to browse local files</p>
              <span className="neo-badge primary font-mono" style={{ fontSize: "0.75rem", marginTop: 8 }}>
                Allowed: PNG, JPG, JPEG, GIF, WEBP (Max 15MB)
              </span>
              <button className="neo-btn tertiary" type="button" disabled={uploading || loading} onClick={() => document.querySelector<HTMLInputElement>('.upload-zone input')?.click()}>
                {uploading ? "UPLOADING..." : "SELECT FILE"}
              </button>
            </div>
          </div>

          <div className="neo-window">
            <div className="neo-window-header" style={{ backgroundColor: "var(--color-tertiary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>SECURE_RESOURCES [Count: {photos.length}]</span>
              <div className="neo-window-dots">
                <div className="neo-window-dot red" />
                <div className="neo-window-dot yellow" />
                <div className="neo-window-dot green" />
              </div>
            </div>

            <div className="neo-window-body" style={{ minHeight: 300 }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
                  <p className="font-mono" style={{ fontSize: "0.9rem", fontWeight: "bold" }}>RETRIEVING CRYPTOGRAPHIC INDEXES...</p>
                </div>
              ) : photos.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 250, textAlign: "center" }}>
                  <h3 style={{ fontSize: "1.3rem", marginBottom: 8 }}>VAULT EMPTY</h3>
                  <p style={{ maxWidth: 400, fontSize: "0.9rem", color: "#444" }}>Drop files in the upload zone above to shield them with S3 KMS parameters.</p>
                </div>
              ) : (
                <div className="photo-grid">
                  {photos.map((photo) => (
                    <div key={photo.fileId} className="neo-box hoverable" style={{ padding: 12, display: "flex", flexDirection: "column" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.downloadUrl} alt={photo.fileName} className="photo-thumb" loading="lazy" />

                      <div className="photo-meta">
                        <div className="font-mono" style={{ fontSize: "0.85rem", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }} title={photo.fileName}>
                          📁 {photo.fileName}
                        </div>

                        <div className="photo-meta-row">
                          <span>Size: {Math.round(photo.fileSize / 1024)} KB</span>
                          <span>Date: {new Date(photo.uploadedAt).toLocaleDateString()}</span>
                        </div>

                        <div className="s3-key" title={photo.s3Key}>S3: {photo.s3Key}</div>
                      </div>

                      <div className="static-row" style={{ justifyContent: "stretch" }}>
                        <a href={photo.downloadUrl} target="_blank" rel="noopener noreferrer" className="neo-btn accent font-mono" style={{ flex: 1, padding: "6px 12px", fontSize: "0.75rem", boxShadow: "2px 2px 0px 0px #000" }}>
                          GET_URL
                        </a>

                        <button type="button" onClick={() => void onDelete(photo.fileId)} className="neo-btn danger font-mono" style={{ padding: "6px 12px", fontSize: "0.75rem", boxShadow: "2px 2px 0px 0px #000" }}>
                          PURGE
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
    </main>
  );
}
