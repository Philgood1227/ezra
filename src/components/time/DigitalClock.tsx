"use client";

import { cn } from "@/lib/utils";
import { formatHeure } from "@/lib/utils/time";

interface TimeParts {
  hours24: number;
  minutes: number;
  seconds: number;
}

export interface DigitalClockProps {
  date: Date | { hours24: number; minutes: number; seconds?: number };
  showSeconds?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

function normalizeTime(date: DigitalClockProps["date"]): TimeParts {
  if (date instanceof Date) {
    return {
      hours24: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    };
  }

  return {
    hours24: date.hours24,
    minutes: date.minutes,
    seconds: date.seconds ?? 0,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function DigitalClock({
  date,
  showSeconds = false,
  compact = false,
  showLabel = true,
  className,
}: DigitalClockProps): React.JSX.Element {
  const time = normalizeTime(date);
  const base = date instanceof Date ? formatHeure(date) : `${pad(time.hours24)}:${pad(time.minutes)}`;
  const displayValue = showSeconds ? `${base}:${pad(time.seconds)}` : base;
  const ariaLabel = showSeconds
    ? `Horloge numerique indiquant ${time.hours24} heures ${time.minutes} minutes ${time.seconds} secondes`
    : `Horloge numerique indiquant ${time.hours24} heures ${time.minutes}`;

  return (
    <section
      aria-label={ariaLabel}
      suppressHydrationWarning
      className={cn(
        "flex h-full flex-col justify-center rounded-2xl border border-border-subtle bg-bg-surface p-5 text-center shadow-card",
        compact ? "p-3" : "p-5",
        className,
      )}
    >
      <p
        suppressHydrationWarning
        className={cn(
          "font-display font-black tracking-tight text-text-primary",
          compact ? "text-4xl sm:text-5xl" : "text-6xl sm:text-7xl",
        )}
      >
        {displayValue}
      </p>
      {showLabel ? (
        <p className={cn("mt-2 font-semibold text-text-secondary", compact ? "text-xs" : "text-sm")}>
          Heure actuelle
        </p>
      ) : null}
    </section>
  );
}
