import { ChildDayViewLive } from "@/components/child/my-day/child-day-view-live";
import { getTodayTemplateWithTasksForProfileV2 } from "@/lib/api/day-view";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import type { TodayTimelineV2Data } from "@/lib/day-templates/types";

function getEmptyTimelineData(): TodayTimelineV2Data {
  return {
    weekday: new Date().getDay(),
    template: null,
    instances: [],
    blocks: [],
    dayContext: {
      period: "ecole",
      periodLabel: "Ecole",
      currentMoment: "matin",
      currentContextLabel: "Temps a la maison",
      isInSchoolBlock: false,
      activeSchoolBlockEndTime: null,
      nextVacationStartDate: null,
      nextVacationLabel: null,
      daysUntilNextVacation: null,
      hasSchoolPeriodsConfigured: false,
    },
    dailyPoints: null,
    rewardTiers: [],
    v2Enabled: false,
    timelineItems: [],
    currentContextItem: null,
    currentActionItem: null,
    nextTimelineItem: null,
    dayBalance: {
      unitMinutes: 15,
      totalPlannedMinutes: 0,
      buckets: [],
      missionLeisureDeltaUnits15: 0,
      comparisonLabel: "presque_pareil",
    },
  };
}

function getFirstName(displayName: string | null | undefined): string {
  if (!displayName) {
    return "Ezra";
  }

  const trimmed = displayName.trim();
  if (!trimmed) {
    return "Ezra";
  }

  return trimmed.split(/\s+/)[0] ?? "Ezra";
}

export default async function ChildMyDayPage(): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  const profileId = context.profile?.id;
  const timelineData = profileId ? await getTodayTemplateWithTasksForProfileV2(profileId) : getEmptyTimelineData();

  return (
    <ChildDayViewLive
      instances={timelineData.instances}
      templateBlocks={timelineData.blocks}
      dayContext={timelineData.dayContext}
      templateName={timelineData.template?.name ?? "Journee type"}
      initialDailyPointsTotal={timelineData.dailyPoints?.pointsTotal ?? 0}
      rewardTiers={timelineData.rewardTiers}
      hasTemplate={Boolean(timelineData.template)}
      childName={getFirstName(context.profile?.display_name)}
      v2Enabled={timelineData.v2Enabled}
      timelineItems={timelineData.timelineItems}
      currentContextItem={timelineData.currentContextItem}
      currentActionItem={timelineData.currentActionItem}
      nextTimelineItem={timelineData.nextTimelineItem}
      dayBalance={timelineData.dayBalance}
    />
  );
}
