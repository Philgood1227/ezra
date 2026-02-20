"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { getCurrentMinutes } from "@/lib/day-templates/time";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { cn } from "@/lib/utils";

interface NowCursorProps {
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  timelineHeight: number;
  axisOffsetPx?: number;
  currentTime?: Date;
  anchorId?: string;
  showLabel?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function NowCursor({
  rangeStartMinutes,
  rangeEndMinutes,
  timelineHeight,
  axisOffsetPx = 36,
  currentTime,
  anchorId = "my-day-now-cursor-anchor",
  showLabel = true,
}: NowCursorProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { date } = useCurrentTime(undefined, 60_000);
  const effectiveDate = currentTime ?? date;
  const totalRange = Math.max(1, rangeEndMinutes - rangeStartMinutes);

  const top = useMemo(() => {
    const currentMinutes = getCurrentMinutes(effectiveDate);
    const percent = (clamp(currentMinutes, rangeStartMinutes, rangeEndMinutes) - rangeStartMinutes) / totalRange;
    return percent * timelineHeight;
  }, [effectiveDate, rangeEndMinutes, rangeStartMinutes, timelineHeight, totalRange]);
  const shouldShowLabel = showLabel && top >= 22 && top <= timelineHeight - 18;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: `${top}px` }} aria-label="Maintenant">
      <span
        id={anchorId}
        className="absolute left-0 top-1/2 h-px w-px -translate-y-1/2 opacity-0"
        aria-hidden="true"
      />
      <span
        className="absolute top-1/2 border-t border-dashed border-brand-primary/40"
        style={{ left: `${axisOffsetPx + 8}px`, right: "0", transform: "translateY(-50%)" }}
        aria-hidden="true"
      />
      {!prefersReducedMotion ? (
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-radius-pill bg-brand-primary/20 animate-pulse"
          style={{ left: `${axisOffsetPx}px` }}
          aria-hidden="true"
        />
      ) : null}
      <span
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-radius-pill bg-brand-primary"
        style={{ left: `${axisOffsetPx}px` }}
        aria-hidden="true"
      />
      {shouldShowLabel ? (
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-radius-pill bg-brand-primary/12 px-2 py-0.5 text-[0.8rem] font-semibold text-brand-primary md:text-sm",
          )}
          style={{ left: `${axisOffsetPx + 10}px` }}
        >
          Maintenant
        </span>
      ) : null}
    </div>
  );
}
