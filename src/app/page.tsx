import Link from "next/link";
import { getCurrentUser } from "./actions/auth";
import { 
  IS_MOCK_MODE, 
  AWS_REGION, 
  S3_BUCKET_NAME, 
  DYNAMODB_TABLE_NAME, 
  COGNITO_USER_POOL_ID,
  KMS_KEY_ARN
} from "@/lib/aws";
import { Shield, Key, Eye, CloudLightning, HelpCircle, HardDrive } from "lucide-react";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="neo-container" style={{ padding: "40px 20px" }}>
      {/* Hero Section */}
      <section style={{ marginBottom: "60px", textAlign: "center" }}>
        <span className="neo-badge primary font-mono" style={{ marginBottom: "16px", fontSize: "0.9rem", transform: "rotate(-1deg)" }}>
          ⚡ CLOUD SECURED DATA SHELTER
        </span>
        <h1 style={{ fontSize: "3.5rem", WebkitTextStroke: "1px #000", letterSpacing: "-0.04em", margin: "16px 0 24px 0" }}>
          THE ULTRALIGHT <br />
          <span style={{ backgroundColor: "var(--color-primary)", padding: "0 10px", border: "3px solid #000", display: "inline-block", transform: "rotate(1deg)", boxShadow: "3px 3px 0px 0px #000" }}>
            PHOTO VAULT
          </span>
        </h1>
        <p style={{ fontSize: "1.25rem", maxWidth: "700px", margin: "0 auto 30px auto", fontWeight: 500, lineHeight: 1.4 }}>
          A secure, high-speed media vault utilizing AWS Cognito for absolute identity verification, S3 Private Buckets with Customer KMS Encryption, and DynamoDB metadata logs.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          {user ? (
            <Link href="/dashboard" className="neo-btn primary animate-subtle" style={{ fontSize: "1.1rem", padding: "16px 32px" }}>
              ENTER PHOTO VAULT 🗄️
            </Link>
          ) : (
            <>
              <Link href="/login" className="neo-btn primary font-mono" style={{ fontSize: "1.1rem", padding: "14px 28px" }}>
                LOG_IN.COM
              </Link>
              <Link href="/register" className="neo-btn accent font-mono" style={{ fontSize: "1.1rem", padding: "14px 28px" }}>
                REGISTER_USER()
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Grid of details */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
        gap: "24px", 
        marginBottom: "60px" 
      }}>
        <div className="neo-box hoverable">
          <div className="neo-badge purple" style={{ marginBottom: "12px" }}>IDENTITY</div>
          <h3 style={{ fontSize: "1.4rem" }}>Amazon Cognito Auth</h3>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.4 }}>
            Accounts are managed directly inside AWS Cognito User Pools. Cryptographically signed JWT tokens are stored in secure HTTP-only cookies, preventing token theft and cross-site scripting vulnerabilities.
          </p>
        </div>

        <div className="neo-box hoverable">
          <div className="neo-badge secondary" style={{ marginBottom: "12px" }}>ENCRYPTION</div>
          <h3 style={{ fontSize: "1.4rem" }}>AWS KMS Data Armor</h3>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.4 }}>
            Every image is encrypted in transit and at rest inside S3. Uploads invoke symmetric Key Management Service (KMS) master keys to encrypt your files prior to physical disk storage. S3 buckets are strictly private.
          </p>
        </div>

        <div className="neo-box hoverable">
          <div className="neo-badge accent" style={{ marginBottom: "12px" }}>ISOLATION</div>
          <h3 style={{ fontSize: "1.4rem" }}>Cryptographic Signed URLs</h3>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.4 }}>
            Files are never direct-linked. When you request a photo, a temporary cryptographic signature is generated for your unique sub ID. Links auto-expires in 15 mins. No user can access files uploaded by others.
          </p>
        </div>
      </div>

      {/* System info window */}
      <div className="neo-window" style={{ marginBottom: "60px" }}>
        <div className="neo-window-header" style={{ backgroundColor: "var(--color-secondary)" }}>
          <span>NEOVAULT // SYS_MONITOR.EXE</span>
          <div className="neo-window-dots">
            <div className="neo-window-dot red"></div>
            <div className="neo-window-dot yellow"></div>
            <div className="neo-window-dot green"></div>
          </div>
        </div>
        <div className="neo-window-body font-mono" style={{ backgroundColor: "#1e1e1e", color: "#3ad384", padding: "20px", fontSize: "0.85rem", overflowX: "auto" }}>
          <div>[INFO] BOOTING SECURE VAULT ENVIRONMENT...</div>
          <div>[INFO] RESOLVING ENV PROPERTIES...</div>
          <div style={{ color: "#ffffff", marginTop: "10px" }}>------------------------------------------------------------</div>
          <div>AWS_REGION: <span style={{ color: "#f6d142" }}>{AWS_REGION || "NOT SET"}</span></div>
          <div>S3_BUCKET: <span style={{ color: "#f6d142" }}>{S3_BUCKET_NAME || "NOT CONFIG (MOCK)"}</span></div>
          <div>DYNAMO_TABLE: <span style={{ color: "#f6d142" }}>{DYNAMODB_TABLE_NAME || "NOT CONFIG (MOCK)"}</span></div>
          <div>COGNITO_USER_POOL_ID: <span style={{ color: "#f6d142" }}>{COGNITO_USER_POOL_ID || "NOT CONFIG (MOCK)"}</span></div>
          <div>CUSTOM_KMS_KEY_ARN: <span style={{ color: "#f6d142" }}>{KMS_KEY_ARN ? "CONFIGURED ✓" : "DEFAULT AWS/S3 KEY ✓"}</span></div>
          <div>STATUS: <span style={{ color: IS_MOCK_MODE ? "#ff5e36" : "#27c93f", fontWeight: "bold" }}>{IS_MOCK_MODE ? "MOCK DEMO RUNTIME" : "SECURED CLOUD RUNTIME"}</span></div>
          <div style={{ color: "#ffffff" }}>------------------------------------------------------------</div>
          {IS_MOCK_MODE ? (
            <div style={{ color: "#ff8b8b", marginTop: "10px" }}>
              ⚠️ WARNING: Operating in LOCAL DEMO MOCK mode. Account creation, code checks, and S3 file streaming will be emulated locally using temp directory files. Hook up real credentials in .env to connect AWS cloud.
            </div>
          ) : (
            <div style={{ color: "#3ad384", marginTop: "10px" }}>
              ✅ SYSTEM ONLINE: Cloud connections authorized. Live S3 signed-url and Cognito workflows deployed.
            </div>
          )}
        </div>
      </div>

      {/* Architecture diagram Section */}
      <section className="neo-box" style={{ padding: "40px" }}>
        <h2 style={{ fontSize: "2rem", WebkitTextStroke: "0.5px #000", marginBottom: "20px" }}>
          🛡️ SECURE ISOLATION BLUEPRINT
        </h2>
        <p style={{ marginBottom: "30px", fontSize: "1rem" }}>
          We enforce user photo isolation from top to bottom. Because credentials are not shared with the clients, data leaks are completely blocked:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div className="neo-badge primary font-mono" style={{ padding: "8px 12px", width: "40px", textAlign: "center" }}>1</div>
            <div>
              <h4 style={{ fontWeight: 700 }}>Dual Identity Lock</h4>
              <p style={{ fontSize: "0.9rem", color: "#444" }}>
                Every backend request decrypts the secure Cognito JWT to check the user sub-identity. No user parameters can be altered or spoofed.
              </p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div className="neo-badge accent font-mono" style={{ padding: "8px 12px", width: "40px", textAlign: "center" }}>2</div>
            <div>
              <h4 style={{ fontWeight: 700 }}>Granular Partition Queries</h4>
              <p style={{ fontSize: "0.9rem", color: "#444" }}>
                DynamoDB is queried using `userId = :userId` partition condition. Users are physically prevented from reading database rows belonging to other sub-keys.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div className="neo-badge purple" style={{ padding: "8px 12px", width: "40px", textAlign: "center", fontFamily: "var(--font-mono)" }}>3</div>
            <div>
              <h4 style={{ fontWeight: 700 }}>Encrypted S3 Private Direct Link</h4>
              <p style={{ fontSize: "0.9rem", color: "#444" }}>
                Images are uploaded strictly into `vault/&#123;userId&#125;/&#123;fileId&#125;-&#123;fileName&#125;`. S3 IAM policies restrict access, and the KMS encryption key automatically secures the payloads. Only owners generate short-lived credentials to access their files.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
