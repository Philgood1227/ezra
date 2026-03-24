"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { splitMissionInstructionsHtml } from "@/lib/day-templates/instructions";
import { cn } from "@/lib/utils";
import { resolveMissionCategory, type MissionCategory } from "./mission-category";
import type { MissionUI } from "./types";
import { useMissionsToday } from "./useMissionsToday";

interface MissionsSummaryCardProps {
  missions: MissionUI[];
  className?: string;
}

interface CategoryTheme {
  label: string;
  emoji: string;
  cardBorderClass: string;
  cardBgClass: string;
  summaryRowClass: string;
  summaryIconClass: string;
  summaryProgressClass: string;
  pillClass: string;
  accentClass: string;
  drawerBorderClass: string;
  drawerBgClass: string;
  drawerProgressClass: string;
}

interface CategorySummary {
  category: MissionCategory;
  theme: CategoryTheme;
  missions: MissionUI[];
  total: number;
  completed: number;
  totalStars: number;
  totalMinutes: number;
}

interface ChecklistStep {
  id: string;
  label: string;
  done: boolean;
}

type TimerMode = "none" | "time_timer" | "pomodoro";

const STAR_TARGET = 3;
const CATEGORY_ORDER: MissionCategory[] = ["homework", "revision", "training"];

const CATEGORY_THEMES: Record<MissionCategory, CategoryTheme> = {
  homework: {
    label: "Devoirs",
    emoji: "\u{1F4DA}",
    cardBorderClass: "border-indigo-200",
    cardBgClass: "from-indigo-50 to-white",
    summaryRowClass: "bg-indigo-50 border-indigo-200",
    summaryIconClass: "text-indigo-700",
    summaryProgressClass: "bg-indigo-400",
    pillClass: "border-indigo-200 bg-indigo-100 text-indigo-700",
    accentClass: "text-indigo-700",
    drawerBorderClass: "border-indigo-200",
    drawerBgClass: "from-white to-indigo-50",
    drawerProgressClass: "mission-list-drawer-progress-fill--indigo",
  },
  revision: {
    label: "Révisions",
    emoji: "\u{1F9E0}",
    cardBorderClass: "border-violet-200",
    cardBgClass: "from-violet-50 to-white",
    summaryRowClass: "bg-purple-50 border-purple-200",
    summaryIconClass: "text-purple-700",
    summaryProgressClass: "bg-purple-400",
    pillClass: "border-violet-200 bg-violet-100 text-violet-700",
    accentClass: "text-violet-700",
    drawerBorderClass: "border-violet-200",
    drawerBgClass: "from-white to-purple-50",
    drawerProgressClass: "mission-list-drawer-progress-fill--purple",
  },
  training: {
    label: "Entraînement",
    emoji: "\u26A1",
    cardBorderClass: "border-emerald-200",
    cardBgClass: "from-emerald-50 to-white",
    summaryRowClass: "bg-emerald-50 border-emerald-200",
    summaryIconClass: "text-emerald-700",
    summaryProgressClass: "bg-emerald-400",
    pillClass: "border-emerald-200 bg-emerald-100 text-emerald-700",
    accentClass: "text-emerald-700",
    drawerBorderClass: "border-emerald-200",
    drawerBgClass: "from-white to-emerald-50",
    drawerProgressClass: "mission-list-drawer-progress-fill--emerald",
  },
};

const SUMMARY_ROW_FONT_STYLE: React.CSSProperties = {
  fontFamily: "\"Segoe UI\", ui-sans-serif, system-ui, sans-serif",
  fontSize: "16px",
  lineHeight: 1.5,
  fontWeight: 500,
  letterSpacing: "normal",
};

function SummaryCategoryIcon({ category, className }: { category: MissionCategory; className?: string }): React.JSX.Element {
  return (
    <span className={cn("inline-flex items-center justify-center text-2xl leading-none", className)} aria-hidden="true">
      {CATEGORY_THEMES[category].emoji}
    </span>
  );
}

function resolveMissionCategoryValue(mission: MissionUI): MissionCategory | null {
  if (mission.missionCategory) {
    return mission.missionCategory;
  }

  return resolveMissionCategory({
    title: mission.title,
    itemSubkind: mission.itemSubkind,
    categoryName: mission.categoryName,
    iconKey: mission.iconKey,
  });
}

function toPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function countStars(input: {
  earnedStars: number;
  totalStars: number;
  completedMissions: number;
  totalMissions: number;
}): number {
  if (input.totalStars > 0) {
    const ratio = input.earnedStars / input.totalStars;
    if (ratio >= 1) return 3;
    if (ratio >= 0.6) return 2;
    if (ratio >= 0.3) return 1;
    return 0;
  }

  if (input.totalMissions <= 0) {
    return 0;
  }

  const ratio = input.completedMissions / input.totalMissions;
  if (ratio >= 1) return 3;
  if (ratio >= 0.6) return 2;
  if (ratio >= 0.3) return 1;
  return 0;
}

