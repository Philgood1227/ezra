import * as React from "react";
import { Card, CardContent } from "@/components/ds";
import { cn } from "@/lib/utils";

type KpiTrendTone = "up" | "down" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  detail?: string;
  trend?: string;
  trendTone?: KpiTrendTone;
}

const trendToneClasses: Record<KpiTrendTone, string> = {
  up: "text-status-success",
  down: "text-status-error",
  neutral: "text-text-secondary",
};

export function KpiCard({
  label,
  value,
  icon,
  detail,
  trend,
  trendTone = "neutral",
}: KpiCardProps): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-secondary">{label}</p>
            <p className="text-3xl font-black tracking-tight text-text-primary">{value}</p>
            {detail ? <p className="text-xs text-text-secondary">{detail}</p> : null}
          </div>
          <div className="inline-flex size-11 items-center justify-center rounded-radius-pill bg-brand-primary/15 text-brand-primary">
            {icon}
          </div>
        </div>
        {trend ? (
          <p className={cn("text-xs font-semibold", trendToneClasses[trendTone])}>{trend}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

