import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signed S3 Vault",
  description: "Static Next.js front end with Lambda-backed AWS flows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="neo-header">
          <div className="neo-header-inner">
            <Link href="/" className="neo-logo">PHOTO VAULT</Link>
            <nav className="neo-nav font-mono">
              <Link href="/login">LOGIN</Link>
              <Link href="/register">REGISTER</Link>
              <Link href="/verify">VERIFY</Link>
              <Link href="/forgot-password">RESET</Link>
              <Link href="/dashboard">DASHBOARD</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
