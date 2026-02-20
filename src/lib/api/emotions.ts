import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import { listDemoEmotionLogs } from "@/lib/demo/wellbeing-store";
import type { EmotionLogSummary } from "@/lib/day-templates/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type EmotionLogRow = Database["public"]["Tables"]["emotion_logs"]["Row"];

function mapEmotionLogRow(row: EmotionLogRow): EmotionLogSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    date: row.date,
    moment: row.moment,
    emotion: row.emotion,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shouldUseAdminClientForChildPin(context: Awaited<ReturnType<typeof getCurrentProfile>>, childProfileId: string): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === childProfileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function getEmotionLogsForChild(
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): Promise<EmotionLogSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoEmotionLogs(context.familyId, childProfileId, options);
  }

  const supabase = shouldUseAdminClientForChildPin(context, childProfileId)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  let query = supabase
    .from("emotion_logs")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .order("date", { ascending: false })
    .order("moment", { ascending: true });

  if (options?.fromDate) {
    query = query.gte("date", options.fromDate);
  }

  if (options?.toDate) {
    query = query.lte("date", options.toDate);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((row) => mapEmotionLogRow(row as EmotionLogRow));
}

export interface ChildEmotionPageData {
  child: ChildProfileRef | null;
  todayDate: string;
  todayLogs: EmotionLogSummary[];
  morningDone: boolean;
  eveningDone: boolean;
}

export async function getChildEmotionPageData(): Promise<ChildEmotionPageData> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  const todayDate = toDateKey(new Date());

  if (!child) {
    return {
      child: null,
      todayDate,
      todayLogs: [],
      morningDone: false,
      eveningDone: false,
    };
  }

  const todayLogs = await getEmotionLogsForChild(child.id, { fromDate: todayDate, toDate: todayDate });

  return {
    child,
    todayDate,
    todayLogs,
    morningDone: todayLogs.some((log) => log.moment === "matin"),
    eveningDone: todayLogs.some((log) => log.moment === "soir"),
  };
}
