import { timeToMinutes } from "@/lib/day-templates/time";
import type {
  DayBalanceBucketKind,
  DayBalanceBucketSummary,
  DayBalanceSummary,
  DayTimelineItemSummary,
} from "@/lib/day-templates/types";

const BALANCE_UNIT_MINUTES = 15 as const;

function getDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Math.max(0, end - start);
}

export function toUnits15(minutes: number): number {
  const safeMinutes = Math.max(0, Math.trunc(minutes));
  if (safeMinutes === 0) {
    return 0;
  }

  return Math.max(1, Math.round(safeMinutes / BALANCE_UNIT_MINUTES));
}

function getBucketLabel(kind: DayBalanceBucketKind): string {
  if (kind === "school") {
    return "Ecole";
  }

  if (kind === "activities") {
    return "Activites";
  }

  if (kind === "missions") {
    return "Missions";
  }

  return "Loisirs";
}

function buildBucket(kind: DayBalanceBucketKind, minutesPlanned: number): DayBalanceBucketSummary {
  const safeMinutes = Math.max(0, Math.trunc(minutesPlanned));
  return {
    kind,
    label: getBucketLabel(kind),
    minutesPlanned: safeMinutes,
    units15Planned: toUnits15(safeMinutes),
  };
}

export function computeMissionLeisureComparisonLabel(
  missionUnits15: number,
  leisureUnits15: number,
): DayBalanceSummary["comparisonLabel"] {
  const delta = missionUnits15 - leisureUnits15;
  const absDelta = Math.abs(delta);

  if (absDelta <= 1) {
    return "presque_pareil";
  }

  if (absDelta <= 3) {
    return delta > 0 ? "un_peu_plus_missions" : "un_peu_plus_loisirs";
  }

  return "ecart_important";
}

export function computeDayBalanceFromTimelineItems(items: DayTimelineItemSummary[]): DayBalanceSummary {
  const schoolMinutes = items
    .filter((item) => item.kind === "context" && item.subkind === "school")
    .reduce((sum, item) => sum + getDurationMinutes(item.startTime, item.endTime), 0);
  const activitiesMinutes = items
    .filter((item) => item.kind === "activity")
    .reduce((sum, item) => sum + getDurationMinutes(item.startTime, item.endTime), 0);
  const missionsMinutes = items
    .filter((item) => item.kind === "mission")
    .reduce((sum, item) => sum + getDurationMinutes(item.startTime, item.endTime), 0);
  const leisureMinutes = items
    .filter((item) => item.kind === "leisure")
    .reduce((sum, item) => sum + getDurationMinutes(item.startTime, item.endTime), 0);

  const schoolBucket = buildBucket("school", schoolMinutes);
  const activitiesBucket = buildBucket("activities", activitiesMinutes);
  const missionsBucket = buildBucket("missions", missionsMinutes);
  const leisureBucket = buildBucket("leisure", leisureMinutes);
  const buckets: DayBalanceBucketSummary[] = [schoolBucket, activitiesBucket, missionsBucket, leisureBucket];

  const missionLeisureDeltaUnits15 = missionsBucket.units15Planned - leisureBucket.units15Planned;

  return {
    unitMinutes: BALANCE_UNIT_MINUTES,
    totalPlannedMinutes: buckets.reduce((sum, bucket) => sum + bucket.minutesPlanned, 0),
    buckets,
    missionLeisureDeltaUnits15,
    comparisonLabel: computeMissionLeisureComparisonLabel(missionsBucket.units15Planned, leisureBucket.units15Planned),
  };
}
