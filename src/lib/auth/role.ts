import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/auth/types";
import type { Database } from "@/types/database";

export async function getProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
