const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function isAuthBypassEnabled(): boolean {
  return process.env.E2E_MOCK_AUTH === "true" || process.env.EZRA_DEV_AUTH_BYPASS === "true";
}

export function hasSupabaseEnv(): boolean {
  return isNonEmpty(SUPABASE_URL) && isNonEmpty(SUPABASE_ANON_KEY);
}

export function isSupabaseEnabled(): boolean {
  return hasSupabaseEnv() && !isAuthBypassEnabled();
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Missing Supabase environment variables. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url: SUPABASE_URL!,
    anonKey: SUPABASE_ANON_KEY!,
  };
}

export function getSupabaseServiceRoleKey(): string {
  if (!isNonEmpty(SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  return SUPABASE_SERVICE_ROLE_KEY;
}
