import * as React from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ProgressBar } from "@/components/ds";
import type { DashboardAssignmentShare } from "@/lib/domain/dashboard";

interface TodayLoadWidgetProps {
  score: number;
  label: string;
  assignments: DashboardAssignmentShare[];
}

function getLoadVariant(score: number): "success" | "warning" | "primary" {
  if (score <= 2) {
    return "success";
  }
  if (score >= 4) {
    return "warning";
  }
  return "primary";
}

export function TodayLoadWidget({
  score,
  label,
  assignments,
}: TodayLoadWidgetProps): React.JSX.Element {
  const normalizedScore = Math.max(0, Math.min(5, score));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Charge du jour</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Niveau</span>
            <span className="font-semibold text-text-primary">{normalizedScore}/5</span>
          </div>
          <ProgressBar value={normalizedScore} max={5} variant={getLoadVariant(normalizedScore)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {assignments.length === 0 ? (
            <Badge variant="neutral">Aucune tache prevue</Badge>
          ) : (
            assignments.map((entry) => (
              <Badge key={entry.key} variant="neutral">
                {entry.label}: {entry.count}
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

