"use client";

import { ClockIcon } from "@/components/child/icons/child-premium-icons";
import { Badge, Button, Card, CardContent } from "@/components/ds";
import { timeToMinutes } from "@/lib/day-templates/time";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

interface ActiveTaskCardProps {
  task: TaskInstanceSummary;
  isPaused: boolean;
  isPending: boolean;
  showFocusAction: boolean;
  showCompletionFeedback: boolean;
  onComplete: () => void;
  onPauseToggle: () => void;
  onFocus: () => void;
  onOpenTimeline: () => void;
}

function getDurationLabel(task: TaskInstanceSummary): string {
  const durationMinutes = Math.max(1, timeToMinutes(task.endTime) - timeToMinutes(task.startTime));
  return `${durationMinutes} min`;
}

export function ActiveTaskCard({
  task,
  isPaused,
  isPending,
  showFocusAction,
  showCompletionFeedback,
  onComplete,
  onPauseToggle,
  onFocus,
  onOpenTimeline,
}: ActiveTaskCardProps): React.JSX.Element {
  const actionColumnsClass = showFocusAction ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <Card
      data-testid="my-day-active-task-card"
      role="button"
      tabIndex={0}
      aria-label="Ouvrir la timeline"
      onClick={onOpenTimeline}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenTimeline();
        }
      }}
      className={cn(
        "overflow-hidden rounded-[20px] border border-border-default bg-bg-surface shadow-card transition-all duration-200 hover:shadow-elevated",
        isPaused ? "opacity-80" : "",
      )}
    >
      <CardContent className="space-y-4 p-5 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-radius-pill border border-brand-primary/25 bg-brand-50 text-brand-primary">
              <ClockIcon className="size-5" />
            </span>
            <h2 className="font-display text-[26px] font-extrabold tracking-[0.01em] text-text-primary">
              Maintenant
            </h2>
          </div>
          {isPaused ? <Badge variant="neutral">En pause</Badge> : null}
        </div>

        <div className="space-y-1.5">
          <p className="truncate text-xl font-bold leading-snug tracking-[0.01em] text-text-primary">{task.title}</p>
          <p className="text-base font-medium leading-relaxed text-text-secondary">
            {task.startTime} - {task.endTime} · {getDurationLabel(task)}
          </p>
          <p className="reading text-base leading-relaxed text-text-secondary">
            Touchez cette carte pour voir la timeline detaillee.
          </p>
        </div>

        <div className={cn("grid grid-cols-1 gap-2.5", actionColumnsClass)} onClick={(event) => event.stopPropagation()}>
          <Button
            size="lg"
            variant="primary"
            className="w-full from-brand-primary to-brand-primary text-[17px] font-bold"
            loading={isPending}
            disabled={isPending}
            onClick={onComplete}
          >
            Je termine
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full text-[17px] font-semibold"
            onClick={onPauseToggle}
            disabled={isPending}
          >
            {isPaused ? "Reprendre" : "Pause"}
          </Button>
          {showFocusAction ? (
            <Button
              size="lg"
              variant="tertiary"
              className="w-full text-[17px] font-semibold"
              onClick={onFocus}
              disabled={isPending || isPaused}
              aria-label="Ouvrir le focus"
            >
              <ClockIcon className="size-4" />
              <span>Focus</span>
            </Button>
          ) : null}
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-radius-button border border-status-success/35 bg-status-success/12 px-3 py-2 text-base font-semibold text-status-success transition-all duration-200",
            showCompletionFeedback ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
          )}
          aria-live="polite"
        >
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-radius-pill bg-status-success/18 text-sm transition-transform duration-200",
              showCompletionFeedback ? "scale-100" : "scale-90",
            )}
            aria-hidden="true"
          >
            &#10003;
          </span>
          <span>Bravo, c&apos;est fait.</span>
        </div>
      </CardContent>
    </Card>
  );
}
