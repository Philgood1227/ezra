import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";
import type { DashboardDaySummary } from "@/lib/domain/dashboard";
import { formatDayShort } from "./dashboard-date";

interface WeeklyPointsWidgetProps {
  daily: DashboardDaySummary[];
}

function buildPolylinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / maxValue) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export function WeeklyPointsWidget({ daily }: WeeklyPointsWidgetProps): React.JSX.Element {
  const points = daily.map((day) => day.pointsTotal);
  const polylinePoints = buildPolylinePoints(points, 320, 88);
  const totalPoints = points.reduce((total, value) => total + value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Points de la semaine</CardTitle>
        <CardDescription>Total cumule : {totalPoints} pts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3">
          <svg
            viewBox="0 0 320 88"
            className="h-24 w-full"
            role="img"
            aria-label="Courbe des points sur 7 jours"
          >
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="rgb(var(--color-primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daily.map((day) => (
            <div key={day.date} className="rounded-radius-button bg-bg-surface-hover/70 p-2 text-center">
              <p className="text-[11px] font-semibold text-text-secondary">{formatDayShort(day.date)}</p>
              <p className="text-xs font-bold text-text-primary">{day.pointsTotal}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

