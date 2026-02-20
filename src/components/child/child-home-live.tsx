"use client";

import * as React from "react";
import { ChildHomeNowCard, TodayHeader, ToolsAndKnowledgeCard } from "@/components/child/home";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import type { ChildHomeData } from "@/lib/api/child-home";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";

interface ChildHomeLiveProps {
  data?: ChildHomeData;
  initialDateIso?: string;
  timezone?: string;
  isLoading?: boolean;
}

function parseInitialDate(initialDateIso: string | undefined, fallbackDate: Date | undefined): Date {
  if (initialDateIso) {
    const parsed = new Date(initialDateIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallbackDate ?? new Date();
}

export function ChildHomeLive({
  data,
  initialDateIso,
  timezone = "Europe/Zurich",
  isLoading = false,
}: ChildHomeLiveProps): React.JSX.Element {
  const loading = isLoading || !data;
  const initialDate = React.useMemo(
    () => parseInitialDate(initialDateIso, data?.date),
    [data?.date, initialDateIso],
  );
  const { date } = useCurrentTime(initialDate);

  return (
    <section className="relative mx-auto w-full max-w-full" data-testid="child-home-layout">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-32 rounded-radius-card bg-gradient-to-b from-brand-50/45 to-transparent blur-2xl" />
      <StaggerContainer
        className="relative grid w-full gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)] lg:items-start lg:gap-4"
        data-testid="child-home-shared-container"
      >
        <StaggerItem className="w-full lg:col-span-2">
          <TodayHeader date={date} timezone={timezone} isLoading={loading} className="w-full" />
        </StaggerItem>

        <StaggerItem className="w-full">
          <ChildHomeNowCard
            nowState={data?.nowState ?? "no_tasks"}
            currentTask={data?.currentTask ?? null}
            nextTask={data?.nextTask ?? null}
            activeSchoolBlockEndTime={data?.activeSchoolBlockEndTime ?? null}
            className="w-full"
            isLoading={loading}
          />
        </StaggerItem>

        <StaggerItem className="w-full">
          <ToolsAndKnowledgeCard className="w-full" />
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
