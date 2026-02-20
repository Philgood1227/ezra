"use client";

import { Card, CardContent, Skeleton } from "@/components/ds";
import { SparkIcon } from "@/components/child/icons/child-premium-icons";
import { cn } from "@/lib/utils";

interface TodayHeaderProps {
  date: Date;
  timezone: string;
  className?: string;
  isLoading?: boolean;
}

interface WeekDayItem {
  id: string;
  label: string;
  fullLabel: string;
}

const WEEK_DAYS: WeekDayItem[] = [
  { id: "lundi", label: "L", fullLabel: "Lundi" },
  { id: "mardi", label: "M", fullLabel: "Mardi" },
  { id: "mercredi", label: "M", fullLabel: "Mercredi" },
  { id: "jeudi", label: "J", fullLabel: "Jeudi" },
  { id: "vendredi", label: "V", fullLabel: "Vendredi" },
  { id: "samedi", label: "S", fullLabel: "Samedi" },
  { id: "dimanche", label: "D", fullLabel: "Dimanche" },
];

const dateFormatterByTimezone = new Map<string, Intl.DateTimeFormat>();
const weekdayIndexFormatterByTimezone = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = dateFormatterByTimezone.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  dateFormatterByTimezone.set(timezone, formatter);
  return formatter;
}

function getWeekdayIndexFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = weekdayIndexFormatterByTimezone.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });

  weekdayIndexFormatterByTimezone.set(timezone, formatter);
  return formatter;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getWeekdayIndexMondayFirst(date: Date, timezone: string): number {
  const weekdayKey = getWeekdayIndexFormatter(timezone).format(date);
  const indexByShortName: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return indexByShortName[weekdayKey] ?? 0;
}

function extractDateParts(date: Date, timezone: string): {
  weekday: string;
  day: string;
  month: string;
  year: string;
} {
  const parts = getDateFormatter(timezone).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return { weekday, day, month, year };
}

export function TodayHeader({
  date,
  timezone,
  className,
  isLoading = false,
}: TodayHeaderProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Card className={cn("relative overflow-hidden border-brand-primary/20 bg-hero-soft p-4 shadow-card md:p-3.5 xl:p-4", className)} data-testid="today-header">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-36 rounded-radius-pill bg-brand-primary/18 blur-2xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -left-8 bottom-0 size-28 rounded-radius-pill bg-brand-secondary/14 blur-2xl" />
        <CardContent className="relative grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded-radius-pill" />
            <Skeleton className="h-9 w-52 rounded-radius-button md:h-8 xl:h-9" />
            <Skeleton className="h-5 w-40 rounded-radius-button md:h-4 xl:h-5" />
            <Skeleton className="h-touch-sm w-full rounded-radius-button" />
          </div>
          <Skeleton className="mx-auto h-16 w-16 rounded-radius-pill md:mx-0 xl:h-20 xl:w-20" />
        </CardContent>
      </Card>
    );
  }

  const { weekday, day, month, year } = extractDateParts(date, timezone);
  const currentWeekdayIndex = getWeekdayIndexMondayFirst(date, timezone);
  const dayTitle = `${capitalize(weekday)} ${day}`;
  const monthYear = `${capitalize(month)} ${year}`;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-brand-primary/20 bg-hero-soft p-4 shadow-card md:p-3.5 xl:p-4",
        className,
      )}
      data-testid="today-header"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-36 rounded-radius-pill bg-brand-primary/18 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -left-8 bottom-0 size-28 rounded-radius-pill bg-brand-secondary/14 blur-2xl" />
      <CardContent className="relative grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{"Aujourd'hui"}</p>
          <p className="font-display text-3xl font-black leading-tight text-text-primary md:text-[1.75rem] xl:text-3xl" data-testid="today-primary-date">
            {dayTitle}
          </p>
          <p className="text-sm font-semibold text-text-secondary md:text-xs xl:text-sm" data-testid="today-secondary-date">
            {monthYear}
          </p>

          <div className="rounded-radius-button border border-border-subtle/80 bg-bg-surface/72 p-1 shadow-card">
            <ul
              data-testid="today-week-strip"
              aria-label="Semaine en cours"
              className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {WEEK_DAYS.map((weekDay, index) => {
                const isCurrent = index === currentWeekdayIndex;
                const isPast = index < currentWeekdayIndex;

                return (
                  <li key={weekDay.id} className="flex-none">
                    <span
                      data-testid={`today-week-day-${weekDay.id}`}
                      className={cn(
                        "inline-flex h-touch-sm w-touch-sm items-center justify-center rounded-radius-pill border text-sm font-bold",
                        isCurrent
                          ? "border-brand-primary/40 bg-brand-primary/16 text-brand-primary shadow-card"
                          : isPast
                            ? "border-border-subtle bg-bg-surface/80 text-text-secondary"
                            : "border-border-subtle bg-bg-surface text-text-primary",
                      )}
                      aria-current={isCurrent ? "date" : undefined}
                      aria-label={weekDay.fullLabel}
                    >
                      {weekDay.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-radius-pill border border-brand-primary/18 bg-gradient-to-br from-bg-surface to-brand-50/60 text-brand-primary shadow-card transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 md:mx-0 xl:h-20 xl:w-20"
          data-testid="today-hero-visual"
          aria-hidden="true"
        >
          <span className="absolute inset-2 rounded-radius-pill border border-brand-primary/15" />
          <span className="absolute left-2 top-2 size-1.5 rounded-radius-pill bg-accent-warm/80 xl:left-3 xl:top-3 xl:size-2" />
          <span className="absolute bottom-2 right-2 size-1.5 rounded-radius-pill bg-brand-secondary/75 xl:bottom-3 xl:right-3 xl:size-2" />
          <SparkIcon className="size-7 xl:size-9" />
        </div>
      </CardContent>
    </Card>
  );
}
