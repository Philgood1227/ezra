"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ClockIcon,
  DayPlannerIcon,
} from "@/components/child/icons/child-premium-icons";
import { ActiveTaskCard } from "@/components/child/my-day/active-task-card";
import { FocusView } from "@/components/child/focus/focus-view";
import { Badge, Button, Card, CardContent, EmptyState, Modal, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { computeDayBalanceFromTimelineItems } from "@/lib/day-templates/balance";
import { canOpenFocusForTask } from "@/lib/day-templates/focus";
import {
  buildUnifiedTimelineItems,
  filterOutSchoolContextMirrorTasks,
  findCurrentActionItem,
} from "@/lib/day-templates/plan-items";
import {
  getCurrentAndNextTasks,
  getTaskPhase,
  sortTemplateTasks,
} from "@/lib/day-templates/timeline";
import { getCurrentMinutes, timeToMinutes } from "@/lib/day-templates/time";
import type {
  DayBalanceSummary,
  DayContextSummary,
  DayTemplateBlockSummary,
  DayTimelineItemSummary,
  RewardTierSummary,
  TaskInstanceStatus,
  TaskInstanceSummary,
} from "@/lib/day-templates/types";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";
import { playSound } from "@/lib/utils/sounds";

interface ChildDayViewLiveProps {
  instances?: TaskInstanceSummary[];
  templateBlocks?: DayTemplateBlockSummary[];
  dayContext?: DayContextSummary;
  templateName?: string;
  initialDailyPointsTotal?: number;
  rewardTiers?: RewardTierSummary[];
  hasTemplate?: boolean;
  childName?: string;
  isLoading?: boolean;
  v2Enabled?: boolean;
  timelineItems?: DayTimelineItemSummary[];
  currentContextItem?: DayTimelineItemSummary | null;
  currentActionItem?: DayTimelineItemSummary | null;
  nextTimelineItem?: DayTimelineItemSummary | null;
  dayBalance?: DayBalanceSummary;
}

const EMPTY_INSTANCES: TaskInstanceSummary[] = [];
const EMPTY_TEMPLATE_BLOCKS: DayTemplateBlockSummary[] = [];
const EMPTY_REWARD_TIERS: RewardTierSummary[] = [];
const EMPTY_TIMELINE_ITEMS: DayTimelineItemSummary[] = [];
const EMPTY_DAY_BALANCE: DayBalanceSummary = {
  unitMinutes: 15,
  totalPlannedMinutes: 0,
  buckets: [],
  missionLeisureDeltaUnits15: 0,
  comparisonLabel: "presque_pareil",
};

function getMomentLabel(moment: DayContextSummary["currentMoment"] | undefined): string {
  if (moment === "apres-midi") {
    return "Apres-midi";
  }

  if (moment === "soir") {
    return "Soir";
  }

  return "Matin";
}

function getStatusLabel(status: TaskInstanceStatus): string {
  if (status === "en_cours") {
    return "En cours";
  }

  if (status === "termine") {
    return "Termine";
  }

  if (status === "en_retard") {
    return "En retard";
  }

  return "A faire";
}

function getStatusBadgeVariant(
  status: TaskInstanceStatus,
): "warning" | "success" | "neutral" | "info" {
  if (status === "termine") {
    return "success";
  }

  if (status === "en_retard") {
    return "warning";
  }

  if (status === "ignore") {
    return "neutral";
  }

  return "info";
}

function computePointsTarget(input: {
  dailyPointsTotal: number;
  tasks: TaskInstanceSummary[];
  rewardTiers: RewardTierSummary[];
}): number {
  const taskTarget = input.tasks
    .filter((task) => !task.isReadOnly && task.status !== "ignore")
    .reduce((sum, task) => sum + task.pointsBase, 0);
  const nextReward = [...input.rewardTiers]
    .sort((left, right) => left.pointsRequired - right.pointsRequired)
    .find((tier) => tier.pointsRequired > input.dailyPointsTotal)?.pointsRequired;

  return Math.max(1, taskTarget, nextReward ?? 0);
}

function TimelinePreviewSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-[20px]" />
      <Skeleton className="h-44 w-full rounded-[20px]" />
      <Skeleton className="h-44 w-full rounded-[20px]" />
      <Skeleton className="h-14 w-full rounded-radius-button" />
    </div>
  );
}

