import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser, logoutAction } from "./actions/auth";
import Link from "next/link";
import { Shield, LogOut, LayoutGrid, LogIn } from "lucide-react";

export const metadata: Metadata = {
  title: "NEOVAULT // Retro Secure Photo Vault",
  description: "A secure neobrutalist photo vault powered by AWS S3, Cognito, KMS, and DynamoDB.",
};

export default async function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <header className="neo-header">
          <div className="neo-header-inner">
            <Link href="/" style={{ display: "inline-block" }}>
              <div className="neo-logo">
                ⚡ NEOVAULT
              </div>
            </Link>

            <nav className="neo-nav">
              {user ? (
                <>
                  <span className="neo-badge primary font-mono" style={{ textTransform: "lowercase" }}>
                    👤 {user.email}
                  </span>
                  
                  <Link href="/dashboard" className="neo-btn accent" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                    <LayoutGrid size={16} /> Vault
                  </Link>
                  
                  <form action={logoutAction} style={{ display: "inline" }}>
                    <button type="submit" className="neo-btn danger" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                      <LogOut size={16} /> Exit
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="neo-btn primary font-mono" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                    <LogIn size={16} /> Log_In
                  </Link>
                  <Link href="/register" className="neo-btn accent font-mono" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                    Register()
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </main>
        
        <footer style={{ 
          borderTop: "3px solid #000000", 
          backgroundColor: "#ffffff", 
          padding: "20px", 
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          fontWeight: "bold",
          marginTop: "auto"
        }}>
          <div>
            NEOVAULT.SYS // AWS KMS S3 ENCRYPTION // COGNITO DIRECT V6 JWT
          </div>
        </footer>
      </body>
    </html>
  );
}
