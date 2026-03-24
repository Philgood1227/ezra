import { ChildDayTimelineView } from "@/components/child/my-day/child-day-timeline-view";
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

export default async function ChildMyDayTimelinePage(): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  const profileId = context.profile?.id;
  const timelineData = profileId
    ? await getTodayTemplateWithTasksForProfileV2(profileId)
    : getEmptyTimelineData();

  return (
    <ChildDayTimelineView
      instances={timelineData.instances}
      templateBlocks={timelineData.blocks}
      dayContext={timelineData.dayContext}
      templateName={timelineData.template?.name ?? "Journee type"}
      hasTemplate={Boolean(timelineData.template)}
      childName={context.profile?.display_name ?? "Ezra"}
      v2Enabled={timelineData.v2Enabled}
      timelineItems={timelineData.timelineItems}
      currentActionItem={timelineData.currentActionItem}
    />
  );
}
