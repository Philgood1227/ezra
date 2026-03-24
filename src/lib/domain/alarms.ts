import type { AlarmMode, AlarmRuleInput, AlarmRuleKind, AlarmRuleSummary } from "@/lib/day-templates/types";

export const TIME_TIMER_RULE_PREFIX = "__TT__:";

export function encodeAlarmRuleLabelByKind(label: string, ruleKind: AlarmRuleKind): string {
  const trimmed = label.trim();
  if (ruleKind === "time_timer") {
    const normalized = trimmed.startsWith(TIME_TIMER_RULE_PREFIX)
      ? trimmed.slice(TIME_TIMER_RULE_PREFIX.length)
      : trimmed;
    return `${TIME_TIMER_RULE_PREFIX}${normalized}`;
  }

  return trimmed.startsWith(TIME_TIMER_RULE_PREFIX)
    ? trimmed.slice(TIME_TIMER_RULE_PREFIX.length)
    : trimmed;
}

export function parseAlarmRuleKindFromLabel(label: string): AlarmRuleKind {
  return label.startsWith(TIME_TIMER_RULE_PREFIX) ? "time_timer" : "alarm";
}

export function decodeAlarmRuleLabel(label: string): string {
  return label.startsWith(TIME_TIMER_RULE_PREFIX)
    ? label.slice(TIME_TIMER_RULE_PREFIX.length)
    : label;
}

export function isAlarmRuleOfKind(rule: Pick<AlarmRuleSummary, "ruleKind">, kind: AlarmRuleKind): boolean {
  return rule.ruleKind === kind;
}

export const MONDAY_BIT = 1 << 0;
export const TUESDAY_BIT = 1 << 1;
export const WEDNESDAY_BIT = 1 << 2;
export const THURSDAY_BIT = 1 << 3;
export const FRIDAY_BIT = 1 << 4;
export const SATURDAY_BIT = 1 << 5;
export const SUNDAY_BIT = 1 << 6;

export const WORKWEEK_DAYS_MASK =
  MONDAY_BIT | TUESDAY_BIT | WEDNESDAY_BIT | THURSDAY_BIT | FRIDAY_BIT;
export const FULL_WEEK_DAYS_MASK = WORKWEEK_DAYS_MASK | SATURDAY_BIT | SUNDAY_BIT;

export const ALARM_DAY_OPTIONS: Array<{
  bit: number;
  shortLabel: string;
  longLabel: string;
}> = [
  { bit: MONDAY_BIT, shortLabel: "Lun", longLabel: "Lundi" },
  { bit: TUESDAY_BIT, shortLabel: "Mar", longLabel: "Mardi" },
  { bit: WEDNESDAY_BIT, shortLabel: "Mer", longLabel: "Mercredi" },
  { bit: THURSDAY_BIT, shortLabel: "Jeu", longLabel: "Jeudi" },
  { bit: FRIDAY_BIT, shortLabel: "Ven", longLabel: "Vendredi" },
  { bit: SATURDAY_BIT, shortLabel: "Sam", longLabel: "Samedi" },
  { bit: SUNDAY_BIT, shortLabel: "Dim", longLabel: "Dimanche" },
];

export const ALARM_SOUND_OPTIONS = [
  { key: "cloche_douce", label: "Cloche douce" },
  { key: "cloche_rapide", label: "Cloche rapide" },
  { key: "carillon", label: "Carillon" },
  { key: "tonalite_spatiale", label: "Tonalite spatiale" },
] as const;

type AlarmSoundOption = (typeof ALARM_SOUND_OPTIONS)[number];
export type AlarmSoundKey = AlarmSoundOption["key"];

export interface AlarmRuleScheduleLike {
  mode: AlarmMode;
  oneShotAt: string | null;
  timeOfDay: string | null;
  daysMask: number;
  enabled: boolean;
}

interface ParsedTimeOfDay {
  hour: number;
  minute: number;
  second: number;
}

function parseTimeOfDay(value: string): ParsedTimeOfDay | null {
  const parts = value.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  const second = Number(parts[2] ?? "0");

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return { hour, minute, second };
}

export function sanitizeDaysMask(mask: number): number {
  if (!Number.isFinite(mask)) {
    return 0;
  }

  const normalized = Math.max(0, Math.min(127, Math.trunc(mask)));
  return normalized;
}

export function getModeDaysMask(mode: AlarmMode, customMask: number): number {
  if (mode === "semaine_travail") {
    return WORKWEEK_DAYS_MASK;
  }
  if (mode === "semaine_complete") {
    return FULL_WEEK_DAYS_MASK;
  }
  if (mode === "personnalise") {
    return sanitizeDaysMask(customMask);
  }

  return 0;
}

export function getDefaultAlarmInput(): AlarmRuleInput {
  return {
    ruleKind: "alarm",
    label: "",
    mode: "semaine_travail",
    oneShotAt: null,
    timeOfDay: "07:30",
    daysMask: WORKWEEK_DAYS_MASK,
    soundKey: "cloche_douce",
    message: "C'est l'heure.",
    enabled: true,
  };
}

function getDayBitFromDateInTimezoneOffset(utcDate: Date, timezoneOffsetMinutes: number): number {
  const localDate = new Date(utcDate.getTime() - timezoneOffsetMinutes * 60_000);
  const day = localDate.getDay();
  if (day === 0) {
    return SUNDAY_BIT;
  }
  return 1 << (day - 1);
}

