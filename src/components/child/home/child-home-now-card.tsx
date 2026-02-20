"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ClockIcon,
  SparkIcon,
  getActivityIconByColorKey,
  getActivityVisual,
} from "@/components/child/icons/child-premium-icons";
import { Button, Card, CardContent, Skeleton } from "@/components/ds";
import type { ChildHomeNowState, ChildHomeTaskSummary } from "@/lib/api/child-home";
import { cn } from "@/lib/utils";

interface ChildHomeNowCardProps {
  nowState: ChildHomeNowState;
  currentTask: ChildHomeTaskSummary | null;
  nextTask: ChildHomeTaskSummary | null;
  activeSchoolBlockEndTime: string | null;
  className?: string;
  isLoading?: boolean;
}

interface FocusContent {
  key: string;
  title: string;
  timeLabel: string;
  colorKey: string | null;
}

function getCurrentFocusContent(input: {
  nowState: ChildHomeNowState;
  currentTask: ChildHomeTaskSummary | null;
  nextTask: ChildHomeTaskSummary | null;
  activeSchoolBlockEndTime: string | null;
}): FocusContent {
  if (input.currentTask) {
    return {
      key: `current-${input.currentTask.title}-${input.currentTask.startTime}-${input.currentTask.endTime}`,
      title: input.currentTask.title,
      timeLabel: `Jusqu'a ${input.currentTask.endTime}`,
      colorKey: input.currentTask.colorKey,
    };
  }

  if (input.nowState === "school_block") {
    return {
      key: `school-${input.activeSchoolBlockEndTime ?? "now"}`,
      title: "Ecole",
      timeLabel: input.activeSchoolBlockEndTime ? `Jusqu'a ${input.activeSchoolBlockEndTime}` : "Maintenant",
      colorKey: "category-ecole",
    };
  }

  if (input.nowState === "before_first_task") {
    return {
      key: `before-${input.nextTask?.startTime ?? "none"}`,
      title: "Pause",
      timeLabel: input.nextTask?.startTime ? `Debut ${input.nextTask.startTime}` : "Bientot",
      colorKey: input.nextTask?.colorKey ?? "category-calme",
    };
  }

  if (input.nowState === "between_tasks") {
    return {
      key: `between-${input.nextTask?.startTime ?? "none"}`,
      title: "Pause",
      timeLabel: input.nextTask?.startTime ? `Debut ${input.nextTask.startTime}` : "Ensuite",
      colorKey: input.nextTask?.colorKey ?? "category-calme",
    };
  }

  if (input.nowState === "after_last_task") {
    return {
      key: "after-last-task",
      title: "Journee finie",
      timeLabel: "Bravo",
      colorKey: "category-loisir",
    };
  }

  return {
    key: "no-task",
    title: "Pas de tache",
    timeLabel: "A preparer",
    colorKey: "category-routine",
  };
}

function getNextContent(nextTask: ChildHomeTaskSummary | null): FocusContent {
  if (!nextTask) {
    return {
      key: "next-empty",
      title: "Rien apres",
      timeLabel: "Pour aujourd'hui",
      colorKey: "category-calme",
    };
  }

  return {
    key: `next-${nextTask.title}-${nextTask.startTime}-${nextTask.endTime}`,
    title: nextTask.title,
    timeLabel: `${nextTask.startTime} - ${nextTask.endTime}`,
    colorKey: nextTask.colorKey,
  };
}

