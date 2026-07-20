"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "../actions/auth";
import Link from "next/link";
import { LogIn, Key, Compass } from "lucide-react";

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setSuccess("Account verified successfully! You can now log in.");
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await signInAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccess("Authentication success! Accessing vault...");
      // Soft wait for cookie state propagation in browser
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } else {
      setError(res.message);
    }
  }

  return (
    <div style={{ maxWidth: "450px", width: "100%", margin: "60px auto", padding: "0 20px" }}>
      <div className="neo-window">
        <div className="neo-window-header" style={{ backgroundColor: "var(--color-tertiary)" }}>
          <span>SECURE_LOGIN.SYS</span>
          <div className="neo-window-dots">
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
          </div>
        </div>

        <div className="neo-window-body">
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.8rem", WebkitTextStroke: "0.5px #000" }}>ACCESS CORE</h2>
            <p style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Sign in to decrypt S3 credentials</p>
          </div>

          {error && (
            <div className="neo-toast error" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">AUTH_FAIL.LOG</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="neo-toast success" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">AUTH_OK.EXE</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{success}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="neo-form-group">
              <label className="neo-label">Cognito Username/Email</label>
              <input 
                type="email" 
                name="email"
                placeholder="user@domain.com" 
                required 
                className="neo-input"
              />
            </div>

            <div className="neo-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="neo-label">Password Key</label>
                <Link href="/forgot-password" style={{ fontSize: "0.75rem", textDecoration: "underline", color: "#444" }}>
                  Forgot Password?
                </Link>
              </div>
              <input 
                type="password" 
                name="password"
                placeholder="••••••••" 
                required 
                className="neo-input"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="neo-btn tertiary font-mono" 
              style={{ width: "100%", marginTop: "10px" }}
            >
              {loading ? "DECRYPTING KEY..." : "AUTHENTICATE_SESSION()"} <LogIn size={16} />
            </button>
          </form>

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
            New user?{" "}
            <Link href="/register" style={{ textDecoration: "underline", color: "var(--color-secondary)" }}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "100px" }} className="font-mono">
        LOADING AUTH SERVICES...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
