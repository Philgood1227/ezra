"use client";

import * as React from "react";
import { EmotionsIcon } from "@/components/child/icons/child-premium-icons";
import { EmotionCheckInCard } from "@/components/child/emotions/emotion-check-in-card";
import { WeekEmotionStrip } from "@/components/child/emotions/week-emotion-strip";
import { EmptyState, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { upsertEmotionLogAction } from "@/lib/actions/emotions";
import type { EmotionLogSummary, EmotionValue } from "@/lib/day-templates/types";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";

interface ChildEmotionsViewProps {
  todayDate: string;
  todayLogs: EmotionLogSummary[];
  weekData: Array<{ date: string; matin?: EmotionValue; soir?: EmotionValue }>;
  isLoading?: boolean;
}

function EmotionLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-radius-card" />
      <Skeleton className="h-56 w-full rounded-radius-card" count={2} />
      <Skeleton className="h-32 w-full rounded-radius-card" />
    </div>
  );
}

function upsertLog(
  logs: EmotionLogSummary[],
  payload: { moment: "matin" | "soir"; emotion: EmotionValue; note: string | null; date: string },
): EmotionLogSummary[] {
  const existingIndex = logs.findIndex((log) => log.moment === payload.moment);
  const nextLog: EmotionLogSummary = {
    id: existingIndex >= 0 ? logs[existingIndex]?.id ?? `${payload.moment}-${payload.date}` : `${payload.moment}-${payload.date}`,
    familyId: logs[existingIndex]?.familyId ?? "local",
    childProfileId: logs[existingIndex]?.childProfileId ?? "local",
    date: payload.date,
    moment: payload.moment,
    emotion: payload.emotion,
    note: payload.note,
    createdAt: logs[existingIndex]?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex < 0) {
    return [...logs, nextLog];
  }

  const clone = [...logs];
  clone[existingIndex] = nextLog;
  return clone;
}

export function ChildEmotionsView({
  todayDate,
  todayLogs,
  weekData,
  isLoading = false,
}: ChildEmotionsViewProps): React.JSX.Element {
  const toast = useToast();
  const [logs, setLogs] = React.useState(todayLogs);
  const [pendingMoment, setPendingMoment] = React.useState<"matin" | "soir" | null>(null);

  React.useEffect(() => {
    setLogs(todayLogs);
  }, [todayLogs]);

  const morningLog = logs.find((log) => log.moment === "matin") ?? null;
  const eveningLog = logs.find((log) => log.moment === "soir") ?? null;
  const completedCount = Number(Boolean(morningLog)) + Number(Boolean(eveningLog));

  const saveMoment = React.useCallback(
    (moment: "matin" | "soir", emotion: EmotionValue, note: string | null) => {
      if (pendingMoment) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, enregistrement indisponible.");
        return;
      }

      const previousLogs = logs;
      setPendingMoment(moment);
      setLogs((current) => upsertLog(current, { moment, emotion, note, date: todayDate }));

      void (async () => {
        const result = await upsertEmotionLogAction({ date: todayDate, moment, emotion, note });
        if (!result.success) {
          setLogs(previousLogs);
          setPendingMoment(null);
          toast.error("Impossible d'enregistrer cette meteo.");
          haptic("error");
          return;
        }

        setPendingMoment(null);
        toast.success("Meteo enregistree");
        haptic("success");
      })();
    },
    [logs, pendingMoment, toast, todayDate],
  );

  return (
    <section className="mx-auto w-full max-w-[900px] space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Mes emotions</h1>
        <p className="text-sm text-text-secondary">Comment je me sens ?</p>
      </header>

      {isLoading ? <EmotionLoadingSkeleton /> : null}

      {!isLoading ? (
        <>
          <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-4 shadow-card backdrop-blur-sm">
            <p className="text-sm font-semibold text-text-primary">
              {completedCount}/2 completes aujourd&apos;hui
            </p>
            <p className="text-xs text-text-secondary">{todayDate}</p>
          </div>

          <StaggerContainer className="space-y-4">
            <StaggerItem className="grid gap-4 md:grid-cols-2">
              <EmotionCheckInCard
                moment="matin"
                log={morningLog}
                isPending={pendingMoment === "matin"}
                onSave={(emotion, note) => saveMoment("matin", emotion, note)}
              />
              <EmotionCheckInCard
                moment="soir"
                log={eveningLog}
                isPending={pendingMoment === "soir"}
                onSave={(emotion, note) => saveMoment("soir", emotion, note)}
              />
            </StaggerItem>

            <StaggerItem>
              {weekData.length > 0 ? (
                <WeekEmotionStrip weekData={weekData} />
              ) : (
                <EmptyState icon={<EmotionsIcon className="size-8" />} title="Historique indisponible" description="Reessaie dans un instant." />
              )}
            </StaggerItem>
          </StaggerContainer>
        </>
      ) : null}
    </section>
  );
}
