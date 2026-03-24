export type DaySegmentId = "morning" | "noon" | "afternoon" | "home" | "evening";

export interface DaySegmentDefinition {
  id: DaySegmentId;
  label: string;
  startMinutes: number;
  endMinutes: number;
}

const WEEKDAY_SEGMENTS: DaySegmentDefinition[] = [
  { id: "morning", label: "Matin", startMinutes: 0, endMinutes: 11 * 60 + 30 },
  { id: "noon", label: "Midi", startMinutes: 11 * 60 + 30, endMinutes: 13 * 60 + 30 },
  { id: "afternoon", label: "Apres-midi", startMinutes: 13 * 60 + 30, endMinutes: 16 * 60 + 30 },
  { id: "home", label: "Maison", startMinutes: 16 * 60 + 30, endMinutes: 19 * 60 },
  { id: "evening", label: "Soir", startMinutes: 19 * 60, endMinutes: 24 * 60 },
];

const WEEKEND_SEGMENTS: DaySegmentDefinition[] = [
  { id: "morning", label: "Matin", startMinutes: 0, endMinutes: 12 * 60 },
  { id: "afternoon", label: "Apres-midi", startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { id: "evening", label: "Soir", startMinutes: 18 * 60, endMinutes: 24 * 60 },
];

export const CHILD_TIME_BLOCK_IDS: readonly DaySegmentId[] = [
  "morning",
  "noon",
  "afternoon",
  "home",
  "evening",
] as const;

const CHILD_TIME_BLOCK_LABELS: Record<DaySegmentId, string> = {
  morning: "Matin",
  noon: "Midi",
  afternoon: "Apres-midi",
  home: "Maison",
  evening: "Soir",
};

const MINUTES_BY_BLOCK = {
  morningStart: 6 * 60,
  noonStart: 11 * 60 + 30,
  afternoonStart: 13 * 60 + 30,
  homeStart: 16 * 60 + 30,
  eveningStart: 18 * 60 + 30,
} as const;

export function isWeekendDate(date: Date): boolean {
  const dayIndex = date.getDay();
  return dayIndex === 0 || dayIndex === 6;
}

export function getDaySegmentDefinitions(date: Date): DaySegmentDefinition[] {
  return isWeekendDate(date) ? WEEKEND_SEGMENTS : WEEKDAY_SEGMENTS;
}

function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeLabelToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? "0");
  const minutes = Number(match[2] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function getChildTimeBlockForMinutes(minutesInDay: number): DaySegmentId {
  const normalized = ((Math.trunc(minutesInDay) % (24 * 60)) + 24 * 60) % (24 * 60);

  if (normalized < MINUTES_BY_BLOCK.noonStart) {
    return "morning";
  }

  if (normalized < MINUTES_BY_BLOCK.afternoonStart) {
    return "noon";
  }

  if (normalized < MINUTES_BY_BLOCK.homeStart) {
    return "afternoon";
  }

  if (normalized < MINUTES_BY_BLOCK.eveningStart) {
    return "home";
  }

  return "evening";
}

export function getChildTimeBlockLabel(blockId: DaySegmentId): string {
  return CHILD_TIME_BLOCK_LABELS[blockId];
}

export function getChildTimeBlockRecommendationLabel(blockId: DaySegmentId): string {
  if (blockId === "morning") {
    return "A faire le matin";
  }

  if (blockId === "noon") {
    return "A faire ce midi";
  }

  if (blockId === "afternoon") {
    return "A faire cet apres-midi";
  }

  if (blockId === "home") {
    return "A faire en rentrant a la maison";
  }

  return "A faire ce soir";
}

export function getChildTimeBlockForTimeRange(startTime: string, endTime: string): DaySegmentId {
  const startMinutes = parseTimeLabelToMinutes(startTime);
  const endMinutes = parseTimeLabelToMinutes(endTime);
  const safeStart = startMinutes ?? MINUTES_BY_BLOCK.morningStart;
  const safeEnd = endMinutes ?? safeStart;
  const normalizedEnd = safeEnd <= safeStart ? safeEnd + 24 * 60 : safeEnd;
  const midpoint = safeStart + (normalizedEnd - safeStart) / 2;

  return getChildTimeBlockForMinutes(midpoint);
}

export function resolveChildTimeBlockForDay(
  blockId: DaySegmentId,
  availableSegments: DaySegmentId[],
): DaySegmentId {
  if (availableSegments.includes(blockId)) {
    return blockId;
  }

  if ((blockId === "noon" || blockId === "home") && availableSegments.includes("afternoon")) {
    return "afternoon";
  }

  if (blockId === "afternoon" && availableSegments.includes("home")) {
    return "home";
  }

  if (availableSegments.includes("evening")) {
    return "evening";
  }

  return availableSegments[0] ?? "morning";
}

export function getCurrentDaySegmentId(date: Date): DaySegmentId {
  const totalMinutes = toMinutes(date);
  const segments = getDaySegmentDefinitions(date);
  const matchedSegment =
    segments.find(
      (segment) => totalMinutes >= segment.startMinutes && totalMinutes < segment.endMinutes,
    ) ?? segments[segments.length - 1];

  return matchedSegment?.id ?? "evening";
}

export function getDaySegmentState(
  orderedSegmentIds: DaySegmentId[],
  targetSegmentId: DaySegmentId,
  currentSegmentId: DaySegmentId,
): "past" | "current" | "upcoming" {
  const currentIndex = orderedSegmentIds.indexOf(currentSegmentId);
  const targetIndex = orderedSegmentIds.indexOf(targetSegmentId);

  if (currentIndex === -1 || targetIndex === -1) {
    return "upcoming";
  }

  if (targetIndex < currentIndex) {
    return "past";
  }

  if (targetIndex === currentIndex) {
    return "current";
  }

  return "upcoming";
}
