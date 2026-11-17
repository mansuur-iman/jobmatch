import { api } from "./client";
import type { AuthUser } from "../types";

export interface LoginResult {
  token: string;
  user: AuthUser;
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<void> {
  await api.post("/auth/register", { username, email, password });
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const data = await api.post("/auth/login", { email, password });

  const token: string | undefined = data?.token ?? data?.accessToken;
  if (!token) {
    throw new Error(
      `Login response had no token. Got keys: ${Object.keys(data ?? {}).join(", ") || "(empty)"}`,
    );
  }

  // Prefer a user object from the response; fall back to the JWT payload.
  const claims = decodeJwt(token);
  const rawId = data?.user?.id ?? claims.id ?? claims.userId ?? claims.sub;
  if (rawId === undefined || rawId === null) {
    throw new Error(
      "Could not determine the user id from the login response or token",
    );
  }

  return {
    token,
    user: { id: String(rawId), email: data?.user?.email ?? email },
  };
}