function buildUtcDateAtLocalTime(input: {
  utcReference: Date;
  timezoneOffsetMinutes: number;
  hour: number;
  minute: number;
  second: number;
  dayOffset: number;
}): Date {
  const localRef = new Date(input.utcReference.getTime() - input.timezoneOffsetMinutes * 60_000);
  const localMidnightUtcMillis = Date.UTC(
    localRef.getUTCFullYear(),
    localRef.getUTCMonth(),
    localRef.getUTCDate() + input.dayOffset,
    0,
    0,
    0,
    0,
  );
  const localDueUtcMillis =
    localMidnightUtcMillis + (input.hour * 3600 + input.minute * 60 + input.second) * 1000;
  return new Date(localDueUtcMillis + input.timezoneOffsetMinutes * 60_000);
}

export function getNextDueAtIsoForRule(input: {
  rule: AlarmRuleScheduleLike;
  nowIso: string;
  timezoneOffsetMinutes: number;
  maxDaysAhead?: number;
}): string | null {
  if (!input.rule.enabled) {
    return null;
  }

  const now = new Date(input.nowIso);
  if (Number.isNaN(now.getTime())) {
    return null;
  }

  if (input.rule.mode === "ponctuelle") {
    if (!input.rule.oneShotAt) {
      return null;
    }
    const oneShot = new Date(input.rule.oneShotAt);
    if (Number.isNaN(oneShot.getTime()) || oneShot.getTime() < now.getTime()) {
      return null;
    }
    return oneShot.toISOString();
  }

  if (!input.rule.timeOfDay) {
    return null;
  }
  const parsedTime = parseTimeOfDay(input.rule.timeOfDay);
  if (!parsedTime) {
    return null;
  }

  const maxDays = Math.max(1, Math.trunc(input.maxDaysAhead ?? 14));
  const mask = getModeDaysMask(input.rule.mode, input.rule.daysMask);

  for (let dayOffset = 0; dayOffset <= maxDays; dayOffset += 1) {
    const candidate = buildUtcDateAtLocalTime({
      utcReference: now,
      timezoneOffsetMinutes: input.timezoneOffsetMinutes,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: parsedTime.second,
      dayOffset,
    });
    const dayBit = getDayBitFromDateInTimezoneOffset(candidate, input.timezoneOffsetMinutes);
    if ((mask & dayBit) === 0) {
      continue;
    }
    if (candidate.getTime() >= now.getTime()) {
      return candidate.toISOString();
    }
  }

  return null;
}

export function describeAlarmMode(mode: AlarmMode): string {
  switch (mode) {
    case "ponctuelle":
      return "Ponctuelle";
    case "semaine_travail":
      return "Semaine de travail";
    case "semaine_complete":
      return "Semaine complete";
    case "personnalise":
      return "Personnalise";
    default:
      return "Inconnu";
  }
}

export function formatDaysMask(mask: number): string {
  const sanitized = sanitizeDaysMask(mask);
  const labels = ALARM_DAY_OPTIONS.filter((day) => (sanitized & day.bit) !== 0).map(
    (day) => day.shortLabel,
  );
  return labels.join(", ");
}

function getDayBitFromLocalDate(localDate: Date): number {
  const day = localDate.getDay();
  if (day === 0) {
    return SUNDAY_BIT;
  }
  return 1 << (day - 1);
}

function toLocalDateFromUtc(utcDate: Date, timezoneOffsetMinutes: number): Date {
  return new Date(utcDate.getTime() - timezoneOffsetMinutes * 60_000);
}

function buildUtcDateFromLocalDateAndTime(input: {
  localDate: Date;
  parsedTime: ParsedTimeOfDay;
  timezoneOffsetMinutes: number;
}): Date {
  const localYear = input.localDate.getUTCFullYear();
  const localMonth = input.localDate.getUTCMonth();
  const localDay = input.localDate.getUTCDate();

  const utcMillis =
    Date.UTC(
      localYear,
      localMonth,
      localDay,
      input.parsedTime.hour,
      input.parsedTime.minute,
      input.parsedTime.second,
      0,
    ) +
    input.timezoneOffsetMinutes * 60_000;

  return new Date(utcMillis);
}

export function getDueAtIsoForRuleNow(input: {
  rule: AlarmRuleScheduleLike;
  nowIso: string;
  timezoneOffsetMinutes: number;
  toleranceMinutes?: number;
}): string | null {
  const now = new Date(input.nowIso);
  if (Number.isNaN(now.getTime()) || !input.rule.enabled) {
    return null;
  }

  const toleranceMinutes = Math.max(1, Math.trunc(input.toleranceMinutes ?? 2));
  const toleranceMs = toleranceMinutes * 60_000;

  if (input.rule.mode === "ponctuelle") {
    if (!input.rule.oneShotAt) {
      return null;
    }

    const dueAt = new Date(input.rule.oneShotAt);
    if (Number.isNaN(dueAt.getTime())) {
      return null;
    }

    const diffMs = now.getTime() - dueAt.getTime();
    if (diffMs < 0 || diffMs > toleranceMs) {
      return null;
    }

    return dueAt.toISOString();
  }

  if (!input.rule.timeOfDay) {
    return null;
  }

  const parsedTime = parseTimeOfDay(input.rule.timeOfDay);
  if (!parsedTime) {
    return null;
  }

  const effectiveMask = getModeDaysMask(input.rule.mode, input.rule.daysMask);
  const localNow = toLocalDateFromUtc(now, input.timezoneOffsetMinutes);
  const currentDayBit = getDayBitFromLocalDate(localNow);

  if ((effectiveMask & currentDayBit) === 0) {
    return null;
  }

  const dueAt = buildUtcDateFromLocalDateAndTime({
    localDate: localNow,
    parsedTime,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
  });
  const diffMs = now.getTime() - dueAt.getTime();

  if (diffMs < 0 || diffMs > toleranceMs) {
    return null;
  }

  return dueAt.toISOString();
}

export function isAlarmSoundKey(value: string): value is AlarmSoundKey {
  return ALARM_SOUND_OPTIONS.some((sound) => sound.key === value);
}
