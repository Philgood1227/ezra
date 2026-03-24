"use client";

import * as React from "react";
import { getDateKeyInTimeZone } from "@/lib/weather/date";
import type { DayUI } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

type WeekdayStripProps = {
  currentDate: Date;
  weekStartDate: Date;
  timezone: string;
  weatherDays?: DayUI[] | undefined;
  onSelectDay?: ((date: Date) => void) | undefined;
  testId?: string | undefined;
  className?: string;
};

type DayState = "past" | "current" | "future";

interface WeekdayCell {
  id: string;
  label: string;
  date: Date;
  dayNumber: number;
  isWeekend: boolean;
  state: DayState;
}

const FRENCH_WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const FRENCH_WEEKDAY_IDS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

function getMondayFirstDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function getDayState(day: Date, currentDate: Date, timezone: string): DayState {
  const dayKey = getDateKeyInTimeZone(day, timezone);
  const currentDayKey = getDateKeyInTimeZone(currentDate, timezone);

  if (dayKey < currentDayKey) {
    return "past";
  }
  if (dayKey > currentDayKey) {
    return "future";
  }
  return "current";
}

function getWeekCells(weekStartDate: Date, currentDate: Date, timezone: string): WeekdayCell[] {
  return Array.from({ length: 7 }, (_, index) => {
    const cellDate = new Date(weekStartDate);
    cellDate.setDate(weekStartDate.getDate() + index);
    const dayIndex = getMondayFirstDayIndex(cellDate);

    return {
      id: FRENCH_WEEKDAY_IDS[dayIndex] ?? `jour-${index}`,
      label: FRENCH_WEEKDAY_SHORT[dayIndex] ?? "Jour",
      date: cellDate,
      dayNumber: cellDate.getDate(),
      isWeekend: dayIndex >= 5,
      state: getDayState(cellDate, currentDate, timezone),
    };
  });
}

function formatCellAriaLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function WeekdayStrip({
  currentDate,
  weekStartDate,
  timezone,
  weatherDays,
  onSelectDay,
  testId = "today-week-strip",
  className,
}: WeekdayStripProps): React.JSX.Element {
  void weatherDays;

  const cells = React.useMemo(
    () => getWeekCells(weekStartDate, currentDate, timezone),
    [currentDate, timezone, weekStartDate],
  );

  return (
    <ul
      className={cn("flex gap-1.5 overflow-x-auto pb-0.5", className)}
      aria-label="Semaine en cours"
      data-testid={testId}
    >
      {cells.map((cell) => (
        <li key={cell.id} data-testid={`weekday-cell-${cell.id}`} className="min-w-[4.35rem] flex-none sm:min-w-[4.6rem]">
          <button
            type="button"
            onClick={() => onSelectDay?.(new Date(cell.date))}
            data-testid={`today-week-day-${cell.id}`}
            data-state={cell.state}
            data-weekend={cell.isWeekend ? "true" : "false"}
            aria-current={cell.state === "current" ? "date" : undefined}
            aria-label={formatCellAriaLabel(cell.date, timezone)}
            className={cn(
              "flex min-h-touch-sm w-full flex-col items-center justify-center rounded-radius-button border px-2.5 py-1 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
              cell.state === "past" && "border-status-success bg-status-success text-text-inverse shadow-sm",
              cell.state === "current" && "border-brand-primary bg-brand-primary text-text-inverse shadow-card ring-1 ring-brand-primary/20",
              cell.state === "future" && "border-border-default bg-bg-surface text-text-secondary shadow-sm hover:bg-bg-surface-hover",
            )}
          >
            <span className="text-[0.78rem] font-semibold leading-none">{cell.label}</span>
            <span className="mt-0.5 text-[1.16rem] font-bold leading-none">{cell.dayNumber}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