function FocusStrip({
  onOpenFocus,
  disabled,
}: {
  onOpenFocus: () => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <Card className="rounded-[20px] border border-brand-primary/20 bg-brand-50/55 p-0 shadow-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-lg font-bold tracking-[0.01em] text-text-primary">Focus 20 / 5</p>
            <p className="reading text-base leading-relaxed text-text-secondary">
              Active ton pomodoro quand tu veux, sans urgence.
            </p>
          </div>
          <span
            aria-hidden="true"
            className="relative inline-flex size-11 items-center justify-center rounded-radius-pill border border-brand-primary/20 bg-bg-surface text-brand-primary"
          >
            <ClockIcon className="size-5" />
            <span className="absolute -inset-1 animate-pulse rounded-radius-pill border border-brand-primary/15" />
          </span>
        </div>
        <Button
          size="lg"
          variant="secondary"
          className="w-full text-[17px] font-semibold"
          onClick={onOpenFocus}
          disabled={disabled}
        >
          Focus
        </Button>
      </CardContent>
    </Card>
  );
}

function NextMomentsCard({ items }: { items: DayTimelineItemSummary[] }): React.JSX.Element {
  return (
    <Card className="rounded-[20px] border-border-default bg-bg-surface shadow-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold tracking-[0.01em] text-text-primary">
            A suivre
          </h2>
          <Badge variant="neutral">1 - 3</Badge>
        </div>
        {items.length > 0 ? (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2.5"
              >
                <p className="text-[17px] font-semibold tracking-[0.01em] text-text-primary">
                  {item.title}
                </p>
                <p className="text-base leading-relaxed text-text-secondary">
                  {item.startTime} - {item.endTime}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="reading text-base leading-relaxed text-text-secondary">
            Rien d&apos;urgent ensuite. Tu peux avancer a ton rythme.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LaterMomentsCard({
  items,
  onOpenTimeline,
}: {
  items: TaskInstanceSummary[];
  onOpenTimeline: () => void;
}): React.JSX.Element {
  return (
    <Card className="rounded-[20px] border-border-default bg-bg-surface shadow-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold tracking-[0.01em] text-text-primary">
            Plus tard
          </h2>
          <Badge variant="neutral">Compact</Badge>
        </div>
        {items.length > 0 ? (
          <ul className="space-y-2.5">
            {items.slice(0, 3).map((task) => (
              <li
                key={task.id}
                className="rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold tracking-[0.01em] text-text-primary">
                      {task.title}
                    </p>
                    <p className="text-base leading-relaxed text-text-secondary">
                      {task.startTime} - {task.endTime}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(task.status)}>
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="reading text-base leading-relaxed text-text-secondary">
            Le reste de ta journee est libre.
          </p>
        )}
        <Button
          size="md"
          variant="ghost"
          className="text-base font-semibold"
          onClick={onOpenTimeline}
        >
          Voir plus
        </Button>
      </CardContent>
    </Card>
  );
}

export function ChildDayViewLive({
  instances = EMPTY_INSTANCES,
  templateBlocks = EMPTY_TEMPLATE_BLOCKS,
  dayContext,
  templateName = "Journee type",
  initialDailyPointsTotal = 0,
  rewardTiers = EMPTY_REWARD_TIERS,
  hasTemplate = true,
  childName = "Ezra",
  isLoading = false,
  v2Enabled = false,
  timelineItems = EMPTY_TIMELINE_ITEMS,
  currentActionItem = null,
  dayBalance = EMPTY_DAY_BALANCE,
}: ChildDayViewLiveProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { date } = useCurrentTime(undefined, 60_000);
  const [, startTransition] = useTransition();

  const [localTasks, setLocalTasks] = useState<TaskInstanceSummary[]>(instances);
  const [dailyPointsTotal, setDailyPointsTotal] = useState(initialDailyPointsTotal);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [pausedTaskId, setPausedTaskId] = useState<string | null>(null);
  const [completionFeedbackTaskId, setCompletionFeedbackTaskId] = useState<string | null>(null);
  const [focusOverlayTaskId, setFocusOverlayTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    setLocalTasks(instances);
  }, [instances, isLoading]);

  useEffect(() => {
    setDailyPointsTotal(initialDailyPointsTotal);
  }, [initialDailyPointsTotal]);

  const timelineTasks = useMemo(
    () => filterOutSchoolContextMirrorTasks(localTasks, templateBlocks),
    [localTasks, templateBlocks],
  );
  const actionableTasks = useMemo(
    () => timelineTasks.filter((task) => !task.isReadOnly && task.status !== "ignore"),
    [timelineTasks],
  );
  const orderedActionableTasks = useMemo(
    () => sortTemplateTasks(actionableTasks),
    [actionableTasks],
  );
  const tasksTotal = actionableTasks.length;
  const tasksCompleted = actionableTasks.filter((task) => task.status === "termine").length;
  const currentMinutes = getCurrentMinutes(date);

  const liveTimelineItems = useMemo(() => {
    if (!v2Enabled) {
      return timelineItems;
    }

    return buildUnifiedTimelineItems({
      tasks: timelineTasks,
      blocks: templateBlocks,
    });
  }, [templateBlocks, timelineItems, timelineTasks, v2Enabled]);

  const liveCurrentActionItem = useMemo(() => {
    if (!v2Enabled) {
      return currentActionItem;
    }

    return findCurrentActionItem(liveTimelineItems, currentMinutes);
  }, [currentActionItem, currentMinutes, liveTimelineItems, v2Enabled]);

  const { currentTask, nextTask } = useMemo(
    () => getCurrentAndNextTasks(orderedActionableTasks, currentMinutes),
    [currentMinutes, orderedActionableTasks],
  );

  const currentTaskFromV2 = useMemo(() => {
    const sourceId = liveCurrentActionItem?.sourceRefId;
    if (!sourceId) {
      return null;
    }

    return timelineTasks.find((task) => task.id === sourceId) ?? null;
  }, [liveCurrentActionItem?.sourceRefId, timelineTasks]);

  const effectiveCurrentTask = v2Enabled ? (currentTaskFromV2 ?? currentTask) : currentTask;
  const focusOverlayTask = useMemo(() => {
    if (!focusOverlayTaskId) {
      return null;
    }

    return localTasks.find((task) => task.id === focusOverlayTaskId) ?? null;
  }, [focusOverlayTaskId, localTasks]);
  const showFocusForActiveTask = effectiveCurrentTask
    ? canOpenFocusForTask(effectiveCurrentTask)
    : false;
  const showCompletionFeedback = Boolean(
    effectiveCurrentTask && completionFeedbackTaskId === effectiveCurrentTask.id,
  );
  const isActiveTaskPaused = Boolean(
    effectiveCurrentTask && pausedTaskId === effectiveCurrentTask.id,
  );

  const nextMoments = useMemo(() => {
    const future = [...liveTimelineItems]
      .filter((item) => item.kind !== "context")
      .filter((item) => item.status !== "ignore" && item.status !== "termine")
      .filter((item) => timeToMinutes(item.startTime) > currentMinutes)
      .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));

    return future.slice(0, 3);
  }, [currentMinutes, liveTimelineItems]);

  const laterTasks = useMemo(() => {
    const currentTaskId = effectiveCurrentTask?.id ?? null;
    const nextTaskId = nextTask?.id ?? null;

    return orderedActionableTasks.filter((task) => {
      if (task.id === currentTaskId || task.id === nextTaskId) {
        return false;
      }

      const phase = getTaskPhase(task, currentMinutes);
      const isLate = task.status === "a_faire" && phase.isPast && !phase.isCurrent;

      return isLate || phase.isFuture;
    });
  }, [currentMinutes, effectiveCurrentTask?.id, nextTask?.id, orderedActionableTasks]);

  useEffect(() => {
    if (!pausedTaskId) {
      return;
    }

    if (
      !effectiveCurrentTask ||
      effectiveCurrentTask.id !== pausedTaskId ||
      effectiveCurrentTask.status === "termine"
    ) {
      setPausedTaskId(null);
    }
  }, [effectiveCurrentTask, pausedTaskId]);

  useEffect(() => {
    if (!focusOverlayTaskId || focusOverlayTask) {
      return;
    }

    setFocusOverlayTaskId(null);
  }, [focusOverlayTask, focusOverlayTaskId]);

  const pointsTarget = computePointsTarget({
    dailyPointsTotal,
    tasks: timelineTasks,
    rewardTiers,
  });
  const dayBalanceSummary = v2Enabled
    ? computeDayBalanceFromTimelineItems(liveTimelineItems)
    : dayBalance;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  const contextLabel = dayContext
    ? `${dateLabel} · ${dayContext.periodLabel} · ${getMomentLabel(dayContext.currentMoment)}`
    : `${dateLabel} · ${templateName}`;
  const contextLabelWithChild = `${childName} · ${contextLabel}`;

  const openTimeline = useCallback(() => {
    router.push("/child/my-day/timeline");
  }, [router]);

  const openChildSettings = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event("ezra:open-child-settings"));
  }, []);

  const handleStatusChange = useCallback(
    (instanceId: string, newStatus: TaskInstanceStatus) => {
      if (pendingInstanceId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, action indisponible.");
        return;
      }

      const currentTaskForAction = localTasks.find((task) => task.id === instanceId);
      if (!currentTaskForAction) {
        return;
      }

      const previousTasks = localTasks;
      const previousPoints = dailyPointsTotal;
      const isTapTransition = currentTaskForAction.status === "a_faire" && newStatus === "en_cours";
      const isCompletionTransition = newStatus === "termine";

      if (isTapTransition) {
        haptic("tap");
      }

      setPendingInstanceId(instanceId);
      setLocalTasks((tasks) =>
        tasks.map((task) => (task.id === instanceId ? { ...task, status: newStatus } : task)),
      );

      startTransition(async () => {
        const result = await updateTaskStatusAction({ instanceId, newStatus });
        if (!result.success || !result.data) {
          setLocalTasks(previousTasks);
          setDailyPointsTotal(previousPoints);
          setPendingInstanceId(null);
          haptic("error");
          toast.error("Erreur lors de la mise a jour.");
          return;
        }

        setLocalTasks((tasks) =>
          tasks.map((task) =>
            task.id === instanceId
              ? {
                  ...task,
                  status: result.data?.status ?? task.status,
                  pointsEarned: result.data?.pointsEarnedTask ?? task.pointsEarned,
                }
              : task,
          ),
        );
        setDailyPointsTotal(result.data.dailyPointsTotal);
        setPendingInstanceId(null);

        if (isCompletionTransition) {
          setPausedTaskId((current) => (current === instanceId ? null : current));
          setCompletionFeedbackTaskId(instanceId);
          window.setTimeout(() => {
            setCompletionFeedbackTaskId((current) => (current === instanceId ? null : current));
          }, 1800);
          haptic("success");
          playSound("taskComplete");
          toast.success("Bravo, c'est fait.");
          router.refresh();
        } else {
          setCompletionFeedbackTaskId(null);
        }

        if (result.data.unlockedAchievementLabels.length > 0) {
          toast.success(`Nouveau succes: ${result.data.unlockedAchievementLabels[0] ?? "Bravo"}`);
        }
      });
    },
    [dailyPointsTotal, localTasks, pendingInstanceId, router, toast],
  );

  const handlePauseToggle = useCallback(
    (instanceId: string) => {
      setPausedTaskId((current) => (current === instanceId ? null : instanceId));
      router.refresh();
    },
    [router],
  );

  const closeFocusOverlay = useCallback(() => {
    setFocusOverlayTaskId(null);
  }, []);

  const handleFocusMode = useCallback(
    (instanceId: string) => {
      const task = localTasks.find((entry) => entry.id === instanceId);
      if (!task || !canOpenFocusForTask(task)) {
        return;
      }

      setFocusOverlayTaskId(task.id);
    },
    [localTasks],
  );

  const handleFocusSessionComplete = useCallback(
    (focusedMinutes: number) => {
      closeFocusOverlay();
      toast.success(`Session focus terminee: ${focusedMinutes} min.`);
      router.refresh();
    },
    [closeFocusOverlay, router, toast],
  );

  const showEmptyState =
    !isLoading && (!hasTemplate || (timelineTasks.length === 0 && templateBlocks.length === 0));

  return (
    <section className="mx-auto min-h-[calc(100vh-7.5rem)] w-full max-w-[1140px] space-y-5 pb-4">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="font-display text-[30px] font-extrabold tracking-[0.01em] text-text-primary">
              Ma journee
            </h1>
            <p className="text-base font-medium leading-relaxed text-text-secondary">
              {contextLabelWithChild}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-base font-semibold"
            onClick={openChildSettings}
          >
            Reglages
          </Button>
        </div>

        {!showEmptyState && !isLoading ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">
              {tasksCompleted}/{tasksTotal} taches
            </Badge>
            <Badge variant="neutral">
              {dailyPointsTotal}/{pointsTarget} pts
            </Badge>
            <Badge variant="neutral">{dayBalanceSummary.totalPlannedMinutes} min planifiees</Badge>
          </div>
        ) : null}
      </header>

      {isLoading ? <TimelinePreviewSkeleton /> : null}

      {showEmptyState ? (
        <EmptyState
          icon={<DayPlannerIcon className="size-8" />}
          title="Pas encore de planning"
          description="Demande a tes parents de preparer ta journee type."
          action={{
            label: "Retour a l'accueil",
            onClick: () => router.push("/child"),
          }}
        />
      ) : null}

      {!isLoading && !showEmptyState ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-5">
          <div className="space-y-4">
            {effectiveCurrentTask ? (
              <ActiveTaskCard
                task={effectiveCurrentTask}
                isPaused={isActiveTaskPaused}
                isPending={pendingInstanceId === effectiveCurrentTask.id}
                showFocusAction={showFocusForActiveTask}
                showCompletionFeedback={showCompletionFeedback}
                onComplete={() => handleStatusChange(effectiveCurrentTask.id, "termine")}
                onPauseToggle={() => handlePauseToggle(effectiveCurrentTask.id)}
                onFocus={() => handleFocusMode(effectiveCurrentTask.id)}
                onOpenTimeline={openTimeline}
              />
            ) : (
              <Card
                role="button"
                tabIndex={0}
                aria-label="Ouvrir la timeline"
                onClick={openTimeline}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTimeline();
                  }
                }}
                className="rounded-[20px] border-border-default bg-bg-surface shadow-card"
              >
                <CardContent className="space-y-3 p-5 md:p-6">
                  <h2 className="font-display text-[26px] font-extrabold tracking-[0.01em] text-text-primary">
                    Maintenant
                  </h2>
                  <p className="text-[17px] font-semibold tracking-[0.01em] text-text-primary">
                    Aucun moment actif pour l&apos;instant.
                  </p>
                  <p className="reading text-base leading-relaxed text-text-secondary">
                    Ouvre la timeline pour voir toute ta journee simplement.
                  </p>
                </CardContent>
              </Card>
            )}

            {effectiveCurrentTask && showFocusForActiveTask ? (
              <FocusStrip
                onOpenFocus={() => handleFocusMode(effectiveCurrentTask.id)}
                disabled={pendingInstanceId === effectiveCurrentTask.id || isActiveTaskPaused}
              />
            ) : null}

            <Button
              size="lg"
              variant="primary"
              fullWidth
              className="from-brand-primary to-brand-primary text-[18px] font-bold tracking-[0.01em] shadow-card"
              onClick={openTimeline}
            >
              Continuer ma journee
              <ArrowRightIcon className="size-5" />
            </Button>
          </div>

          <aside className="space-y-4">
            <NextMomentsCard items={nextMoments} />
            <LaterMomentsCard items={laterTasks} onOpenTimeline={openTimeline} />
          </aside>
        </div>
      ) : null}

      <Modal
        open={Boolean(focusOverlayTask)}
        onClose={closeFocusOverlay}
        title="Focus"
        description="Minuteur doux pour t'aider a avancer calmement."
        closeLabel="Fermer le focus"
        className="max-w-4xl p-4 md:p-5"
      >
        {focusOverlayTask ? (
          <FocusView
            instance={focusOverlayTask}
            presentation="overlay"
            isTaskPaused={pausedTaskId === focusOverlayTask.id}
            onClose={closeFocusOverlay}
            onSessionComplete={handleFocusSessionComplete}
            calmPomodoroOnly
          />
        ) : null}
      </Modal>
    </section>
  );
}
