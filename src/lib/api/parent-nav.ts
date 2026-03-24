import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import { getTodayDateKey } from "@/lib/day-templates/date";
import { addDaysToDateKey } from "@/lib/api/checklists";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ParentNavBadges } from "@/lib/navigation/parent-nav-badges";

export async function getParentNavBadges(): Promise<ParentNavBadges> {
  const context = await getCurrentProfile();
  if (!context.familyId || (context.role !== "parent" && context.role !== "viewer")) {
    return {
      notifications: 0,
      schoolDiary: 0,
      checklists: 0,
      alarms: 0,
    };
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return {
      notifications: 0,
      schoolDiary: 0,
      checklists: 0,
      alarms: 0,
    };
  }

  if (!isSupabaseEnabled()) {
    return {
      notifications: 0,
      schoolDiary: 0,
      checklists: 0,
      alarms: 0,
    };
  }

  const supabase = await createSupabaseServerClient();
  const todayKey = getTodayDateKey();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);

  const [
    { count: notificationsCountRaw },
    { count: schoolDiaryCountRaw },
    { count: alarmsCountRaw },
    { data: checklistInstancesData },
  ] = await Promise.all([
    supabase
      .from("in_app_notifications")
      .select("id", { head: true, count: "exact" })
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .eq("is_read", false),
    supabase
      .from("school_diary_entries")
      .select("id", { head: true, count: "exact" })
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .gte("date", todayKey),
    supabase
      .from("alarm_events")
      .select("id", { head: true, count: "exact" })
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .eq("status", "declenchee"),
    supabase
      .from("checklist_instances")
      .select("id")
      .eq("family_id", context.familyId)
      .eq("child_profile_id", child.id)
      .in("date", [todayKey, tomorrowKey]),
  ]);

  let uncheckedChecklistsCount = 0;
  const checklistInstanceIds = checklistInstancesData?.map((instance) => instance.id) ?? [];
  if (checklistInstanceIds.length > 0) {
    const { count: uncheckedCountRaw } = await supabase
      .from("checklist_instance_items")
      .select("id", { head: true, count: "exact" })
      .in("checklist_instance_id", checklistInstanceIds)
      .eq("is_checked", false);

    uncheckedChecklistsCount = uncheckedCountRaw ?? 0;
  }

  const notificationsCount = notificationsCountRaw ?? 0;
  const schoolDiaryCount = schoolDiaryCountRaw ?? 0;
  const alarmsCount = alarmsCountRaw ?? 0;

  return {
    notifications: notificationsCount,
    schoolDiary: schoolDiaryCount,
    checklists: uncheckedChecklistsCount,
    alarms: alarmsCount,
  };
}
