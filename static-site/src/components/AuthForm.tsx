"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredToken,
  confirmPasswordReset,
  confirmRegister,
  login,
  register,
  requestPasswordReset,
  setStoredToken,
} from "@/lib/api";

type Mode = "login" | "register" | "verify" | "forgot";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");

  const title = useMemo(() => {
    if (mode === "login") return "Login";
    if (mode === "register") return "Create account";
    if (mode === "verify") return "Verify account";
    return "Reset password";
  }, [mode]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const code = String(formData.get("code") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");

    try {
      if (mode === "login") {
        const result = await login(email, password);
        setMessage(result.message || "Logged in.");
        router.push("/dashboard");
        return;
      }

      if (mode === "register") {
        const result = await register(email, password);
        setMessage(result.message || "Registered.");
        return;
      }

      if (mode === "verify") {
        const result = await confirmRegister(email, code);
        setMessage(result.message || "Verified.");
        return;
      }

      if (step === "request") {
        const result = await requestPasswordReset(email);
        setMessage(result.message || "Reset code sent.");
        setStep("confirm");
        return;
      }

      const result = await confirmPasswordReset(email, code, newPassword);
      setMessage(result.message || "Password updated.");
      clearStoredToken();
      router.push("/login");
    } catch (error: any) {
      setMessage(error.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="static-page static-form-shell">
      <form className="neo-box hoverable" onSubmit={onSubmit}>
        <span className="neo-badge primary font-mono">{title.toUpperCase()}</span>
        <h1 style={{ marginTop: 12 }}>{title}</h1>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.5, marginBottom: 8 }}>
          Browser-only front end. Authentication is handled by Lambda + Cognito.
        </p>

        <div className="neo-form-group">
          <label className="neo-label">Email</label>
          <input className="neo-input" name="email" type="email" required placeholder="you@example.com" />
        </div>

        {(mode === "login" || mode === "register") && (
          <div className="neo-form-group">
            <label className="neo-label">Password</label>
            <input className="neo-input" name="password" type="password" required minLength={8} placeholder="Enter password" />
          </div>
        )}

        {(mode === "verify" || (mode === "forgot" && step === "confirm")) && (
          <div className="neo-form-group">
            <label className="neo-label">Verification code</label>
            <input className="neo-input" name="code" type="text" required placeholder="123456" />
          </div>
        )}

        {mode === "forgot" && step === "confirm" && (
          <div className="neo-form-group">
            <label className="neo-label">New password</label>
            <input className="neo-input" name="newPassword" type="password" required minLength={8} placeholder="New password" />
          </div>
        )}

        <button className="neo-btn primary" type="submit" disabled={loading}>
          {loading ? "WORKING..." : mode === "forgot" && step === "request" ? "SEND RESET CODE" : "CONTINUE"}
        </button>

        {message ? <p className="static-status">{message}</p> : null}
      </form>
    </main>
  );
}
