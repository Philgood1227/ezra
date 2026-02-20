"use client";

import * as React from "react";
import { EmotionsIcon } from "@/components/child/icons/child-premium-icons";
import { Card } from "@/components/ds";
import { getEmotionEmoji } from "@/lib/domain/emotion-logs";
import type { EmotionValue } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

interface WeekEmotionStripProps {
  weekData: Array<{ date: string; matin?: EmotionValue; soir?: EmotionValue }>;
}

function getDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
    .format(new Date(dateKey))
    .replace(".", "");
}

function getTodayDateKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WeekEmotionStrip({ weekData }: WeekEmotionStripProps): React.JSX.Element {
  const todayKey = getTodayDateKey();

  return (
    <Card className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-black text-text-primary">
        <EmotionsIcon className="size-4" />
        Cette semaine
      </h2>
      <div className="grid grid-cols-7 gap-1">
        {weekData.map((entry) => {
          const isToday = entry.date === todayKey;
          return (
            <div key={entry.date} className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{getDayLabel(entry.date)}</p>
              <div
                className={cn(
                  "rounded-radius-button border border-border-subtle bg-bg-surface px-1 py-1.5",
                  isToday ? "border-brand-primary" : "",
                )}
              >
                <p className="text-xl">{entry.matin ? getEmotionEmoji(entry.matin) : "-"}</p>
                <p className="text-xl">{entry.soir ? getEmotionEmoji(entry.soir) : "-"}</p>
              </div>
              <span
                className={cn(
                  "mx-auto block h-0.5 w-5 rounded-radius-pill",
                  isToday ? "bg-brand-primary" : "bg-transparent",
                )}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
