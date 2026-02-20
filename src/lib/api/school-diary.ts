import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import { listDemoSchoolDiaryEntries } from "@/lib/demo/school-diary-store";
import type { SchoolDiaryEntrySummary } from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SchoolDiaryRow = Database["public"]["Tables"]["school_diary_entries"]["Row"];

function mapSchoolDiaryRow(row: SchoolDiaryRow): SchoolDiaryEntrySummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    type: row.type,
    subject: row.subject,
    title: row.title,
    description: row.description,
    date: row.date,
    recurrencePattern: row.recurrence_pattern ?? "none",
    recurrenceUntilDate: row.recurrence_until_date ?? null,
    recurrenceGroupId: row.recurrence_group_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SchoolDiaryPageData {
  child: ChildProfileRef | null;
  entries: SchoolDiaryEntrySummary[];
}

export async function getSchoolDiaryPageData(): Promise<SchoolDiaryPageData> {
  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return { child: null, entries: [] };
  }

  const entries = await getSchoolDiaryEntriesForChild(child.id);
  return { child, entries };
}

export async function getSchoolDiaryEntriesForChild(
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): Promise<SchoolDiaryEntrySummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    const all = listDemoSchoolDiaryEntries(context.familyId, childProfileId);
    return all.filter((entry) => {
      if (options?.fromDate && entry.date < options.fromDate) {
        return false;
      }
      if (options?.toDate && entry.date > options.toDate) {
        return false;
      }
      return true;
    });
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("school_diary_entries")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: false });

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

  return data.map((row) => mapSchoolDiaryRow(row as SchoolDiaryRow));
}
