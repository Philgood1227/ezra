"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChecklistIcon as PremiumChecklistIcon,
  HomeIcon as PremiumHomeIcon,
  StarIcon as PremiumStarIcon,
  TrophyIcon as PremiumTrophyIcon,
} from "@/components/child/icons/child-premium-icons";
import { WeekdayStrip } from "@/components/child/today/weekday-strip";
import type { TimeBlockId } from "@/components/child/today/types";
import { Card, CardContent } from "@/components/ds";
import { WeatherPanel } from "@/components/weather/WeatherPanel";
import { cn } from "@/lib/utils";
import { getDateKeyInTimeZone } from "@/lib/weather/date";
import { createFallbackWeatherWeekUI, getDayFromWeatherWeek, type WeatherBucketId, type WeatherWeekUI } from "@/lib/weather/types";

interface TodayHeaderProps {
  date: Date;
  timezone: string;
  weatherWeek: WeatherWeekUI;
  selectedDateISO: string;
  currentSegmentId: TimeBlockId;
  segments: Array<{
    id: TimeBlockId;
    label: string;
  }>;
  weekStartDate?: Date | undefined;
  onSelectDay?: ((date: Date) => void) | undefined;
  className?: string;
}

interface HeaderNavItem {
  key: "today" | "checklists" | "rewards" | "achievements";
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  {
    key: "today",
    label: "Aujourd'hui",
    href: "/child",
    icon: PremiumHomeIcon,
  },
  {
    key: "checklists",
    label: "Check-lists",
    href: "/child/checklists",
    icon: PremiumChecklistIcon,
  },
  {
    key: "rewards",
    label: "Recompenses",
    href: "/child/missions",
    icon: PremiumTrophyIcon,
  },
  {
    key: "achievements",
    label: "Mes reussites",
    href: "/child/achievements",
    icon: PremiumStarIcon,
  },
];

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateLine(date: Date, timezone: string, isToday: boolean): string {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${isToday ? "Aujourd'hui" : "Jour consulte"} - ${capitalize(formatter.format(date))}`;
}

function getWeekStartDateMonday(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const offsetFromMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offsetFromMonday);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveBucketId(segmentId: TimeBlockId): WeatherBucketId {
  if (
    segmentId === "morning" ||
    segmentId === "noon" ||
    segmentId === "afternoon" ||
    segmentId === "home" ||
    segmentId === "evening"
  ) {
    return segmentId;
  }
  return "morning";
}

export function TodayHeader({
  date,
  timezone,
  weatherWeek,
  selectedDateISO,
  currentSegmentId,
  segments,
  weekStartDate,
  onSelectDay,
  className,
}: TodayHeaderProps): React.JSX.Element {
  void segments;
  const baseWeekStartDate = React.useMemo(() => getWeekStartDateMonday(new Date()), []);
  const [visibleWeekStartDate, setVisibleWeekStartDate] = React.useState<Date>(
    () => weekStartDate ?? getWeekStartDateMonday(date),
  );
  const resolvedWeatherWeek =
    weatherWeek && weatherWeek.dataState
      ? weatherWeek
      : createFallbackWeatherWeekUI({
          timezone,
          selectedDateISO,
        });

  const [selectedBucketId, setSelectedBucketId] = React.useState<WeatherBucketId>(resolveBucketId(currentSegmentId));
  const previousSelectedDateKeyRef = React.useRef<string>(selectedDateISO);

  const selectedDateKey = getDateKeyInTimeZone(date, timezone);
  const todayDateKey = getDateKeyInTimeZone(new Date(), timezone);
  const isSelectedToday = selectedDateKey === todayDateKey;
  const isWeekShifted =
    getDateKeyInTimeZone(visibleWeekStartDate, timezone) !==
    getDateKeyInTimeZone(baseWeekStartDate, timezone);

  React.useEffect(() => {
    setSelectedBucketId(resolveBucketId(currentSegmentId));
  }, [currentSegmentId, selectedDateISO]);

  React.useEffect(() => {
    if (previousSelectedDateKeyRef.current === selectedDateISO) {
      return;
    }
    previousSelectedDateKeyRef.current = selectedDateISO;
    const targetWeekStart = getWeekStartDateMonday(date);
    const currentStartKey = getDateKeyInTimeZone(visibleWeekStartDate, timezone);
    const targetStartKey = getDateKeyInTimeZone(targetWeekStart, timezone);
    if (currentStartKey !== targetStartKey) {
      setVisibleWeekStartDate(targetWeekStart);
    }
  }, [date, selectedDateISO, timezone, visibleWeekStartDate]);

  const selectedDay = getDayFromWeatherWeek(resolvedWeatherWeek, selectedDateISO);
  const sunriseLabel = selectedDay?.sun?.sunriseLabel ?? "--:--";
  const sunsetLabel = selectedDay?.sun?.sunsetLabel ?? "--:--";
  const hasTopSunTimes = sunriseLabel !== "--:--" && sunsetLabel !== "--:--";

  return (
    <Card
      className={cn(
        "border-border-subtle bg-bg-surface/78 p-0 shadow-card backdrop-blur-sm",
        (!isSelectedToday || isWeekShifted) && "border-brand-primary/40 ring-1 ring-brand-primary/30",
        className,
      )}
      data-testid="today-header"
    >
      <CardContent className="mx-auto w-full max-w-screen-2xl px-[clamp(18px,2.4vw,34px)] py-1.5 md:py-2">
        <div
          className="grid grid-cols-1 items-stretch gap-x-6 gap-y-2 md:grid-cols-[minmax(0,1fr)_auto]"
          data-testid="today-header-main-grid"
        >
          <div className="flex min-w-0 flex-col gap-y-1.5">
            <div className="min-w-0" data-testid="today-header-top-row">
              <button
                type="button"
                className="group text-left"
                onClick={() => {
                  setVisibleWeekStartDate(baseWeekStartDate);
                  onSelectDay?.(new Date());
                }}
              >
                <h1 className="text-page-title mb-2.5 font-display tracking-[-0.01em] text-text-primary group-hover:underline">
                  {formatDateLine(date, timezone, isSelectedToday)}
                </h1>
              </button>
              {(!isSelectedToday || isWeekShifted) && (
                <p className="mb-2 text-xs font-semibold text-brand-primary">
                  Vue decalee active
                </p>
              )}
              {hasTopSunTimes ? (
                <p className="mb-2 text-xs font-semibold text-text-muted">
                  Lever {sunriseLabel} - Coucher {sunsetLabel}
                </p>
              ) : null}
            </div>

            <div className="inline-flex max-w-full flex-col gap-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Jour precedent"
                  className="h-9 min-w-9 rounded-full border border-border-default bg-bg-surface px-2 text-sm font-bold text-text-primary hover:bg-bg-surface-hover"
                  onClick={() => setVisibleWeekStartDate((current) => addDays(current, -1))}
                >
                  {"<"}
                </button>
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <WeekdayStrip
                    currentDate={date}
                    weekStartDate={visibleWeekStartDate}
                    timezone={timezone}
                    weatherDays={undefined}
                    onSelectDay={onSelectDay}
                    testId="today-week-strip"
                    className="min-w-0"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Jour suivant"
                  className="h-9 min-w-9 rounded-full border border-border-default bg-bg-surface px-2 text-sm font-bold text-text-primary hover:bg-bg-surface-hover"
                  onClick={() => setVisibleWeekStartDate((current) => addDays(current, 1))}
                >
                  {">"}
                </button>
              </div>

              <div className="p-0.5">
                <nav data-testid="today-header-quick-nav" data-active-bucket={selectedBucketId} aria-label="Navigation rapide enfant">
                  <ul className="flex items-center gap-2 overflow-x-auto px-0.5 py-0.5 min-[1100px]:grid min-[1100px]:grid-cols-4 min-[1100px]:overflow-visible">
                    {HEADER_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.key === "today";

                      return (
                        <li key={item.key} className="min-w-fit min-[1100px]:min-w-0">
                          <Link
                            href={item.href}
                            {...(item.key === "today"
                              ? {
                                  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
                                    event.preventDefault();
                                    setVisibleWeekStartDate(baseWeekStartDate);
                                    onSelectDay?.(new Date());
                                  },
                                }
                              : {})}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-full border px-5 py-1.5 text-sm font-medium text-gray-600 transition-all duration-200 ease-out hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                              isActive
                                ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                                : "border-gray-200 bg-white/50 hover:bg-white/70",
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </div>
          </div>

          <div className="self-stretch md:shrink-0">
            <WeatherPanel weatherWeek={resolvedWeatherWeek} selectedDateISO={selectedDateISO} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