function pluralizeCompleted(count: number, total: number): string {
  return `${count} quete${count > 1 ? "s" : ""} terminee${count > 1 ? "s" : ""} sur ${total}`;
}

function formatTaskDuration(minutes: number): string {
  if (minutes <= 0) {
    return "0 min";
  }

  return `${minutes} min`;
}

function parseTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hoursRaw = match[1];
  const minutesRaw = match[2];
  if (!hoursRaw || !minutesRaw) {
    return null;
  }

  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function computeDurationMinutes(startTime: string, endTime: string, fallbackMinutes: number): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) {
    return Math.max(0, fallbackMinutes);
  }

  const diff = end - start;
  if (diff > 0) {
    return diff;
  }

  return Math.max(0, fallbackMinutes);
}

function formatSummaryMinutesValue(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.trunc(totalMinutes));
  if (safeMinutes <= 60) {
    return String(safeMinutes);
  }

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function extractPrimaryInstructionLine(html: string): string | null {
  const lines = parseChecklistLinesFromHtml(html, "p");
  const firstLine = lines[0];
  if (firstLine) {
    return firstLine;
  }

  const listLines = parseChecklistLinesFromHtml(html, "li");
  const firstListLine = listLines[0];
  return firstListLine ?? null;
}

interface DrawerRowTone {
  buttonClass: string;
  numberClass: string;
  pillClass: string;
}

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDrawerRowTone(index: number): DrawerRowTone {
  if (index % 2 === 0) {
    return {
      buttonClass: "bg-indigo-50 border-indigo-200",
      numberClass: "bg-indigo-100 text-indigo-700",
      pillClass: "bg-indigo-100 text-indigo-700",
    };
  }

  return {
    buttonClass: "bg-purple-50 border-purple-200",
    numberClass: "bg-purple-100 text-purple-700",
    pillClass: "bg-purple-100 text-purple-700",
  };
}

function getDrawerMissionEmoji(mission: MissionUI, fallbackEmoji: string): string {
  const subkindLabel = resolveDrawerSubkindLabel(mission);
  const normalizedSubkind = normalizeText(subkindLabel);
  const title = normalizeText(mission.title);
  const combined = `${title} ${normalizedSubkind}`;

  if (/math|fraction|calcul|equation|algeb|geometr|arithm|table de [0-9]+/.test(combined)) {
    return "\u{1F522}";
  }

  if (/francais|francais|conjug|gramm|orthographe|verbe|dict/.test(combined)) {
    return "\u270D\uFE0F";
  }

  if (/lecture|lire|livre|roman/.test(combined)) {
    return "\u{1F4D6}";
  }

  if (/anglais|english/.test(combined)) {
    return "\u{1F1EC}\u{1F1E7}";
  }

  if (/histoire|geo|geographie/.test(combined)) {
    return "\u{1F30D}";
  }

  if (/science|svt|physique|chimie/.test(combined)) {
    return "\u{1F52C}";
  }

  return fallbackEmoji;
}

function resolveDrawerSubkindLabel(mission: MissionUI): string | null {
  const rawSubkind = mission.itemSubkind?.trim();
  return rawSubkind && rawSubkind.length > 0 ? rawSubkind : null;
}

function buildCategorySummaries(missions: MissionUI[]): CategorySummary[] {
  const counters: Record<MissionCategory, CategorySummary> = {
    homework: {
      category: "homework",
      theme: CATEGORY_THEMES.homework,
      missions: [],
      total: 0,
      completed: 0,
      totalStars: 0,
      totalMinutes: 0,
    },
    revision: {
      category: "revision",
      theme: CATEGORY_THEMES.revision,
      missions: [],
      total: 0,
      completed: 0,
      totalStars: 0,
      totalMinutes: 0,
    },
    training: {
      category: "training",
      theme: CATEGORY_THEMES.training,
      missions: [],
      total: 0,
      completed: 0,
      totalStars: 0,
      totalMinutes: 0,
    },
  };

  missions.forEach((mission) => {
    const category = resolveMissionCategoryValue(mission);
    if (!category) {
      return;
    }

    const bucket = counters[category];
    bucket.total += 1;
    bucket.totalStars += Math.max(0, mission.points);
    bucket.totalMinutes += Math.max(0, mission.estimatedMinutes);
    bucket.missions.push(mission);
    if (mission.status === "done") {
      bucket.completed += 1;
    }
  });

  return CATEGORY_ORDER.map((category) => {
    const summary = counters[category];
    return {
      ...summary,
      missions: [...summary.missions].sort((left, right) => {
        if (left.startTime !== right.startTime) {
          return left.startTime.localeCompare(right.startTime);
        }

        return left.title.localeCompare(right.title);
      }),
    };
  }).filter((summary) => summary.total > 0);
}

