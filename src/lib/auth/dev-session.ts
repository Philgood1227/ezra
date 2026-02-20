import { DEV_PARENT_SESSION_COOKIE } from "@/lib/auth/constants";

const DEV_PARENT_SESSION_VALUE = "parent-dev-session";

export function getDevParentSessionCookie() {
  return {
    name: DEV_PARENT_SESSION_COOKIE,
    value: DEV_PARENT_SESSION_VALUE,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export function isDevParentSession(value: string | undefined): boolean {
  return value === DEV_PARENT_SESSION_VALUE;
}
