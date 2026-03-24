"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MissionsSummaryCard, mapTasksToMissions } from "@/components/missions";
import {
  buildTodayViewModel,
  TodayHeader,
  TodayRewards,
} from "@/components/child/today";
import { FloatingSchoolTimeTimer } from "@/components/child/floating-school-time-timer";
import { Card, CardContent, Skeleton } from "@/components/ds";
import type { ChildHomeData } from "@/lib/api/child-home";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { getDateKeyInTimeZone } from "@/lib/weather/date";
import { createFallbackWeatherWeekUI } from "@/lib/weather/types";

interface ChildHomeLiveProps {
  data?: ChildHomeData;
  initialDateIso?: string;
  timezone?: string;
  isLoading?: boolean;
}

function parseInitialDate(
  initialDateIso: string | undefined,
  fallbackDate: Date | undefined,
): Date {
  if (initialDateIso) {
    const parsed = new Date(initialDateIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallbackDate ?? new Date();
}

function isSameDateInTimeZone(left: Date, right: Date, timezone: string): boolean {
  return getDateKeyInTimeZone(left, timezone) === getDateKeyInTimeZone(right, timezone);
}

export function ChildHomeLive({
  data,
  initialDateIso,
  timezone = "Europe/Zurich",
  isLoading = false,
}: ChildHomeLiveProps): React.JSX.Element {
  const router = useRouter();
  const loading = isLoading || !data;
  const initialDate = React.useMemo(
    () => parseInitialDate(initialDateIso, data?.date),
    [data?.date, initialDateIso],
  );
  const isViewingToday = React.useMemo(
    () => isSameDateInTimeZone(initialDate, new Date(), timezone),
    [initialDate, timezone],
  );
  const { date: liveDate } = useCurrentTime(initialDate, isViewingToday ? 1000 : 60_000);
  const date = isViewingToday ? liveDate : initialDate;
  const selectedDateISO = React.useMemo(() => getDateKeyInTimeZone(date, timezone), [date, timezone]);
  const weatherWeek = React.useMemo(
    () =>
      data?.weatherWeek ??
      createFallbackWeatherWeekUI({
        timezone,
        selectedDateISO,
      }),
    [data?.weatherWeek, selectedDateISO, timezone],
  );
  const missions = React.useMemo(() => mapTasksToMissions(data?.todayTasks ?? []), [data?.todayTasks]);

  if (loading || !data) {
    return (
      <section className="child-home-layout w-full space-y-[var(--page-section-gap)] pb-4" data-testid="child-home-layout">
        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-16 w-full rounded-radius-card" />
            <Skeleton className="h-28 w-full rounded-radius-card" />
          </CardContent>
        </Card>
        <div className="child-home-cards-grid grid grid-cols-1 gap-4 min-[1000px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <Skeleton className="h-44 w-full rounded-radius-card" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-radius-card" />
            <Skeleton className="h-48 w-full rounded-radius-card" />
          </div>
        </div>
      </section>
    );
  }

  const todayViewModel = buildTodayViewModel({
    date,
    data,
  });
  const showSchoolTimer = isViewingToday && data.dayPeriod === "ecole";

  return (
    <section
      className="child-home-layout w-full space-y-[var(--page-section-gap)] pb-4"
      data-testid="child-home-layout"
    >
      <FloatingSchoolTimeTimer visible={showSchoolTimer} />
      <TodayHeader
        date={date}
        timezone={timezone}
        weatherWeek={weatherWeek}
        selectedDateISO={selectedDateISO}
        currentSegmentId={todayViewModel.currentSegmentId}
        segments={todayViewModel.segments}
        onSelectDay={(selectedDate) => {
          const dateKey = getDateKeyInTimeZone(selectedDate, timezone);
          const todayKey = getDateKeyInTimeZone(new Date(), timezone);
          if (dateKey === todayKey) {
            router.push("/child");
            return;
          }
          router.push(`/child?date=${dateKey}`);
        }}
      />
      <div className="child-home-cards-grid grid grid-cols-1 gap-4 min-[1000px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] min-[1000px]:items-stretch">
        <MissionsSummaryCard missions={missions} />

        <div className="child-home-secondary-column space-y-4">
          <TodayRewards summary={todayViewModel.rewards} />
        </div>
      </div>
    </section>
  );
}
