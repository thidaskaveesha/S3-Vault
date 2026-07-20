"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPasswordAction, confirmForgotPasswordAction } from "../actions/auth";
import Link from "next/link";
import { RefreshCw, CheckCircle, Info } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Send trigger, Step 2: Confirm new password
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const formEmail = formData.get("email") as string;
    
    // Store email locally to pre-populate in step 2
    setEmail(formEmail);

    const res = await forgotPasswordAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccess(res.message);
      setStep(2);
    } else {
      setError(res.message);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await confirmForgotPasswordAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccess(res.message + " Redirecting you to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } else {
      setError(res.message);
    }
  }

  return (
    <div style={{ maxWidth: "450px", width: "100%", margin: "60px auto", padding: "0 20px" }}>
      <div className="neo-window">
        <div className="neo-window-header" style={{ backgroundColor: "var(--color-secondary)" }}>
          <span style={{ color: "#fff" }}>RESET_PASSWORD.SYS</span>
          <div className="neo-window-dots">
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
          </div>
        </div>

        <div className="neo-window-body">
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.8rem", WebkitTextStroke: "0.5px #000" }}>RECOVER KEY</h2>
            <p style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              {step === 1 ? "Request Cognito Password Reset" : "Configure New Account Key"}
            </p>
          </div>

          {error && (
            <div className="neo-toast error" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">RECOVERY_ERR.LOG</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="neo-toast success" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">RECOVERY_OK.EXE</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{success}</div>
              </div>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: REQUEST CODE */
            <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="neo-form-group">
                <label className="neo-label">Enter Registered Email</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="user@domain.com" 
                  required 
                  className="neo-input"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="neo-btn secondary font-mono" 
                style={{ width: "100%", marginTop: "10px" }}
              >
                {loading ? "SENDING CODE..." : "REQUEST_RESET_CODE()"} <RefreshCw size={16} />
              </button>
            </form>
          ) : (
            /* STEP 2: VERIFY CODE AND SET NEW PASSWORD */
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Keep email hidden/disabled but submitted in the form */}
              <input type="hidden" name="email" value={email} />
              
              <div className="neo-form-group">
                <label className="neo-label">Target Email</label>
                <input 
                  type="email" 
                  disabled 
                  value={email}
                  className="neo-input"
                  style={{ backgroundColor: "#eee", cursor: "not-allowed" }}
                />
              </div>

              <div className="neo-form-group">
                <label className="neo-label">Reset OTP Code</label>
                <input 
                  type="text" 
                  name="code"
                  placeholder="123456" 
                  maxLength={6}
                  required 
                  className="neo-input font-mono"
                  style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.1em" }}
                />
              </div>

              <div className="neo-form-group">
                <label className="neo-label">New Password</label>
                <input 
                  type="password" 
                  name="newPassword"
                  placeholder="••••••••" 
                  required 
                  minLength={8}
                  className="neo-input"
                />
                <span className="font-mono" style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px" }}>
                  * Minimum 8 characters with numbers & uppercase
                </span>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="neo-btn secondary font-mono" 
                style={{ width: "100%", marginTop: "10px" }}
              >
                {loading ? "RESETTING KEY..." : "SET_NEW_PASSWORD()"} <CheckCircle size={16} />
              </button>
              
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="neo-btn font-mono" 
                style={{ width: "100%", padding: "8px 16px", fontSize: "0.8rem" }}
              >
                ← Request new code
              </button>
            </form>
          )}

          <div style={{ display: "flex", gap: "8px", alignItems: "center", border: "2px solid #000", padding: "10px", marginTop: "20px", fontSize: "0.75rem", backgroundColor: "#fffde7" }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Console check:</strong> In mock demo mode, OTP reset password code will be printed to the terminal console stdout.
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
            Remembered key?{" "}
            <Link href="/login" style={{ textDecoration: "underline", color: "var(--color-tertiary)" }}>
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