export function ChildHomeNowCard({
  nowState,
  currentTask,
  nextTask,
  activeSchoolBlockEndTime,
  className,
  isLoading = false,
}: ChildHomeNowCardProps): React.JSX.Element {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const currentContent = useMemo(
    () =>
      getCurrentFocusContent({
        nowState,
        currentTask,
        nextTask,
        activeSchoolBlockEndTime,
      }),
    [activeSchoolBlockEndTime, currentTask, nextTask, nowState],
  );
  const nextContent = useMemo(() => getNextContent(nextTask), [nextTask]);

  const currentVisual = getActivityVisual(currentContent.colorKey);
  const nextVisual = getActivityVisual(nextContent.colorKey);
  const CurrentIcon = getActivityIconByColorKey(currentContent.colorKey);
  const NextIcon = getActivityIconByColorKey(nextContent.colorKey);
  const currentTaskTypeIconTestId = `now-task-category-icon-${currentContent.colorKey ?? "default"}`;

  if (isLoading) {
    return (
      <Card className={cn("border-brand-primary/35 bg-accent-50/22 p-4 shadow-elevated", className)}>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-40 w-full rounded-radius-card" />
          <Skeleton className="h-20 w-full rounded-radius-button" />
          <Skeleton className="h-touch-lg w-full rounded-radius-button" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-brand-primary/28 bg-gradient-to-br from-brand-50/24 via-bg-elevated to-accent-50/30 p-4 shadow-elevated md:p-3.5 xl:p-4",
        className,
      )}
      data-testid="child-home-now-card"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-radius-pill bg-brand-primary/16 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -left-10 bottom-0 size-24 rounded-radius-pill bg-brand-secondary/12 blur-2xl" />

      <CardContent className="relative space-y-3 md:space-y-2.5 xl:space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-brand-primary/24 bg-brand-primary/12 text-brand-primary shadow-card">
            <ClockIcon className="size-4" />
          </span>
          <h2 className="font-display text-2xl font-black tracking-tight text-text-primary md:text-xl xl:text-2xl">En ce moment</h2>
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.article
            key={currentContent.key}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: "easeOut" }}
            className={cn(
              "rounded-radius-card border px-4 py-4 shadow-elevated md:px-3.5 md:py-3.5 xl:px-4 xl:py-4",
              currentVisual.borderClass,
              currentVisual.softClass,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <motion.span
                  className="inline-flex h-touch-sm items-center gap-1.5 rounded-radius-pill border border-brand-primary/32 bg-brand-primary/14 px-3 text-xs font-black uppercase tracking-wide text-brand-primary"
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0.88, 1, 0.88] }}
                  transition={{ duration: 1.7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  <SparkIcon className="size-3.5" />
                  Maintenant
                </motion.span>

                <p className="text-2xl font-black leading-tight text-text-primary md:text-xl xl:text-2xl">{currentContent.title}</p>
                <p className="text-sm font-semibold text-text-secondary md:text-sm">{currentContent.timeLabel}</p>
              </div>

              <div className="relative shrink-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-radius-pill opacity-55 blur-md",
                    currentVisual.haloClass,
                    prefersReducedMotion ? "" : "motion-safe:animate-pulse",
                  )}
                />
                <span
                  data-testid={currentTaskTypeIconTestId}
                  className={cn(
                    "relative inline-flex size-16 items-center justify-center rounded-radius-pill border bg-bg-surface/92 shadow-card md:size-14 xl:size-16",
                    currentVisual.borderClass,
                    currentVisual.iconToneClass,
                  )}
                  aria-hidden="true"
                >
                  <CurrentIcon className="size-8 md:size-7 xl:size-8" />
                </span>
              </div>
            </div>
          </motion.article>
        </AnimatePresence>

        <AnimatePresence initial={false} mode="wait">
          <motion.article
            key={nextContent.key}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: "easeOut" }}
            className="rounded-radius-button border border-border-subtle bg-bg-surface/92 px-3 py-3 shadow-card"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-text-secondary">ENSUITE</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-radius-pill border bg-bg-surface shadow-card",
                  nextVisual.borderClass,
                  nextVisual.iconToneClass,
                )}
                aria-hidden="true"
              >
                <NextIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-text-primary">{nextContent.title}</p>
                <p className="text-sm text-text-secondary">{nextContent.timeLabel}</p>
              </div>
              <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-subtle bg-bg-surface text-text-secondary">
                <ArrowRightIcon className="size-4" />
              </span>
            </div>
          </motion.article>
        </AnimatePresence>

        <Button
          size="lg"
          variant="primary"
          className="w-full"
          onClick={() => router.push("/child/my-day")}
        >
          Voir ma journee
        </Button>
      </CardContent>
    </Card>
  );
}
