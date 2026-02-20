import { createHmac, timingSafeEqual } from "node:crypto";
import { CHILD_SESSION_COOKIE, CHILD_SESSION_TTL_SECONDS } from "@/lib/auth/constants";

interface ChildSessionPayload {
  profileId: string;
  familyId: string;
  displayName: string;
  role: "child";
  exp: number;
}

function getChildSessionSecret(): string {
  const fromEnv = process.env.CHILD_SESSION_SECRET;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing CHILD_SESSION_SECRET in production.");
  }

  return "ezra-dev-child-session-secret";
}

function sign(value: string): string {
  return createHmac("sha256", getChildSessionSecret()).update(value).digest("base64url");
}

export function createChildSessionToken(input: Omit<ChildSessionPayload, "exp">): string {
  const payload: ChildSessionPayload = {
    ...input,
    exp: Date.now() + CHILD_SESSION_TTL_SECONDS * 1000,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function parseChildSessionToken(token: string): ChildSessionPayload | null {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadBase64);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8"),
    ) as ChildSessionPayload;
    if (parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getChildSessionCookieOptions() {
  return {
    name: CHILD_SESSION_COOKIE,
    maxAge: CHILD_SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
