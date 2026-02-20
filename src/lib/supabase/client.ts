"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (client) {
    return client;
  }

  const { url, anonKey } = getSupabaseEnv();
  client = createBrowserClient<Database>(url, anonKey);
  return client;
}
