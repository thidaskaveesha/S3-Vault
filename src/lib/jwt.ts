import * as jose from "jose";
import { IS_MOCK_MODE, AWS_REGION, COGNITO_USER_POOL_ID } from "./aws";

const MOCK_JWT_SECRET = "super-secret-retro-key-1337-neobrutalist-vault-secure-auth-code";
const MOCK_SECRET_BYTES = new TextEncoder().encode(MOCK_JWT_SECRET);

export interface UserSession {
  sub: string;
  email: string;
  isMock: boolean;
}

// Signs a mock JWT token for Demo Mode
export async function signMockToken(payload: { sub: string; email: string }): Promise<string> {
  return await new jose.SignJWT({ ...payload, isMock: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(MOCK_SECRET_BYTES);
}

// Verifies a JWT token (works for both Mock Mode and real Cognito JWKS validation)
export async function verifyToken(token: string): Promise<UserSession | null> {
  if (!token) return null;

  try {
    // 1. Check if token is mock or can be verified locally
    if (IS_MOCK_MODE) {
      const { payload } = await jose.jwtVerify(token, MOCK_SECRET_BYTES);
      return {
        sub: payload.sub as string,
        email: payload.email as string,
        isMock: true,
      };
    } else {
      // 2. Real AWS Mode - Validate against Cognito User Pool JWKS
      const jwksUrl = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
      const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
      
      const issuer = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
      
      const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer,
      });

      return {
        sub: payload.sub as string,
        email: (payload.email as string) || (payload.username as string) || "",
        isMock: false,
      };
    }
  } catch (error) {
    console.error("JWT Verification error:", error);
    return null;
  }
}
