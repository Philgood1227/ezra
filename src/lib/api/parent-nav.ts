import { getParentAlarmPageData } from "@/lib/api/alarms";
import { getUncheckedChecklistCountForCurrentChild } from "@/lib/api/checklists";
import { getUnreadInAppNotificationsCountForCurrentChild } from "@/lib/api/notifications";
import { getSchoolDiaryPageData } from "@/lib/api/school-diary";
import { getTodayDateKey } from "@/lib/day-templates/date";
import type { ParentNavBadges } from "@/lib/navigation/parent-nav-badges";

export async function getParentNavBadges(): Promise<ParentNavBadges> {
  const [notificationsCount, schoolDiaryData, uncheckedChecklistsCount, alarmsData] = await Promise.all([
    getUnreadInAppNotificationsCountForCurrentChild(),
    getSchoolDiaryPageData(),
    getUncheckedChecklistCountForCurrentChild(),
    getParentAlarmPageData(),
  ]);

  const todayKey = getTodayDateKey();
  const schoolDiaryCount = schoolDiaryData.entries.filter((entry) => entry.date >= todayKey).length;
  const alarmsCount = alarmsData.events.filter((event) => event.status === "declenchee").length;

  return {
    notifications: notificationsCount,
    schoolDiary: schoolDiaryCount,
    checklists: uncheckedChecklistsCount,
    alarms: alarmsCount,
  };
}
