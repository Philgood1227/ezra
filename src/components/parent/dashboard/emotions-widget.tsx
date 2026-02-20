import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import type { DashboardDaySummary } from "@/lib/domain/dashboard";
import { formatDayShort } from "./dashboard-date";

interface EmotionsWidgetProps {
  daily: DashboardDaySummary[];
  moodMessage: string;
}

export function EmotionsWidget({ daily, moodMessage }: EmotionsWidgetProps): React.JSX.Element {
  return (
    <Card id="emotions" className="h-full scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-lg">Humeur de la semaine</CardTitle>
        <CardDescription>{moodMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-2">
          {daily.map((day) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1 rounded-radius-button border border-border-subtle bg-bg-surface-hover/70 p-2"
            >
              <p className="text-[11px] font-semibold text-text-secondary">{formatDayShort(day.date)}</p>
              <p className="text-xl">{day.dominantEmotionEmoji ?? "—"}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

