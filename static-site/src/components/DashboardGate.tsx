"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredToken, getStoredToken, me, type UserSession } from "@/lib/api";
import { DashboardClient } from "@/components/DashboardClient";

type GateState = "loading" | "ready" | "redirect";

export function DashboardGate() {
  const router = useRouter();
  const [state, setState] = useState<GateState>("loading");
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      const token = getStoredToken();
      if (!token) {
        clearStoredToken();
        if (mounted) {
          setState("redirect");
          router.replace("/login");
        }
        return;
      }

      try {
        const currentUser = await me();
        if (!currentUser) {
          clearStoredToken();
          if (mounted) {
            setState("redirect");
            router.replace("/login");
          }
          return;
        }

        if (mounted) {
          setUser(currentUser);
          setState("ready");
        }
      } catch {
        clearStoredToken();
        if (mounted) {
          setState("redirect");
          router.replace("/login");
        }
      }
    }

    void verifySession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (state !== "ready" || !user) {
    return (
      <main className="static-page">
        <div className="neo-container" style={{ padding: 0 }}>
          <div className="neo-box hoverable" style={{ textAlign: "center", padding: 40, marginTop: 40 }}>
            <span className="neo-badge primary font-mono">SECURE GATE</span>
            <h2 style={{ marginTop: 16 }}>VERIFYING SESSION...</h2>
            <p style={{ marginTop: 8, color: "#444" }}>Loading protected content only after authentication passes.</p>
          </div>
        </div>
      </main>
    );
  }

  return <DashboardClient user={user} />;
}
