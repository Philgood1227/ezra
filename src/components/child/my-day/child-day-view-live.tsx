"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, DayPlannerIcon } from "@/components/child/icons/child-premium-icons";
import { Badge, Button, Card, CardContent, EmptyState, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { FadeIn } from "@/components/motion";
import { DailyProgressBar } from "@/components/timeline/daily-progress-bar";
import { DayTimeline } from "@/components/timeline/day-timeline";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { computeDayBalanceFromTimelineItems } from "@/lib/day-templates/balance";
import {
  buildUnifiedTimelineItems,
  filterOutSchoolContextMirrorTasks,
  findCurrentActionItem,
  findCurrentContextItem,
  findNextTimelineItem,
} from "@/lib/day-templates/plan-items";
import { getCurrentAndNextTasks, getTaskPhase, sortTemplateTasks } from "@/lib/day-templates/timeline";
import { getCurrentMinutes } from "@/lib/day-templates/time";
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
import { cn } from "@/lib/utils";
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

interface PrimaryAction {
  label: string;
  status: TaskInstanceStatus;
}

type MobileViewMode = "guided" | "timeline";

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

function getFirstName(value: string | undefined): string {
  if (!value) {
    return "Ezra";
  }

  return value.trim().split(/\s+/)[0] ?? "Ezra";
}

function getMomentLabel(moment: DayContextSummary["currentMoment"] | undefined): string {
  if (moment === "apres-midi") {
    return "Apres-midi";
  }

  if (moment === "soir") {
    return "Soir";
  }

  return "Matin";
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

function getEffectiveStatus(task: TaskInstanceSummary, currentMinutes: number): TaskInstanceStatus {
  const phase = getTaskPhase(task, currentMinutes);
  const isLate = task.status === "a_faire" && phase.isPast && !phase.isCurrent;

  return isLate ? "en_retard" : task.status;
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

  if (status === "ignore") {
    return "Ignore";
  }

  return "A faire";
}

function getPrimaryAction(status: TaskInstanceStatus): PrimaryAction | null {
  if (status === "en_cours") {
    return { label: "Valider", status: "termine" };
  }

  if (status === "a_faire" || status === "en_retard") {
    return { label: "Commencer", status: "en_cours" };
  }

  return null;
}

function getStatusBadgeVariant(status: TaskInstanceStatus): "warning" | "success" | "neutral" | "info" {
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

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>["variant"]>;

function getTimelineKindLabel(item: DayTimelineItemSummary): string {
  if (item.kind === "context") {
    return "Repere";
  }

  if (item.kind === "activity") {
    return "Activite";
  }

  if (item.kind === "leisure") {
    return "Loisir";
  }

  return "Mission";
}

function getTimelineKindBadgeVariant(item: DayTimelineItemSummary): BadgeVariant {
  if (item.kind === "context") {
    if (item.subkind === "school") {
      return "ecole";
    }
    if (item.subkind === "club") {
      return "sport";
    }
    return "neutral";
  }

  if (item.kind === "activity") {
    return "sport";
  }

  if (item.kind === "leisure") {
    return "loisir";
  }

  return "info";
}

function getNextStepMessage(input: {
  nextTimelineItem: DayTimelineItemSummary | null;
  fallbackNextTask: TaskInstanceSummary | null;
}): string {
  const nextTimelineItem = input.nextTimelineItem;
  if (nextTimelineItem) {
    if (nextTimelineItem.kind === "context") {
      return `${nextTimelineItem.title} a ${nextTimelineItem.startTime}`;
    }
    return `Prochaine tache a ${nextTimelineItem.startTime}`;
  }

  if (input.fallbackNextTask?.startTime) {
    return `Prochaine tache a ${input.fallbackNextTask.startTime}`;
  }

  return "Rien pour le moment";
}

function getContextNowHeadline(contextItem: DayTimelineItemSummary | null): string {
  if (!contextItem || contextItem.kind !== "context") {
    return "Pause";
  }

  if (contextItem.subkind === "home") {
    return "Tu es a la maison";
  }

  if (contextItem.subkind === "transport") {
    return "Tu es en trajet";
  }

  if (contextItem.subkind === "club") {
    return "Tu es au club";
  }

  if (contextItem.subkind === "daycare") {
    return "Tu es a la garderie";
  }

  return contextItem.title || "Contexte en cours";
}

function getDayBalanceSummaryLabel(balance: DayBalanceSummary): string {
  const delta = balance.missionLeisureDeltaUnits15;
  if (delta === 0) {
    return "Missions et loisirs: meme nombre d'unites aujourd'hui.";
  }

  if (delta > 0) {
    return `Missions: ${delta} unite${delta > 1 ? "s" : ""} de plus que les loisirs.`;
  }

  const leisureDelta = Math.abs(delta);
  return `Loisirs: ${leisureDelta} unite${leisureDelta > 1 ? "s" : ""} de plus que les missions.`;
}

function getDayBalanceBucketTone(kind: DayBalanceSummary["buckets"][number]["kind"]): string {
  if (kind === "school") {
    return "bg-category-ecole";
  }

  if (kind === "activities") {
    return "bg-category-sport";
  }

  if (kind === "leisure") {
    return "bg-category-loisir";
  }

  return "bg-brand-primary";
}

function TimelineLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full rounded-radius-card" />
      <Skeleton className="h-12 w-full rounded-radius-card" />
      <div className="rounded-radius-card border border-border-subtle bg-bg-surface/60 p-3 shadow-card backdrop-blur-sm">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-radius-button border border-border-subtle p-3">
              <Skeleton className="size-10" circle />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-touch-md w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileModeToggle({
  mode,
  onChange,
}: {
  mode: MobileViewMode;
  onChange: (mode: MobileViewMode) => void;
}): React.JSX.Element {
  return (
    <div className="inline-flex w-full rounded-radius-button border border-border-default bg-bg-surface p-1 shadow-card">
      <button
        type="button"
        className={cn(
          "h-touch-sm flex-1 rounded-radius-button text-sm font-semibold transition-colors",
          mode === "guided" ? "bg-brand-primary/12 text-brand-primary" : "text-text-secondary hover:text-text-primary",
        )}
        onClick={() => onChange("guided")}
      >
        Guidee
      </button>
      <button
        type="button"
        className={cn(
          "h-touch-sm flex-1 rounded-radius-button text-sm font-semibold transition-colors",
          mode === "timeline" ? "bg-brand-primary/12 text-brand-primary" : "text-text-secondary hover:text-text-primary",
        )}
        onClick={() => onChange("timeline")}
      >
        Timeline
      </button>
    </div>
  );
}

function CurrentFocusCard({
  currentTask,
  nextTask,
  currentContextItem,
  nextTimelineItem,
  dayContext,
  currentMinutes,
  pendingInstanceId,
  onStatusChange,
  onFocusMode,
}: {
  currentTask: TaskInstanceSummary | null;
  nextTask: TaskInstanceSummary | null;
  currentContextItem: DayTimelineItemSummary | null;
  nextTimelineItem: DayTimelineItemSummary | null;
  dayContext: DayContextSummary | undefined;
  currentMinutes: number;
  pendingInstanceId: string | null;
  onStatusChange: (instanceId: string, newStatus: TaskInstanceStatus) => void;
  onFocusMode: (instanceId: string) => void;
}): React.JSX.Element {
  const showSchoolMessage =
    Boolean(dayContext?.isInSchoolBlock) ||
    Boolean(currentContextItem && currentContextItem.kind === "context" && currentContextItem.subkind === "school");
  const effectiveTask = showSchoolMessage ? null : currentTask;
  const effectiveStatus = effectiveTask ? getEffectiveStatus(effectiveTask, currentMinutes) : null;
  const primaryAction = effectiveStatus ? getPrimaryAction(effectiveStatus) : null;
  const isPending = Boolean(effectiveTask && pendingInstanceId === effectiveTask.id);
  const contextNowItem =
    !showSchoolMessage && !effectiveTask && currentContextItem?.kind === "context" ? currentContextItem : null;
  const schoolEndTime =
    currentContextItem && currentContextItem.kind === "context" && currentContextItem.subkind === "school"
      ? currentContextItem.endTime
      : dayContext?.activeSchoolBlockEndTime;
  const nextStepMessage = getNextStepMessage({
    nextTimelineItem,
    fallbackNextTask: nextTask,
  });

  return (
    <Card className="overflow-hidden border-brand-primary/26 bg-gradient-to-br from-brand-50/28 via-bg-surface to-accent-50/22 shadow-elevated">
      <CardContent className="space-y-3 p-4 md:p-3.5 xl:p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-brand-primary/28 bg-brand-primary/10 text-brand-primary">
            <ClockIcon className="size-4" />
          </span>
          <h2 className="font-display text-2xl font-black tracking-tight text-text-primary md:text-xl xl:text-2xl">
            Maintenant
          </h2>
        </div>

        {showSchoolMessage ? (
          <div className="space-y-1">
            <p className="text-xl font-black leading-snug text-text-primary">Tu es a l&apos;ecole</p>
            <p className="text-base font-medium text-text-secondary">
              {schoolEndTime
                ? `Jusqu'a ${schoolEndTime}`
                : "Pendant ce bloc"}
            </p>
          </div>
        ) : contextNowItem ? (
          <div className="space-y-1">
            <p className="text-xl font-black leading-snug text-text-primary">{getContextNowHeadline(contextNowItem)}</p>
            <p className="text-base font-medium text-text-secondary">Jusqu&apos;a {contextNowItem.endTime}</p>
          </div>
        ) : effectiveTask ? (
          <div className="space-y-1.5">
            <Badge variant={getStatusBadgeVariant(effectiveStatus ?? "a_faire")}>{getStatusLabel(effectiveStatus ?? "a_faire")}</Badge>
            <p className="text-xl font-black leading-snug text-text-primary md:text-lg xl:text-xl">{effectiveTask.title}</p>
            <p className="text-base font-medium text-text-secondary">
              {effectiveTask.startTime} - {effectiveTask.endTime}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xl font-black leading-snug text-text-primary">Pause</p>
            <p className="text-base font-medium text-text-secondary">{nextStepMessage}</p>
          </div>
        )}

        {effectiveTask && primaryAction ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              variant={primaryAction.status === "termine" ? "primary" : "secondary"}
              loading={isPending}
              disabled={isPending}
              onClick={() => onStatusChange(effectiveTask.id, primaryAction.status)}
            >
              {primaryAction.label}
            </Button>
            <button
              type="button"
              className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
              onClick={() => onFocusMode(effectiveTask.id)}
            >
              Focus
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NextTaskCard({
  nextTask,
  nextTimelineItem,
}: {
  nextTask: TaskInstanceSummary | null;
  nextTimelineItem: DayTimelineItemSummary | null;
}): React.JSX.Element {
  const itemLabel = nextTimelineItem ? getTimelineKindLabel(nextTimelineItem) : null;
  const itemVariant = nextTimelineItem ? getTimelineKindBadgeVariant(nextTimelineItem) : null;
  const title = nextTimelineItem?.title ?? nextTask?.title ?? "Rien apres";
  const details = nextTimelineItem
    ? `${nextTimelineItem.startTime} - ${nextTimelineItem.endTime}`
    : nextTask
      ? `Debut ${nextTask.startTime}`
      : "Pour aujourd'hui";

  return (
    <Card className="border-border-default bg-bg-surface/95 shadow-card">
      <CardContent className="space-y-2 p-4 md:p-3.5 xl:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-text-secondary">Ensuite</h3>
          {itemLabel && itemVariant ? <Badge variant={itemVariant}>{itemLabel}</Badge> : null}
        </div>
        {nextTimelineItem || nextTask ? (
          <>
            <p className="text-lg font-black leading-snug text-text-primary md:text-base xl:text-lg">{title}</p>
            <p className="text-base font-medium text-text-secondary md:text-sm xl:text-base">{details}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-black leading-snug text-text-primary md:text-base xl:text-lg">Rien apres</p>
            <p className="text-base font-medium text-text-secondary md:text-sm xl:text-base">
              Pour aujourd&apos;hui
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DayBalanceUnitsCard({ dayBalance }: { dayBalance: DayBalanceSummary }): React.JSX.Element {
  const totalUnits = dayBalance.buckets.reduce((sum, bucket) => sum + bucket.units15Planned, 0);

  return (
    <Card className="border-border-default bg-bg-surface/95 shadow-card">
      <CardContent className="space-y-3 p-4 md:p-3.5 xl:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black leading-snug text-text-primary md:text-base xl:text-lg">Repere du temps</h2>
          <Badge variant="neutral">1 unite = {dayBalance.unitMinutes} min</Badge>
        </div>

        {dayBalance.buckets.length === 0 || totalUnits === 0 ? (
          <p className="text-sm font-medium text-text-secondary">Pas encore de durees planifiees aujourd&apos;hui.</p>
        ) : (
          <div className="space-y-2.5">
            {dayBalance.buckets.map((bucket) => {
              const widthPercent =
                bucket.units15Planned > 0 ? Math.max(4, Math.round((bucket.units15Planned / totalUnits) * 100)) : 0;
              const toneClassName = getDayBalanceBucketTone(bucket.kind);
              return (
                <div key={bucket.kind} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary">{bucket.label}</p>
                    <p className="text-sm font-medium text-text-secondary">
                      {bucket.units15Planned} unite{bucket.units15Planned > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="h-2 rounded-radius-pill bg-border-subtle/70">
                    <div
                      className={cn("h-2 rounded-radius-pill", toneClassName)}
                      style={{ width: `${widthPercent}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm font-medium text-text-secondary">{getDayBalanceSummaryLabel(dayBalance)}</p>
      </CardContent>
    </Card>
  );
}

function LaterTasksCard({
  tasks,
  currentMinutes,
}: {
  tasks: TaskInstanceSummary[];
  currentMinutes: number;
}): React.JSX.Element {
  return (
    <Card className="border-border-default bg-bg-surface/95 shadow-card">
      <CardContent className="space-y-2.5 p-4 md:p-3.5 xl:p-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-text-secondary">Plus tard</h3>

        {tasks.length === 0 ? (
          <p className="text-base font-medium text-text-secondary">Aucune autre tache pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const effectiveStatus = getEffectiveStatus(task, currentMinutes);
              return (
                <li
                  key={task.id}
                  className="rounded-radius-button border border-border-subtle bg-bg-surface/80 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-snug text-text-primary">{task.title}</p>
                      <p className="text-sm font-medium text-text-secondary">
                        {task.startTime} - {task.endTime}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(effectiveStatus)}>{getStatusLabel(effectiveStatus)}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HelpCard(): React.JSX.Element {
  return (
    <Card className="border-border-default bg-bg-surface/95 shadow-card">
      <CardContent className="space-y-2 p-4 md:p-3.5 xl:p-4">
        <p className="text-base font-semibold text-text-secondary">Besoin d&apos;aide ?</p>
        <Link
          href="/child/knowledge"
          className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          Ouvrir une fiche
        </Link>
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
  currentContextItem = null,
  currentActionItem = null,
  nextTimelineItem = null,
  dayBalance = EMPTY_DAY_BALANCE,
}: ChildDayViewLiveProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { date } = useCurrentTime(undefined, 60_000);
  const [, startTransition] = useTransition();
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>("guided");

  const [localTasks, setLocalTasks] = useState<TaskInstanceSummary[]>(instances);
  const [dailyPointsTotal, setDailyPointsTotal] = useState(initialDailyPointsTotal);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [pointsFlyUpByInstanceId, setPointsFlyUpByInstanceId] = useState<Record<string, number>>({});

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
  const orderedActionableTasks = useMemo(() => sortTemplateTasks(actionableTasks), [actionableTasks]);

  const tasksTotal = actionableTasks.length;
  const tasksCompleted = actionableTasks.filter((task) => task.status === "termine").length;
  const pointsTarget = computePointsTarget({
    dailyPointsTotal,
    tasks: timelineTasks,
    rewardTiers,
  });

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
  const liveCurrentContextItem = useMemo(() => {
    if (!v2Enabled) {
      return currentContextItem;
    }

    return findCurrentContextItem(liveTimelineItems, currentMinutes);
  }, [currentContextItem, currentMinutes, liveTimelineItems, v2Enabled]);
  const liveCurrentActionItem = useMemo(() => {
    if (!v2Enabled) {
      return currentActionItem;
    }

    return findCurrentActionItem(liveTimelineItems, currentMinutes);
  }, [currentActionItem, currentMinutes, liveTimelineItems, v2Enabled]);
  const liveNextTimelineItem = useMemo(() => {
    if (!v2Enabled) {
      return nextTimelineItem;
    }

    return findNextTimelineItem(liveTimelineItems, currentMinutes);
  }, [currentMinutes, liveTimelineItems, nextTimelineItem, v2Enabled]);
  const liveDayBalance = useMemo(() => {
    if (!v2Enabled) {
      return dayBalance;
    }

    return computeDayBalanceFromTimelineItems(liveTimelineItems);
  }, [dayBalance, liveTimelineItems, v2Enabled]);

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
  const effectiveCurrentTask = v2Enabled ? currentTaskFromV2 ?? currentTask : currentTask;

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
          haptic("success");
          playSound("taskComplete");
          if (result.data.pointsDelta > 0) {
            setPointsFlyUpByInstanceId((current) => ({ ...current, [instanceId]: result.data?.pointsDelta ?? 0 }));
            window.setTimeout(() => {
              setPointsFlyUpByInstanceId((current) => {
                const next = { ...current };
                delete next[instanceId];
                return next;
              });
            }, 820);
          }

          router.refresh();
        }

        if (result.data.unlockedAchievementLabels.length > 0) {
          toast.success(`Nouveau succes: ${result.data.unlockedAchievementLabels[0] ?? "Bravo"}`);
        }
      });
    },
    [dailyPointsTotal, localTasks, pendingInstanceId, router, toast],
  );

  const handleFocusMode = useCallback(
    (instanceId: string) => {
      router.push(`/child/focus/${instanceId}`);
    },
    [router],
  );
  const openChildSettings = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event("ezra:open-child-settings"));
  }, []);

  const showEmptyState = !isLoading && (!hasTemplate || (timelineTasks.length === 0 && templateBlocks.length === 0));
  const contextLabel = dayContext
    ? `Maintenant: ${getMomentLabel(dayContext.currentMoment)} - ${dayContext.currentContextLabel}`
    : "Maintenant: Matin - Temps a la maison";

  return (
    <section className="mx-auto min-h-[calc(100vh-7.5rem)] w-full max-w-[1240px] space-y-4 overflow-x-clip [background:radial-gradient(circle_at_18%_8%,#eef2ff_0%,#f3fbf8_48%,#f5f8ff_100%)]">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Ma journee</h1>
          <p className="text-base font-medium leading-snug text-text-secondary">Toutes mes taches du jour.</p>
          <p className="text-sm font-medium text-text-secondary">Modele: {templateName}</p>
          <p className="text-sm font-medium text-text-secondary">{contextLabel}</p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={openChildSettings}>
          Reglages
        </Button>
      </header>

      {isLoading ? <TimelineLoadingSkeleton /> : null}

      {showEmptyState ? (
        <FadeIn>
          <EmptyState
            icon={<DayPlannerIcon className="size-8" />}
            title="Pas encore de planning"
            description="Demande a tes parents de preparer ta journee type."
            action={{
              label: "Retour a l'accueil",
              onClick: () => router.push("/child"),
            }}
          />
        </FadeIn>
      ) : null}

      {!isLoading && !showEmptyState ? (
        <div className="space-y-3">
          <DailyProgressBar
            pointsEarned={dailyPointsTotal}
            pointsTarget={pointsTarget}
            tasksCompleted={tasksCompleted}
            tasksTotal={tasksTotal}
          />
          {v2Enabled ? <DayBalanceUnitsCard dayBalance={liveDayBalance} /> : null}

          <div className="space-y-3 lg:hidden">
            <MobileModeToggle mode={mobileViewMode} onChange={setMobileViewMode} />

            {mobileViewMode === "guided" ? (
              <div className="space-y-3">
                <CurrentFocusCard
                  currentTask={effectiveCurrentTask}
                  nextTask={nextTask}
                  currentContextItem={liveCurrentContextItem}
                  nextTimelineItem={liveNextTimelineItem}
                  dayContext={dayContext}
                  currentMinutes={currentMinutes}
                  pendingInstanceId={pendingInstanceId}
                  onStatusChange={handleStatusChange}
                  onFocusMode={handleFocusMode}
                />
                <NextTaskCard nextTask={nextTask} nextTimelineItem={liveNextTimelineItem} />
                <LaterTasksCard tasks={laterTasks.slice(0, 5)} currentMinutes={currentMinutes} />
                <HelpCard />
                <Button size="lg" variant="secondary" fullWidth onClick={() => setMobileViewMode("timeline")}>
                  Voir la timeline
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <DayTimeline
                  tasks={timelineTasks}
                  blocks={templateBlocks}
                  currentTime={date}
                  pendingInstanceId={pendingInstanceId}
                  pointsFlyUpByInstanceId={pointsFlyUpByInstanceId}
                  onStatusChange={handleStatusChange}
                  onFocusMode={handleFocusMode}
                  childName={getFirstName(childName)}
                  showBanner
                  compact
                  autoScrollToCurrent
                  {...(dayContext ? { dayContext } : {})}
                />
                <Button size="lg" variant="secondary" fullWidth onClick={() => setMobileViewMode("guided")}>
                  Revenir au mode guide
                </Button>
              </div>
            )}
          </div>

          <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)] lg:items-start lg:gap-4 xl:grid-cols-12 xl:gap-5">
            <div className="lg:col-auto xl:col-span-8">
              <DayTimeline
                tasks={timelineTasks}
                blocks={templateBlocks}
                currentTime={date}
                pendingInstanceId={pendingInstanceId}
                pointsFlyUpByInstanceId={pointsFlyUpByInstanceId}
                onStatusChange={handleStatusChange}
                onFocusMode={handleFocusMode}
                childName={getFirstName(childName)}
                showBanner={false}
                compact
                {...(dayContext ? { dayContext } : {})}
              />
            </div>

            <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start lg:col-auto xl:col-span-4">
              <CurrentFocusCard
                currentTask={effectiveCurrentTask}
                nextTask={nextTask}
                currentContextItem={liveCurrentContextItem}
                nextTimelineItem={liveNextTimelineItem}
                dayContext={dayContext}
                currentMinutes={currentMinutes}
                pendingInstanceId={pendingInstanceId}
                onStatusChange={handleStatusChange}
                onFocusMode={handleFocusMode}
              />
              <NextTaskCard nextTask={nextTask} nextTimelineItem={liveNextTimelineItem} />
              <LaterTasksCard tasks={laterTasks.slice(0, 4)} currentMinutes={currentMinutes} />
              <HelpCard />
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}
