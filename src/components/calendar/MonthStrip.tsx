import { cn } from "@/lib/utils";
import { getNomsMois } from "@/lib/utils/time";

export interface MonthStripProps {
  currentMonthIndex: number;
  compact?: boolean;
  className?: string;
}

const monthNames = getNomsMois();

export function MonthStrip({
  currentMonthIndex,
  compact = false,
  className,
}: MonthStripProps): React.JSX.Element {
  return (
    <div className={cn("-mx-1 overflow-x-auto px-1 pb-1", className)}>
      <ul
        aria-label="Mois de l'annee"
        className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-6 lg:grid-cols-12"
      >
        {monthNames.map((monthName, monthIndex) => {
          const isCurrent = monthIndex === currentMonthIndex;
          const isPast = monthIndex < currentMonthIndex;

          return (
            <li key={monthName}>
              <span
                aria-current={isCurrent ? "true" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-radius-pill border px-3 py-1.5 text-center text-xs font-semibold capitalize transition",
                  isCurrent
                    ? "border-brand-primary/30 bg-brand-primary/16 text-brand-primary shadow-card"
                    : "border-border-subtle bg-bg-surface text-text-secondary",
                  isPast && !isCurrent ? "opacity-65" : "",
                )}
              >
                {compact ? (
                  <>
                    <span className="sm:hidden">{monthName.slice(0, 3)}</span>
                    <span className="hidden sm:inline">{monthName}</span>
                  </>
                ) : (
                  monthName
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
