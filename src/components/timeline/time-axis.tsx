import { cn } from "@/lib/utils";

interface TimeAxisProps {
  hourMarkers: number[];
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  timelineHeight: number;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function TimeAxis({
  hourMarkers,
  rangeStartMinutes,
  rangeEndMinutes,
  timelineHeight,
  className,
}: TimeAxisProps): React.JSX.Element {
  const totalRange = Math.max(1, rangeEndMinutes - rangeStartMinutes);

  return (
    <aside className={cn("relative", className)} style={{ height: `${timelineHeight}px` }} aria-label="Axe horaire">
      <div className="absolute bottom-0 left-9 top-0 border-l-2 border-border-default" />
      {hourMarkers.map((hour) => {
        const top =
          ((clamp(hour * 60, rangeStartMinutes, rangeEndMinutes) - rangeStartMinutes) / totalRange) * timelineHeight;

        return (
          <div
            key={hour}
            className="absolute left-0 right-0 -translate-y-1/2"
            style={{ top: `${top}px` }}
            aria-hidden="true"
          >
            <span className="block pr-2 text-right text-[0.8rem] font-semibold text-text-muted md:pr-3 md:text-sm">
              {formatHour(hour)}
            </span>
            <span className="absolute left-[35px] top-1/2 size-2 -translate-y-1/2 rounded-radius-pill bg-border-default" />
          </div>
        );
      })}
    </aside>
  );
}
