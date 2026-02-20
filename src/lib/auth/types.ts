import type { Database } from "@/types/database";

export type AppRole = Database["public"]["Enums"]["profile_role"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface ResolvedAuthContext {
  role: AppRole | "anonymous";
  profile: ProfileRow | null;
  familyId: string | null;
  source: "supabase" | "child-pin" | "dev-parent-cookie" | "none";
}
