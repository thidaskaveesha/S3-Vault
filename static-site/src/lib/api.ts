export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type UserSession = {
  sub: string;
  email: string;
};

export type PhotoItem = {
  fileId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  uploadedAt: string;
  downloadUrl?: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  user?: UserSession | null;
  token?: string;
  url?: string;
  fileId?: string;
  s3Key?: string;
  photos?: PhotoItem[];
  data?: T;
};

export function getStoredToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("vault_token") ?? "";
}

export function setStoredToken(token: string) {
  window.localStorage.setItem("vault_token", token);
}

export function clearStoredToken() {
  window.localStorage.removeItem("vault_token");
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, includeAuth = true): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set.");
  }

  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await readJson(response)) as ApiResponse<T>;

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed with ${response.status}`);
  }

  return payload;
}

export async function login(email: string, password: string) {
  const result = await apiFetch<{ token: string; user: UserSession }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );

  if (!result.token) {
    throw new Error("Login did not return a token.");
  }

  setStoredToken(result.token);
  return result;
}

export async function register(email: string, password: string) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
}

export async function confirmRegister(email: string, code: string) {
  return apiFetch("/auth/confirm-signup", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  }, false);
}

export async function requestPasswordReset(email: string) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  }, false);
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string) {
  return apiFetch("/auth/confirm-forgot-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  }, false);
}

export async function me() {
  const result = await apiFetch<{ user: UserSession }>("/auth/me", { method: "GET" });
  return result.user ?? null;
}

export async function getUploadUrl(fileName: string, fileType: string, fileSize: number) {
  return apiFetch<{ url: string; fileId: string; s3Key: string }>(
    "/vault/upload-url",
    {
      method: "POST",
      body: JSON.stringify({ fileName, fileType, fileSize }),
    },
  );
}

export async function savePhotoMetadata(fileId: string, fileName: string, fileType: string, fileSize: number, s3Key: string) {
  return apiFetch("/vault/photos", {
    method: "POST",
    body: JSON.stringify({ fileId, fileName, fileType, fileSize, s3Key }),
  });
}

export async function listPhotos() {
  const result = await apiFetch<{ photos: PhotoItem[] }>("/vault/photos", { method: "GET" });
  return result.photos ?? [];
}

export async function deletePhoto(fileId: string) {
  return apiFetch(`/vault/photos/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
}
