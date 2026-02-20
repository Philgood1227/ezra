import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import type { DashboardDaySummary } from "@/lib/domain/dashboard";
import { formatDayShort } from "./dashboard-date";

interface WeeklyTasksWidgetProps {
  daily: DashboardDaySummary[];
}

export function WeeklyTasksWidget({ daily }: WeeklyTasksWidgetProps): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Taches completees</CardTitle>
        <CardDescription>Progression sur 7 jours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {daily.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end rounded-radius-button bg-bg-surface-hover/70 p-1">
                <div
                  className="w-full rounded-radius-button bg-brand-primary/80 transition-all duration-300"
                  style={{ height: `${Math.max(8, day.completionRate)}%` }}
                  aria-label={`${day.completionRate}%`}
                />
              </div>
              <p className="text-xs font-semibold text-text-secondary">{formatDayShort(day.date)}</p>
              <p className="text-[11px] text-text-muted">{day.completionRate}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

