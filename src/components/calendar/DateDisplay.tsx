import { cn } from "@/lib/utils";
import { getNomJour, getNomMois } from "@/lib/utils/time";

export interface DateDisplayProps {
  date: Date;
  className?: string;
}

export function DateDisplay({ date, className }: DateDisplayProps): React.JSX.Element {
  const fullDate = `${getNomJour(date)} ${date.getDate()} ${getNomMois(date)} ${date.getFullYear()}`;

  return (
    <p
      aria-label={`Date du jour : ${fullDate}`}
      className={cn("font-display text-2xl font-bold tracking-tight text-ink-strong", className)}
    >
      {fullDate}
    </p>
  );
}