function parseChecklistLinesFromHtml(
  html: string,
  selector: "li" | "p",
): string[] {
  const normalizedHtml = html.trim();
  if (!normalizedHtml) {
    return [];
  }

  if (typeof DOMParser === "undefined") {
    const regex = selector === "li" ? /<li[^>]*>(.*?)<\/li>/gi : /<p[^>]*>(.*?)<\/p>/gi;
    return [...normalizedHtml.matchAll(regex)]
      .map((match) => String(match[1] ?? ""))
      .map((raw) => raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 0);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(normalizedHtml, "text/html");
  return [...document.body.querySelectorAll(selector)]
    .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter((line) => line.length > 0);
}

function buildChecklistSteps(mission: MissionUI, mainInstructionsHtml: string): ChecklistStep[] {
  if (mission.microSteps.length > 0) {
    return mission.microSteps.map((step, index) => ({
      id: step.id || `${mission.id}-step-${index + 1}`,
      label: step.label.trim(),
      done: step.done,
    }));
  }

  const fromList = parseChecklistLinesFromHtml(mainInstructionsHtml, "li");
  const fromParagraphs = parseChecklistLinesFromHtml(mainInstructionsHtml, "p");
  const chosenSource = fromList.length > 0 ? fromList : fromParagraphs;

  return chosenSource.slice(0, 8).map((label, index) => ({
    id: `${mission.id}-step-${index + 1}`,
    label,
    done: false,
  }));
}

function formatTimerLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TimeTimerRing({
  totalSeconds,
  remainingSeconds,
  centerLabel,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  centerLabel: string;
}): React.JSX.Element {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const offset = circumference * (1 - clampedRatio);

  return (
    <div className="relative">
      <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="18" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#f97316"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 220ms linear" }}
        />
        <text
          x="100"
          y="108"
          textAnchor="middle"
          style={{ fontSize: 36, fontWeight: 800, fill: "rgb(30, 41, 59)" }}
        >
          {formatTimerLabel(remainingSeconds)}
        </text>
        <text x="100" y="130" textAnchor="middle" style={{ fontSize: 13, fill: "rgb(107, 114, 128)" }}>
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}

function TimeTimerPanel({
  durationMinutes,
  onClose,
}: {
  durationMinutes: number;
  onClose: () => void;
}): React.JSX.Element {
  const totalSeconds = Math.max(60, Math.round(durationMinutes * 60));
  const [remainingSeconds, setRemainingSeconds] = React.useState(totalSeconds);
  const [isRunning, setIsRunning] = React.useState(false);

  React.useEffect(() => {
    setRemainingSeconds(totalSeconds);
    setIsRunning(false);
  }, [totalSeconds]);

  React.useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRunning]);

  return (
    <section className="rounded-3xl border-2 border-orange-200 bg-white p-5 shadow-sm" data-testid="time-timer-panel">
      <div className="flex flex-col items-center">
        <header className="mb-4 flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {"\u23F1\uFE0F"}
            </span>
            <div>
              <p className="font-extrabold text-gray-900">Time Timer</p>
              <p className="text-xs text-gray-500">Durée : {durationMinutes} min</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition-all hover:bg-gray-200"
            onClick={onClose}
            aria-label="Fermer le Time Timer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <TimeTimerRing
          totalSeconds={totalSeconds}
          remainingSeconds={remainingSeconds}
          centerLabel={isRunning ? "en cours" : "pause"}
        />

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-gray-100 px-5 py-3 text-base font-semibold text-slate-700 transition-all hover:bg-gray-200"
            onClick={() => {
              setRemainingSeconds(totalSeconds);
              setIsRunning(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Recommencer</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-orange-600"
            onClick={() => setIsRunning((current) => !current)}
          >
            <span aria-hidden="true">{"\u25B6"}</span>
            <span>{isRunning ? "Pause" : "Démarrer"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

interface PomodoroState {
  round: number;
  phase: "work" | "break";
  remainingSeconds: number;
  isRunning: boolean;
}

const POMODORO_WORK_SECONDS = 25 * 60;
const POMODORO_BREAK_SECONDS = 5 * 60;
const POMODORO_ROUNDS = 2;

function PomodoroRing({
  totalSeconds,
  remainingSeconds,
  roundLabel,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  roundLabel: string;
}): React.JSX.Element {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const offset = circumference * (1 - clampedRatio);

  return (
    <div className="relative">
      <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
        <circle cx="110" cy="110" r="98" fill="none" stroke="#fbcfe8" strokeWidth="1.5" />
        <circle cx="110" cy="110" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="#f97316"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 110 110)"
          style={{ transition: "stroke-dashoffset 220ms linear" }}
        />
        <text
          x="110"
          y="114"
          textAnchor="middle"
          style={{ fontSize: 36, fontWeight: 800, fill: "rgb(30, 41, 59)" }}
        >
          {formatTimerLabel(remainingSeconds)}
        </text>
        <text x="110" y="142" textAnchor="middle" style={{ fontSize: 13, fill: "rgb(71, 85, 105)" }}>
          {roundLabel}
        </text>
      </svg>
    </div>
  );
}

function PomodoroPanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [state, setState] = React.useState<PomodoroState>({
    round: 1,
    phase: "work",
    remainingSeconds: POMODORO_WORK_SECONDS,
    isRunning: false,
  });

  React.useEffect(() => {
    if (!state.isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.remainingSeconds > 1) {
          return { ...current, remainingSeconds: current.remainingSeconds - 1 };
        }

        if (current.phase === "work") {
          if (current.round >= POMODORO_ROUNDS) {
            return {
              ...current,
              isRunning: false,
              remainingSeconds: 0,
            };
          }

          return {
            ...current,
            phase: "break",
            remainingSeconds: POMODORO_BREAK_SECONDS,
          };
        }

        return {
          ...current,
          phase: "work",
          round: Math.min(POMODORO_ROUNDS, current.round + 1),
          remainingSeconds: POMODORO_WORK_SECONDS,
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.isRunning]);

  function reset(): void {
    setState({
      round: 1,
      phase: "work",
      remainingSeconds: POMODORO_WORK_SECONDS,
      isRunning: false,
    });
  }

  const badgeLabel = state.phase === "work" ? "Concentration" : "Pause";
  const totalPhaseSeconds = state.phase === "work" ? POMODORO_WORK_SECONDS : POMODORO_BREAK_SECONDS;

  return (
    <section className="rounded-3xl border-2 border-orange-200 bg-white p-5 shadow-sm" data-testid="pomodoro-panel">
      <div className="flex flex-col items-center">
        <header className="mb-4 flex w-full items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-2xl" aria-hidden="true">
              {"\u{1F345}"}
            </span>
            <div>
              <p className="text-[2rem] font-black leading-none tracking-tight text-slate-900">Pomodoro</p>
              <p className="mt-1 text-[1.2rem] text-slate-500">25 min travail, 5 min pause</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition-all hover:bg-gray-200"
            onClick={onClose}
            aria-label="Fermer le Pomodoro"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700">
            <span aria-hidden="true">{"\u{1F4AA}"}</span>
            <span>{badgeLabel}</span>
          </span>
        </div>

        <div className="mt-3">
          <PomodoroRing
            totalSeconds={totalPhaseSeconds}
            remainingSeconds={state.remainingSeconds}
            roundLabel={`Round ${state.round}/${POMODORO_ROUNDS}`}
          />
        </div>

        <div className="mt-2 flex items-center justify-center gap-2" aria-hidden="true">
          <span
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full border text-lg",
              state.phase === "work" ? "border-orange-300 bg-orange-100" : "border-slate-200 bg-slate-100 opacity-80",
            )}
          >
            {"\u{1F345}"}
          </span>
          <span
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full border text-lg",
              state.phase === "break" ? "border-orange-300 bg-orange-100" : "border-slate-200 bg-slate-100 opacity-80",
            )}
          >
            {"\u{1F345}"}
          </span>
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 text-base font-semibold text-slate-700 transition-all hover:bg-slate-200"
            onClick={reset}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Recommencer</span>
          </button>
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-base font-bold text-white shadow-md transition-all hover:bg-orange-600"
            onClick={() =>
              setState((current) => ({
                ...current,
                isRunning: !current.isRunning,
              }))
            }
          >
            <span aria-hidden="true">{"\u25B6"}</span>
            <span>{state.isRunning ? "Pause" : "Démarrer"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function MissionsCategoryDrawer({
  summary,
  onClose,
  onOpenMission,
}: {
  summary: CategorySummary;
  onClose: () => void;
  onOpenMission: (missionId: string) => void;
}): React.JSX.Element {
  const completionPercent = toPercent(summary.completed, summary.total);
  const remainingTasks = Math.max(0, summary.total - summary.completed);
  const totalMinutesLabel = formatSummaryMinutesValue(summary.totalMinutes);

  return (
    <section className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[3px]" data-testid="missions-category-drawer-overlay" onClick={onClose}>
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[520px] max-w-[96vw] flex-col overflow-hidden rounded-l-[24px] bg-gradient-to-br shadow-2xl",
          summary.theme.drawerBgClass,
        )}
        style={{
          fontFamily: "\"Segoe UI\", ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: 400,
          letterSpacing: "normal",
        }}
        onClick={(event) => event.stopPropagation()}
        data-testid="missions-category-drawer"
        aria-label={`Drawer ${summary.theme.label}`}
      >
        <header className={cn("border-b bg-indigo-50 px-6 py-5", summary.theme.drawerBorderClass)}>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="text-4xl" aria-hidden="true">
                {summary.theme.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Catégorie</p>
                <p className={cn("text-2xl font-extrabold", summary.theme.accentClass)}>
                  {summary.theme.label}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fermer le drawer"
              className="rounded-full bg-white/80 p-2 shadow-sm transition-all hover:scale-110 hover:bg-white"
              onClick={onClose}
              data-testid="missions-category-drawer-close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-600"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            <article className="flex-1 rounded-[16px] bg-white/80 px-4 py-3 text-center">
              <p className="text-2xl font-extrabold text-gray-900">
                {summary.completed}/{summary.total}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">tâches faites</p>
            </article>
            <article className="flex-1 rounded-[16px] bg-white/80 px-4 py-3 text-center">
              <p className="inline-flex items-center justify-center gap-1">
                <span aria-hidden="true" className="inline-flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-orange-400"
                  >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                  </svg>
                </span>
                <span className="text-2xl font-extrabold text-gray-900">{summary.totalStars}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-500">étoiles à gagner</p>
            </article>
            <article className="flex-1 rounded-[16px] bg-white/80 px-4 py-3 text-center">
              <p className="inline-flex items-center justify-center gap-1">
                <span aria-hidden="true" className="inline-flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-gray-500"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <span className="text-2xl font-extrabold text-gray-900">{totalMinutesLabel}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-500">min au total</p>
            </article>
          </div>

          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                summary.theme.drawerProgressClass === "mission-list-drawer-progress-fill--indigo" &&
                  "bg-gradient-to-r from-indigo-400 to-indigo-600",
                summary.theme.drawerProgressClass === "mission-list-drawer-progress-fill--purple" &&
                  "bg-gradient-to-r from-purple-400 to-purple-700",
                summary.theme.drawerProgressClass === "mission-list-drawer-progress-fill--emerald" &&
                  "bg-gradient-to-r from-emerald-400 to-emerald-700",
              )}
              style={{ width: `${completionPercent}%` }}
              aria-hidden="true"
            />
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-[20px] py-[16px]" data-testid="missions-category-list">
          {summary.missions.map((mission, index) => {
            const isDone = mission.status === "done";
            const durationMinutes = computeDurationMinutes(mission.startTime, mission.endTime, mission.estimatedMinutes);
            const rowTone = getDrawerRowTone(index);
            const missionEmoji = getDrawerMissionEmoji(mission, summary.theme.emoji);
            const subkindLabel = resolveDrawerSubkindLabel(mission);

            return (
              <button
                key={mission.id}
                type="button"
                className={cn(
                  "w-full rounded-[16px] border-2 px-[16px] py-[16px] text-left text-[16px] font-medium leading-[24px] transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
                  rowTone.buttonClass,
                  isDone && "opacity-70",
                )}
                onClick={() => onOpenMission(mission.id)}
                data-testid={`missions-category-task-${mission.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                        rowTone.numberClass,
                      )}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xl" aria-hidden="true">
                        {missionEmoji}
                      </span>
                      {subkindLabel ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            rowTone.pillClass,
                          )}
                        >
                          {subkindLabel}
                        </span>
                      ) : null}
                    </div>
                    <h3 className={cn("text-[16px] font-extrabold leading-[24px] text-gray-900", isDone && "line-through")}>
                      {mission.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{formatTaskDuration(durationMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-orange-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5 fill-orange-400 text-orange-400"
                          aria-hidden="true"
                        >
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                        </svg>
                        <span className="font-semibold">{mission.points} étoiles</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span>
                          {mission.startTime} {"\u2192"} {mission.endTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="self-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 text-gray-400"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="border-t border-gray-100 bg-white/60 px-[20px] py-[16px]">
          <div className="flex items-center gap-3 rounded-[16px] border border-orange-200 bg-gradient-to-r from-orange-50 to-pink-50 px-[16px] py-[12px]">
            <span className="text-2xl" aria-hidden="true">
              {remainingTasks > 0 ? "\u{1F4AA}" : "\u{1F44F}"}
            </span>
            <p className="text-sm font-medium text-gray-700">
              {remainingTasks > 0
                ? `Encore ${remainingTasks} tâche${remainingTasks > 1 ? "s" : ""} — tu peux le faire !`
                : "Toutes les tâches sont terminées, bravo !"}
            </p>
          </div>
        </footer>
      </aside>
    </section>
  );
}

function MissionTaskModal({
  mission,
  categoryLabel,
  categoryTheme,
  isPending,
  onBack,
  onClose,
  onValidate,
}: {
  mission: MissionUI;
  categoryLabel: string;
  categoryTheme: CategoryTheme;
  isPending: boolean;
  onBack: () => void;
  onClose: () => void;
  onValidate: () => void | Promise<void>;
}): React.JSX.Element {
  const sections = React.useMemo(
    () => splitMissionInstructionsHtml(mission.instructionsHtml),
    [mission.instructionsHtml],
  );
  const checklistSteps = React.useMemo(
    () => buildChecklistSteps(mission, sections.mainInstructionsHtml),
    [mission, sections.mainInstructionsHtml],
  );
  const leadInstruction = React.useMemo(
    () => extractPrimaryInstructionLine(sections.mainInstructionsHtml),
    [sections.mainInstructionsHtml],
  );
  const defaultCheckedStepIds = React.useMemo(
    () => checklistSteps.filter((step) => step.done).map((step) => step.id),
    [checklistSteps],
  );

  const [checkedStepIds, setCheckedStepIds] = React.useState<string[]>(defaultCheckedStepIds);
  const [timerMode, setTimerMode] = React.useState<TimerMode>("none");

  React.useEffect(() => {
    setCheckedStepIds(defaultCheckedStepIds);
    setTimerMode("none");
  }, [mission.id, defaultCheckedStepIds]);

  const checkedCount = checkedStepIds.length;
  const totalSteps = checklistSteps.length;
  const stepProgressPercent = toPercent(checkedCount, totalSteps);
  const missionDurationMinutes = computeDurationMinutes(mission.startTime, mission.endTime, mission.estimatedMinutes);
  const missionSubkind = mission.itemSubkind?.trim() ? mission.itemSubkind.trim() : null;
  const missionEmoji = getDrawerMissionEmoji(mission, categoryTheme.emoji);
  const tipText = React.useMemo(() => {
    if (!sections.tipHtml) {
      return null;
    }

    return sections.tipHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null;
  }, [sections.tipHtml]);

  function toggleStep(stepId: string): void {
    setCheckedStepIds((current) =>
      current.includes(stepId)
        ? current.filter((item) => item !== stepId)
        : [...current, stepId],
    );
  }

  return (
    <section
      className="pointer-events-none fixed inset-x-0 bottom-0 top-0 z-50 flex items-center justify-center p-4"
      data-testid="missions-task-modal-overlay"
    >
      <button
        type="button"
        aria-label="Fermer la modale"
        className="pointer-events-auto absolute inset-0 z-0 bg-slate-900/45 backdrop-blur-[4px]"
        onClick={onClose}
      />
      <article
        role="dialog"
        aria-modal="true"
        aria-label={`Mission ${mission.title}`}
        className="pointer-events-auto relative z-10 flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        data-testid="missions-task-modal"
        style={{
          fontFamily: "\"Segoe UI\", ui-sans-serif, system-ui, sans-serif",
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: 400,
          letterSpacing: "normal",
        }}
        onClick={(event) => event.stopPropagation()}
      >
          <header className="shrink-0 border-b border-indigo-200 bg-indigo-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="bg-white/80 hover:bg-white rounded-full p-2 shadow-sm transition-all hover:scale-110"
                  onClick={onBack}
                  aria-label="Revenir au drawer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-gray-600"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {categoryTheme.emoji} {categoryLabel}
                    </span>
                    {missionSubkind ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {missionSubkind}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900 mt-1 leading-tight">
                    {missionEmoji} {mission.title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-white/80 border border-orange-200 rounded-2xl px-3 py-2 flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 fill-orange-400 text-orange-400"
                    aria-hidden="true"
                  >
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                  </svg>
                  <span className="font-extrabold text-orange-700">{mission.points}</span>
                </div>
                <div className="bg-white/80 border border-gray-200 rounded-2xl px-3 py-2 flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-gray-500"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-semibold text-gray-700">{missionDurationMinutes} min</span>
                </div>
                <button
                  type="button"
                  aria-label="Fermer la modale"
                  className="bg-white/80 hover:bg-white rounded-full p-2 shadow-sm transition-all hover:scale-110"
                  onClick={onClose}
                  data-testid="missions-task-modal-close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-gray-600"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                {mission.startTime} {"\u2192"} {mission.endTime}
              </span>
              <span className="text-gray-400">·</span>
              <span>durée : {missionDurationMinutes} minutes</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="grid h-full grid-cols-1 gap-0 lg:grid-cols-5">
            <main className="space-y-5 px-6 py-5 lg:col-span-3 lg:border-r lg:border-gray-100">
              {timerMode === "time_timer" ? (
                <TimeTimerPanel
                  durationMinutes={Math.max(1, missionDurationMinutes)}
                  onClose={() => setTimerMode("none")}
                />
              ) : null}

              {timerMode === "pomodoro" ? (
                <PomodoroPanel onClose={() => setTimerMode("none")} />
              ) : null}

              {leadInstruction ? (
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-2xl" aria-hidden="true">
                      {"\u{1F440}"}
                    </span>
                    <p className="font-semibold leading-relaxed text-indigo-700">{leadInstruction}</p>
                  </div>
                </div>
              ) : null}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">
                    {"\u{1F4CB}"}
                  </span>
                  <h3 className="font-extrabold text-gray-800">Ce que tu dois faire</h3>
                </div>

                {checklistSteps.length > 0 ? (
                  <ul className="space-y-2">
                    {checklistSteps.map((step, index) => {
                      const checked = checkedStepIds.includes(step.id);

                      return (
                        <li key={step.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-gray-300 hover:shadow-sm",
                              checked && "border-indigo-300 bg-indigo-50",
                            )}
                            onClick={() => toggleStep(step.id)}
                          >
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-sm font-bold text-gray-500",
                                checked && "border-indigo-400 bg-indigo-100 text-indigo-700",
                              )}
                              aria-hidden="true"
                            >
                              {checked ? "v" : index + 1}
                            </span>
                            <span className={cn("font-medium leading-relaxed text-gray-800", checked && "line-through opacity-80")}>
                              {step.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div
                    className="mission-drawer-richtext rounded-2xl border-2 border-gray-200 bg-white px-4 py-3"
                    dangerouslySetInnerHTML={{ __html: sections.mainInstructionsHtml }}
                  />
                )}

                {tipText ? (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-yellow-200 bg-yellow-50 px-5 py-4">
                    <span className="text-xl" aria-hidden="true">
                      {"\u{1F4A1}"}
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-yellow-800">{tipText}</p>
                  </div>
                ) : null}
              </section>
            </main>

            <aside className="space-y-5 bg-gray-50/50 px-5 py-5 lg:col-span-2">
              {timerMode === "none" ? (
                <section>
                  <h3 className="mb-3 inline-flex items-center gap-2 font-extrabold text-gray-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-indigo-500"
                      aria-hidden="true"
                    >
                      <line x1="10" x2="14" y1="2" y2="2" />
                      <line x1="12" x2="15" y1="14" y2="11" />
                      <circle cx="12" cy="14" r="8" />
                    </svg>
                    <span>Demarrer un chrono</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="group rounded-2xl border-2 border-orange-200 bg-white p-4 text-center transition-all hover:border-orange-300 hover:bg-orange-50 hover:shadow-sm"
                      onClick={() => setTimerMode((current) => (current === "time_timer" ? "none" : "time_timer"))}
                    >
                      <p className="mb-2 text-3xl" aria-hidden="true">
                        {"\u23F1\uFE0F"}
                      </p>
                      <p className="text-sm font-bold text-gray-900">Time Timer</p>
                      <p className="mt-1 text-xs text-gray-500">Je vois le temps qui passe</p>
                    </button>
                    <button
                      type="button"
                      className="group rounded-2xl border-2 border-red-200 bg-white p-4 text-center transition-all hover:border-red-300 hover:bg-red-50 hover:shadow-sm"
                      onClick={() => setTimerMode((current) => (current === "pomodoro" ? "none" : "pomodoro"))}
                    >
                      <p className="mb-2 text-3xl" aria-hidden="true">
                        {"\u{1F345}"}
                      </p>
                      <p className="text-sm font-bold text-gray-900">Pomodoro</p>
                      <p className="mt-1 text-xs text-gray-500">Travail + pause alternes</p>
                    </button>
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="mb-3 inline-flex items-center gap-2 font-extrabold text-gray-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-purple-500"
                    aria-hidden="true"
                  >
                    <path d="M12 7v14" />
                    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                  </svg>
                  <span>Mes fiches d&apos;aide</span>
                </h3>
                {mission.helpLinks.length > 0 ? (
                  <div className="space-y-2">
                    {mission.helpLinks.map((helpLink) => (
                      <div
                        key={helpLink.id}
                        className="overflow-hidden rounded-2xl border-2 border-purple-100 bg-white transition-all"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-all hover:bg-purple-50"
                        >
                          <span className="truncate pr-2 text-sm font-semibold leading-tight text-gray-800">{helpLink.label}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 shrink-0 text-gray-400"
                            aria-hidden="true"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucune fiche pour le moment.</p>
                )}
              </section>

              <section className="rounded-2xl border-2 border-indigo-100 bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">Progression</h3>
                  <p className="text-sm font-bold text-indigo-600">
                    {checkedCount}/{totalSteps}
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-300"
                    style={{ width: `${stepProgressPercent}%` }}
                  />
                </div>
              </section>
            </aside>
          </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-100 bg-white px-6 py-4">
            <p className="text-sm text-gray-500" data-testid="mission-steps-counter">
              {checkedCount}/{totalSteps} etape{totalSteps > 1 ? "s" : ""} cochee{totalSteps > 1 ? "s" : ""}
            </p>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-2xl px-8 py-3 font-bold text-white transition-all shadow-md hover:scale-105 hover:shadow-lg active:scale-95",
                mission.status === "done"
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                  : "bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
              )}
              onClick={() => void onValidate()}
              disabled={isPending || mission.status === "done"}
              data-testid="mission-validate-button"
            >
              <span aria-hidden="true">{"\u26A1"}</span>
              <span>{mission.status === "done" ? "Tache validee" : "Valider la tache"}</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300"
                  aria-hidden="true"
                >
                  <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                </svg>
                <span>+{mission.points}</span>
              </span>
            </button>
          </footer>
        </article>
    </section>
  );
}

export function MissionsSummaryCard({
  missions,
  className,
}: MissionsSummaryCardProps): React.JSX.Element {
  const {
    missions: liveMissions,
    pendingMissionId,
    updateMissionStatus,
  } = useMissionsToday({ initialMissions: missions });
  const [mounted, setMounted] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<MissionCategory | null>(null);
  const [selectedMissionId, setSelectedMissionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const categorySummaries = React.useMemo(
    () => buildCategorySummaries(liveMissions),
    [liveMissions],
  );
  const activeCategorySummary = React.useMemo(
    () => categorySummaries.find((summary) => summary.category === activeCategory) ?? null,
    [activeCategory, categorySummaries],
  );
  const selectedMission = React.useMemo(
    () => activeCategorySummary?.missions.find((mission) => mission.id === selectedMissionId) ?? null,
    [activeCategorySummary, selectedMissionId],
  );

  const totalMissions = categorySummaries.reduce((accumulator, category) => accumulator + category.total, 0);
  const completedMissions = categorySummaries.reduce((accumulator, category) => accumulator + category.completed, 0);
  const totalStars = categorySummaries.reduce((accumulator, category) => accumulator + category.totalStars, 0);
  const earnedStars = categorySummaries.reduce(
    (accumulator, category) =>
      accumulator +
      category.missions
        .filter((mission) => mission.status === "done")
        .reduce((innerAccumulator, mission) => innerAccumulator + Math.max(0, mission.points), 0),
    0,
  );
  const stars = countStars({
    earnedStars,
    totalStars,
    completedMissions,
    totalMissions,
  });

  React.useEffect(() => {
    if (!activeCategorySummary) {
      setSelectedMissionId(null);
      return;
    }

    if (selectedMissionId && !activeCategorySummary.missions.some((mission) => mission.id === selectedMissionId)) {
      setSelectedMissionId(null);
    }
  }, [activeCategorySummary, selectedMissionId]);

  const hasOverlayOpen = Boolean(activeCategorySummary) || Boolean(selectedMission);

  React.useEffect(() => {
    if (!hasOverlayOpen || typeof document === "undefined") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [hasOverlayOpen]);

  React.useEffect(() => {
    if (!hasOverlayOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      if (selectedMission) {
        setSelectedMissionId(null);
        return;
      }

      setSelectedMissionId(null);
      setActiveCategory(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [hasOverlayOpen, selectedMission]);

  return (
    <>
      <section
        className={cn("mission-card-surface p-4", className)}
        data-testid="missions-summary-card"
      >
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1">
            <span className="text-base" aria-hidden="true">
              {"\u{1F5FA}\uFE0F"}
            </span>
            <span className="text-xs font-bold tracking-[0.08em] text-indigo-700">TABLEAU DES QUETES</span>
          </div>
          <h2 className="mt-2 font-display text-[1.2rem] font-black tracking-tight text-slate-900 sm:text-[1.35rem]">
            Tes missions du jour
          </h2>
          <p className="mt-1 text-[0.84rem] text-slate-500 sm:text-sm" data-testid="missions-summary-subtitle">
            {pluralizeCompleted(completedMissions, totalMissions)}
          </p>
        </header>

        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[0.86rem] sm:text-sm">
            <span className="font-semibold text-slate-700">Etoiles du jour</span>
            <span className="font-extrabold text-amber-600">
              <span
                data-testid="missions-summary-stars"
                aria-label={`${stars} etoile${stars > 1 ? "s" : ""} gagnee${stars > 1 ? "s" : ""} sur ${STAR_TARGET}`}
              >
                {"\u2605".repeat(stars)}
                {"\u2606".repeat(STAR_TARGET - stars)}
              </span>{" "}
              {earnedStars} / {totalStars}
            </span>
          </div>
        </div>

        {categorySummaries.length > 0 ? (
          <div className="mt-3 space-y-3">
            {categorySummaries.map((summary) => {
              const progress = toPercent(summary.completed, summary.total);
              const remaining = Math.max(0, summary.total - summary.completed);

              return (
                <button
                  key={summary.category}
                  type="button"
                  className={cn(
                    "w-full text-left rounded-2xl border-2 p-4 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                    summary.theme.summaryRowClass,
                  )}
                  style={SUMMARY_ROW_FONT_STYLE}
                  onClick={() => {
                    setActiveCategory(summary.category);
                    setSelectedMissionId(null);
                  }}
                  data-testid={`missions-summary-category-${summary.category}`}
                  aria-label={`Ouvrir ${summary.theme.label}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white rounded-xl p-2 shadow-sm">
                      <SummaryCategoryIcon category={summary.category} className={summary.theme.summaryIconClass} />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-extrabold text-gray-900">{summary.theme.label}</h3>
                        <span className="text-sm font-semibold text-gray-600">
                          {summary.completed} / {summary.total}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={cn("h-full rounded-full transition-all", summary.theme.summaryProgressClass)}
                          style={{ width: `${progress}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">{remaining} taches restantes</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-600">Aucune mission aujourd&apos;hui.</p>
          </div>
        )}
      </section>

      {mounted
        ? createPortal(
            <>
              {activeCategorySummary ? (
                <MissionsCategoryDrawer
                  summary={activeCategorySummary}
                  onClose={() => {
                    setSelectedMissionId(null);
                    setActiveCategory(null);
                  }}
                  onOpenMission={(missionId) => setSelectedMissionId(missionId)}
                />
              ) : null}

              {selectedMission && activeCategorySummary ? (
                <MissionTaskModal
                  mission={selectedMission}
                  categoryLabel={activeCategorySummary.theme.label}
                  categoryTheme={activeCategorySummary.theme}
                  isPending={pendingMissionId === selectedMission.id}
                  onBack={() => setSelectedMissionId(null)}
                  onClose={() => setSelectedMissionId(null)}
                  onValidate={async () => {
                    const success = await updateMissionStatus(selectedMission.id, "done");
                    if (success) {
                      setSelectedMissionId(null);
                    }
                  }}
                />
              ) : null}
            </>,
            document.body,
          )
        : null}
    </>
  );
}
