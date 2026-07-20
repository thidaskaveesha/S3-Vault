"use server";

import { cookies } from "next/headers";
import { 
  IS_MOCK_MODE, 
  cognitoClient, 
  COGNITO_CLIENT_ID 
} from "@/lib/aws";
import { 
  SignUpCommand, 
  ConfirmSignUpCommand, 
  InitiateAuthCommand, 
  ForgotPasswordCommand, 
  ConfirmForgotPasswordCommand 
} from "@aws-sdk/client-cognito-identity-provider";
import { 
  readMockDB, 
  writeMockDB, 
  simpleHash 
} from "@/lib/mockDb";
import { signMockToken, verifyToken } from "@/lib/jwt";
import crypto from "crypto";

const COOKIE_NAME = "auth_token";

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: { email: string; sub: string } | null;
}

// 1. Get Logged In User Session (SSR-compatible)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

// 2. Sign Up User (Registration)
export async function signUpAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (existing) {
      return { success: false, message: "User already exists with this email." };
    }

    const sub = crypto.randomUUID();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    db.users.push({
      sub,
      email: email.toLowerCase(),
      passwordHash: simpleHash(password),
      status: "UNCONFIRMED",
      confirmationCode: code,
    });

    writeMockDB(db);

    console.log("\n=======================================================");
    console.log(`🔑 [DEMO MOCK COGNITO] SIGNUP REGISTERED:`);
    console.log(`   Email: ${email}`);
    console.log(`   Sub: ${sub}`);
    console.log(`   Verification Code: ${code}`);
    console.log("=======================================================\n");

    return { 
      success: true, 
      message: `Registration successful! Verification code sent to server logs. (Code is ${code})` 
    };
  } else {
    try {
      const command = new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email }
        ]
      });

      await cognitoClient.send(command);
      return { 
        success: true, 
        message: "Registration successful! Check your email for a verification code." 
      };
    } catch (e: any) {
      console.error("AWS Cognito SignUp Error:", e);
      return { success: false, message: e.message || "Registration failed." };
    }
  }
}

// 3. Confirm Sign Up (Verify Code)
export async function confirmSignUpAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  if (!email || !code) {
    return { success: false, message: "Email and verification code are required." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const index = db.users.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.confirmationCode === code
    );

    if (index === -1) {
      return { success: false, message: "Invalid confirmation code or email." };
    }

    db.users[index].status = "CONFIRMED";
    delete db.users[index].confirmationCode;
    writeMockDB(db);

    console.log(`✅ [DEMO MOCK COGNITO] USER CONFIRMED: ${email}`);

    return { success: true, message: "Account verified successfully! You can now log in." };
  } else {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      });

      await cognitoClient.send(command);
      return { success: true, message: "Account verified successfully! You can now log in." };
    } catch (e: any) {
      console.error("AWS Cognito ConfirmSignUp Error:", e);
      return { success: false, message: e.message || "Verification failed." };
    }
  }
}

// 4. Login User (Sign In)
export async function signInAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, message: "Incorrect email or password." };
    }

    if (user.passwordHash !== simpleHash(password)) {
      return { success: false, message: "Incorrect email or password." };
    }

    if (user.status !== "CONFIRMED") {
      return { success: false, message: "Account is not verified yet. Please verify sign-up first." };
    }

    // Sign a mock token
    const token = await signMockToken({ sub: user.sub, email: user.email });
    
    // Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7200, // 2 hours
      path: "/",
      sameSite: "lax",
    });

    console.log(`🔓 [DEMO MOCK COGNITO] LOGIN SUCCESSFUL: ${email}`);

    return { 
      success: true, 
      message: "Login successful!", 
      user: { email: user.email, sub: user.sub } 
    };
  } else {
    try {
      const command = new InitiateAuthCommand({
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);
      const authResult = response.AuthenticationResult;

      if (!authResult || !authResult.IdToken) {
        return { success: false, message: "Cognito did not return auth tokens." };
      }

      // Set cookie using Cognito ID Token (which contains user email and sub claims)
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, authResult.IdToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: authResult.ExpiresIn || 3600,
        path: "/",
        sameSite: "lax",
      });

      const userSession = await verifyToken(authResult.IdToken);

      console.log(`🔓 [AWS COGNITO] LOGIN SUCCESSFUL: ${email}`);

      return { 
        success: true, 
        message: "Login successful!",
        user: userSession ? { email: userSession.email, sub: userSession.sub } : undefined
      };
    } catch (e: any) {
      console.error("AWS Cognito Login Error:", e);
      return { success: false, message: e.message || "Authentication failed." };
    }
  }
}

// 5. Logout User
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// 6. Forgot Password Request (Sends Reset Code)
export async function forgotPasswordAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, message: "Email is required." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const index = db.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());

    if (index === -1) {
      // Security standard: don't reveal if user exists or not, but for mock demo we will be helpful
      return { success: false, message: "Email address not found in demo database." };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    db.users[index].resetCode = code;
    writeMockDB(db);

    console.log("\n=======================================================");
    console.log(`🔑 [DEMO MOCK COGNITO] PASSWORD RESET INITIATED:`);
    console.log(`   Email: ${email}`);
    console.log(`   Reset Code: ${code}`);
    console.log("=======================================================\n");

    return { 
      success: true, 
      message: `Reset code generated! Open server logs to view code. (Code is ${code})` 
    };
  } else {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
      });

      await cognitoClient.send(command);
      return { 
        success: true, 
        message: "Password reset code sent. Please check your email." 
      };
    } catch (e: any) {
      console.error("AWS Cognito ForgotPassword Error:", e);
      return { success: false, message: e.message || "Failed to initiate password reset." };
    }
  }
}

// 7. Confirm Password Reset (Sets New Password)
export async function confirmForgotPasswordAction(formData: FormData): Promise<AuthResponse> {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!email || !code || !newPassword) {
    return { success: false, message: "Email, reset code, and new password are required." };
  }

  if (IS_MOCK_MODE) {
    const db = readMockDB();
    const index = db.users.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.resetCode === code
    );

    if (index === -1) {
      return { success: false, message: "Invalid reset code or email." };
    }

    db.users[index].passwordHash = simpleHash(newPassword);
    delete db.users[index].resetCode;
    writeMockDB(db);

    console.log(`✅ [DEMO MOCK COGNITO] PASSWORD RESET SUCCESSFUL: ${email}`);

    return { success: true, message: "Password updated successfully. You can now log in." };
  } else {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await cognitoClient.send(command);
      return { success: true, message: "Password updated successfully. You can now log in." };
    } catch (e: any) {
      console.error("AWS Cognito ConfirmForgotPassword Error:", e);
      return { success: false, message: e.message || "Password update failed." };
    }
  }
}
