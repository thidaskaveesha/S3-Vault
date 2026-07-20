"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpAction } from "../actions/auth";
import Link from "next/link";
import { ShieldCheck, ArrowRight, UserPlus, Info } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    const res = await signUpAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccess(res.message);
      // Wait 3 seconds, then redirect to verification page
      setTimeout(() => {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }, 2500);
    } else {
      setError(res.message);
    }
  }

  return (
    <div style={{ maxWidth: "450px", width: "100%", margin: "60px auto", padding: "0 20px" }}>
      <div className="neo-window">
        <div className="neo-window-header" style={{ backgroundColor: "var(--color-primary)" }}>
          <span style={{ color: "#000" }}>USER_REGISTRATION.SYS</span>
          <div className="neo-window-dots">
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
          </div>
        </div>

        <div className="neo-window-body">
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.8rem", WebkitTextStroke: "0.5px #000" }}>CREATE VAULT</h2>
            <p style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Register Cognito User Account</p>
          </div>

          {error && (
            <div className="neo-toast error" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">SIGNUP_FAIL.LOG</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="neo-toast success" style={{ padding: "8px 12px", marginBottom: "16px" }}>
              <div>
                <div className="neo-toast-title">REGISTRATION_INIT.OK</div>
                <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>{success}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="neo-form-group">
              <label className="neo-label">User Email Address</label>
              <input 
                type="email" 
                name="email"
                placeholder="name@domain.com" 
                required 
                className="neo-input"
              />
            </div>

            <div className="neo-form-group">
              <label className="neo-label">Password</label>
              <input 
                type="password" 
                name="password"
                placeholder="••••••••" 
                required 
                minLength={8}
                className="neo-input"
              />
              <span className="font-mono" style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px" }}>
                * Min 8 chars, including uppercase & numbers (Cognito Policy)
              </span>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="neo-btn primary font-mono" 
              style={{ width: "100%", marginTop: "10px" }}
            >
              {loading ? "REGISTERING..." : "INITIALIZE_REGISTRATION()"} <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", border: "2px solid #000", padding: "10px", marginTop: "20px", fontSize: "0.75rem", backgroundColor: "#fffde7" }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Note:</strong> We will request verification code to secure the registration parameters.
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem", fontWeight: "bold" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ textDecoration: "underline", color: "var(--color-tertiary)" }}>
              Log In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
