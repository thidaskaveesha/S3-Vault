"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmSignUpAction } from "../actions/auth";
import Link from "next/link";
import { KeyRound, ShieldAlert } from "lucide-react";

function VerifyForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await confirmSignUpAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccess(res.message);
      setTimeout(() => {
        router.push("/login?verified=true");
      }, 2000);
    } else {
      setError(res.message);
    }
  }

  return (
    <div style={{ maxWidth: "450px", width: "100%", margin: "60px auto", padding: "0 20px" }}>
      <div className="neo-window">
        <div className="neo-window-header" style={{ backgroundColor: "var(--color-purple)" }}>
          <span style={{ color: "#000" }}>CONFIRM_SIGNUP.SYS</span>
          <div className="neo-window-dots">
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
          </div>
        </div>

        <div className="neo-window-body">
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.8rem", WebkitTextStroke: "0.5px #000" }}>VERIFY CODE</h2>
            <p style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Validate user register code</p>
          </div>

          {error && (
            <div className="neo-toast error" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">VERIFICATION_ERR.LOG</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="neo-toast success" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">VERIFICATION_OK.EXE</div>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com" 
                required 
                className="neo-input"
              />
            </div>

            <div className="neo-form-group">
              <label className="neo-label">Verification OTP Code</label>
              <input 
                type="text" 
                name="code"
                placeholder="123456" 
                maxLength={6}
                required 
                className="neo-input font-mono"
                style={{ fontSize: "1.2rem", letterSpacing: "0.15em", textAlign: "center" }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="neo-btn purple font-mono" 
              style={{ width: "100%", marginTop: "10px" }}
            >
              {loading ? "VERIFYING..." : "CONFIRM_REGISTRATION()"} <KeyRound size={16} />
            </button>
          </form>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", border: "2px solid #000", padding: "10px", marginTop: "20px", fontSize: "0.75rem", backgroundColor: "#fffde7" }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Mock Mode Check:</strong> If credentials are mock, open the terminal server logs to extract your verification code.
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
            Need help?{" "}
            <Link href="/register" style={{ textDecoration: "underline", color: "var(--color-tertiary)" }}>
              Submit code again (Go back)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "100px" }} className="font-mono">
        LOADING VERIFICATION PARAMETERS...
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
