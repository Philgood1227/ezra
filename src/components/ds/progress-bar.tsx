import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressVariants = cva("h-full rounded-radius-pill transition-[width] duration-500 ease-out", {
  variants: {
    variant: {
      primary: "bg-brand-primary",
      success: "bg-status-success",
      warning: "bg-status-warning",
      "accent-warm": "bg-accent-warm",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  variant,
  className,
  ...props
}: ProgressBarProps): React.JSX.Element {
  const clampedValue = Math.min(Math.max(value, 0), max);
  const percent = Math.round((clampedValue / max) * 100);

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {showLabel ? <p className="text-xs font-medium text-text-secondary">{percent}%</p> : null}
      <div className="h-3 w-full overflow-hidden rounded-radius-pill bg-bg-surface-hover">
        <div className={cn(progressVariants({ variant }))} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
