import { Badge } from "@/components/ds";
import { cn } from "@/lib/utils";
import { getSeason } from "@/lib/utils/season";

export interface SeasonBadgeProps {
  date: Date;
  className?: string;
}

export function SeasonBadge({ date, className }: SeasonBadgeProps): React.JSX.Element {
  const season = getSeason(date);

  return (
    <Badge
      variant="neutral"
      aria-label={`Saison actuelle : ${season.label}`}
      className={cn("inline-flex gap-2 px-3 py-1.5 text-sm font-semibold", season.colorClass, className)}
    >
      <span aria-hidden>{season.icon}</span>
      <span>{season.label}</span>
    </Badge>
  );
}
