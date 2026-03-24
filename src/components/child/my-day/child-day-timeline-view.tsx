"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  DayPlannerIcon,
  LeisureIcon,
  SchoolIcon,
  SportIcon,
} from "@/components/child/icons/child-premium-icons";
import { FocusView } from "@/components/child/focus/focus-view";
import { Badge, Button, Card, CardContent, EmptyState, Modal, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { canOpenFocusForTask } from "@/lib/day-templates/focus";
import { buildUnifiedTimelineItems, findCurrentActionItem } from "@/lib/day-templates/plan-items";
import { getCurrentMinutes, timeToMinutes } from "@/lib/day-templates/time";
import type {
  DayContextSummary,
  DayTemplateBlockSummary,
  DayTimelineItemSummary,
  TaskInstanceStatus,
  TaskInstanceSummary,
} from "@/lib/day-templates/types";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";
import { playSound } from "@/lib/utils/sounds";

interface ChildDayTimelineViewProps {
  instances?: TaskInstanceSummary[];
  templateBlocks?: DayTemplateBlockSummary[];
  dayContext?: DayContextSummary;
  templateName?: string;
  hasTemplate?: boolean;
  childName?: string;
  isLoading?: boolean;
  v2Enabled?: boolean;
  timelineItems?: DayTimelineItemSummary[];
  currentActionItem?: DayTimelineItemSummary | null;
}

const EMPTY_INSTANCES: TaskInstanceSummary[] = [];
const EMPTY_TEMPLATE_BLOCKS: DayTemplateBlockSummary[] = [];
const EMPTY_TIMELINE_ITEMS: DayTimelineItemSummary[] = [];

function getMomentLabel(moment: DayContextSummary["currentMoment"] | undefined): string {
  if (moment === "apres-midi") {
    return "Apres-midi";
  }

  if (moment === "soir") {
    return "Soir";
  }

  return "Matin";
}

function getKindLabel(item: DayTimelineItemSummary): string {
  if (item.kind === "activity") {
    return "Activite";
  }

  if (item.kind === "leisure") {
    return "Loisir";
  }

  if (item.kind === "context") {
    return "Repere";
  }

  return "Mission";
}

function getKindIcon(
  item: DayTimelineItemSummary,
): (props: { className?: string }) => React.JSX.Element {
  if (item.kind === "activity") {
    return SportIcon;
  }

  if (item.kind === "leisure") {
    return LeisureIcon;
  }

  if (item.kind === "context") {
    return SchoolIcon;
  }

  return DayPlannerIcon;
}

function getStatusLabel(status: DayTimelineItemSummary["status"]): string {
  if (status === "en_cours") {
    return "En cours";
  }

  if (status === "termine") {
    return "Termine";
  }

  if (status === "en_retard") {
    return "En retard";
  }

  if (status === "context") {
    return "Repere";
  }

  return "A faire";
}

function getStatusVariant(
  status: DayTimelineItemSummary["status"],
): "warning" | "success" | "neutral" | "info" {
  if (status === "termine") {
    return "success";
  }

  if (status === "en_retard") {
    return "warning";
  }

  if (status === "context") {
    return "neutral";
  }

  return "info";
}

function buildActionFromStatus(
  status: TaskInstanceStatus,
): { label: string; status: TaskInstanceStatus } | null {
  if (status === "en_cours") {
    return { label: "Marquer comme fait", status: "termine" };
  }

  if (status === "a_faire" || status === "en_retard") {
    return { label: "Commencer", status: "en_cours" };
  }

  return null;
}

function TimelinePageSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-[20px]" />
      <Skeleton className="h-32 w-full rounded-[20px]" />
      <Skeleton className="h-24 w-full rounded-[20px]" />
      <Skeleton className="h-96 w-full rounded-[20px]" />
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card className="rounded-[20px] border-border-default bg-bg-surface shadow-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-[0.01em] text-text-primary">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-base leading-relaxed text-text-secondary">{subtitle}</p>
            ) : null}
          </div>
          {badge ? <Badge variant="neutral">{badge}</Badge> : null}
        </div>
        {children}
      </CardContent>
    </Card>
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
    <Card className="rounded-[20px] border border-brand-primary/20 bg-brand-50/55 shadow-card">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="space-y-1">
          <p className="text-lg font-bold tracking-[0.01em] text-text-primary">Focus 20 / 5</p>
          <p className="reading text-base leading-relaxed text-text-secondary">
            Activation manuelle, au rythme de l&apos;enfant.
          </p>
        </div>
        <Button
          size="lg"
          variant="secondary"
          className="text-[17px] font-semibold"
          onClick={onOpenFocus}
          disabled={disabled}
        >
          Focus
        </Button>
      </CardContent>
    </Card>
  );
}

export function ChildDayTimelineView({
  instances = EMPTY_INSTANCES,
  templateBlocks = EMPTY_TEMPLATE_BLOCKS,
  dayContext,
  templateName = "Journee type",
  hasTemplate = true,
  childName = "Ezra",
  isLoading = false,
  v2Enabled = false,
  timelineItems = EMPTY_TIMELINE_ITEMS,
  currentActionItem = null,
}: ChildDayTimelineViewProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { date } = useCurrentTime(undefined, 60_000);
  const [, startTransition] = useTransition();

  const [localTasks, setLocalTasks] = useState<TaskInstanceSummary[]>(instances);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [focusOverlayTaskId, setFocusOverlayTaskId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    setLocalTasks(instances);
  }, [instances, isLoading]);

  const timeline = useMemo(() => {
    if (!v2Enabled) {
      return timelineItems;
    }

    return buildUnifiedTimelineItems({
      tasks: localTasks,
      blocks: templateBlocks,
    });
  }, [localTasks, templateBlocks, timelineItems, v2Enabled]);

  const currentMinutes = getCurrentMinutes(date);
  const nowItem = useMemo(() => {
    if (!timeline.length) {
      return null;
    }

    const fromCurrentAction = currentActionItem ?? findCurrentActionItem(timeline, currentMinutes);
    if (fromCurrentAction) {
      return fromCurrentAction;
    }

    const fallbackCurrentContext = timeline.find(
      (item) =>
        item.kind === "context" &&
        currentMinutes >= timeToMinutes(item.startTime) &&
        currentMinutes < timeToMinutes(item.endTime),
    );
    if (fallbackCurrentContext) {
      return fallbackCurrentContext;
    }

    return (
      timeline.find((item) => timeToMinutes(item.startTime) >= currentMinutes) ??
      timeline[0] ??
      null
    );
  }, [currentActionItem, currentMinutes, timeline]);

  const futureActionItems = useMemo(() => {
    return timeline
      .filter((item) => item.kind !== "context")
      .filter((item) => item.status !== "ignore" && item.status !== "termine")
      .filter((item) => timeToMinutes(item.startTime) > currentMinutes)
      .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));
  }, [currentMinutes, timeline]);

  const nextItems = futureActionItems.slice(0, 3);
  const laterItems = futureActionItems.slice(3);

  const taskById = useMemo(() => {
    return new Map(localTasks.map((task) => [task.id, task]));
  }, [localTasks]);

  const currentTaskForFocus = useMemo(() => {
    if (!nowItem || nowItem.kind === "context") {
      return null;
    }

    const sourceId = nowItem.sourceRefId ?? null;
    if (!sourceId) {
      return null;
    }

    return taskById.get(sourceId) ?? null;
  }, [nowItem, taskById]);

  const selectedItem = useMemo(
    () => timeline.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, timeline],
  );

  const selectedTask = useMemo(() => {
    if (!selectedItem || selectedItem.kind === "context") {
      return null;
    }

    const sourceId = selectedItem.sourceRefId ?? null;
    if (!sourceId) {
      return null;
    }

    return taskById.get(sourceId) ?? null;
  }, [selectedItem, taskById]);

  const focusOverlayTask = useMemo(() => {
    if (!focusOverlayTaskId) {
      return null;
    }

    return localTasks.find((task) => task.id === focusOverlayTaskId) ?? null;
  }, [focusOverlayTaskId, localTasks]);

  const selectedPrimaryAction = selectedTask ? buildActionFromStatus(selectedTask.status) : null;

  const openFocus = useCallback((instanceId: string) => {
    setFocusOverlayTaskId(instanceId);
  }, []);

  const closeFocus = useCallback(() => {
    setFocusOverlayTaskId(null);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedItemId(null);
  }, []);

  const handleFocusSessionComplete = useCallback(
    (focusedMinutes: number) => {
      closeFocus();
      toast.success(`Session focus terminee: ${focusedMinutes} min.`);
      router.refresh();
    },
    [closeFocus, router, toast],
  );

  const handleStatusChange = useCallback(
    (instanceId: string, newStatus: TaskInstanceStatus) => {
      if (pendingInstanceId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, action indisponible.");
        return;
      }

      const previousTasks = localTasks;
      setPendingInstanceId(instanceId);
      setLocalTasks((tasks) =>
        tasks.map((task) => (task.id === instanceId ? { ...task, status: newStatus } : task)),
      );

      startTransition(async () => {
        const result = await updateTaskStatusAction({ instanceId, newStatus });
        if (!result.success || !result.data) {
          setLocalTasks(previousTasks);
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
        setPendingInstanceId(null);
        haptic("success");
        playSound("taskComplete");
        toast.success("Mise a jour enregistree.");
        closeDetail();
        router.refresh();
      });
    },
    [closeDetail, localTasks, pendingInstanceId, router, toast],
  );

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  const contextLabel = dayContext
    ? `${dateLabel} · ${dayContext.periodLabel} · ${getMomentLabel(dayContext.currentMoment)}`
    : `${dateLabel} · ${templateName}`;
  const contextLabelWithChild = `${childName} · ${contextLabel}`;

  const showEmptyState = !isLoading && (!hasTemplate || timeline.length === 0);

  return (
    <section className="mx-auto min-h-[calc(100vh-7.5rem)] w-full max-w-[1140px] space-y-5 pb-4">
      <header className="space-y-3">
        <Button
          size="md"
          variant="ghost"
          className="text-base font-semibold"
          onClick={() => router.push("/child/my-day")}
        >
          Retour a ma journee
        </Button>
        <div className="space-y-1.5">
          <h1 className="font-display text-[30px] font-extrabold tracking-[0.01em] text-text-primary">
            Timeline
          </h1>
          <p className="text-base font-medium leading-relaxed text-text-secondary">
            {contextLabelWithChild}
          </p>
        </div>
      </header>

      {isLoading ? <TimelinePageSkeleton /> : null}

      {showEmptyState ? (
        <EmptyState
          icon={<DayPlannerIcon className="size-8" />}
          title="Timeline indisponible"
          description="Aucun element planifie pour aujourd'hui."
          action={{
            label: "Retour a ma journee",
            onClick: () => router.push("/child/my-day"),
          }}
        />
      ) : null}

      {!isLoading && !showEmptyState ? (
        <div className="space-y-4">
          <SectionCard
            title="Now"
            subtitle={nowItem ? `${nowItem.startTime} - ${nowItem.endTime}` : "Aucun item en cours"}
            {...(nowItem ? { badge: getKindLabel(nowItem) } : {})}
          >
            {nowItem ? (
              <button
                type="button"
                className="w-full rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-3 text-left transition-colors duration-200 hover:bg-bg-surface-hover"
                onClick={() => setSelectedItemId(nowItem.id)}
              >
                <p className="text-[18px] font-semibold tracking-[0.01em] text-text-primary">
                  {nowItem.title}
                </p>
                <p className="reading mt-1 text-base leading-relaxed text-text-secondary">
                  {nowItem.description ?? "Une seule action a la fois."}
                </p>
              </button>
            ) : (
              <p className="reading text-base leading-relaxed text-text-secondary">
                Aucun item actif pour l&apos;instant.
              </p>
            )}
          </SectionCard>

          {currentTaskForFocus && canOpenFocusForTask(currentTaskForFocus) ? (
            <FocusStrip
              onOpenFocus={() => openFocus(currentTaskForFocus.id)}
              disabled={pendingInstanceId === currentTaskForFocus.id}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard title="Next" badge={String(nextItems.length)}>
              {nextItems.length > 0 ? (
                <ul className="space-y-2.5">
                  {nextItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2.5 text-left transition-colors duration-200 hover:bg-bg-surface-hover"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <p className="text-[17px] font-semibold tracking-[0.01em] text-text-primary">
                          {item.title}
                        </p>
                        <p className="text-base leading-relaxed text-text-secondary">
                          {item.startTime} - {item.endTime}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="reading text-base leading-relaxed text-text-secondary">
                  Rien d&apos;urgent ensuite.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Later" badge={String(laterItems.length)}>
              {laterItems.length > 0 ? (
                <ul className="space-y-2.5">
                  {laterItems.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2.5 text-left transition-colors duration-200 hover:bg-bg-surface-hover"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <p className="text-[17px] font-semibold tracking-[0.01em] text-text-primary">
                          {item.title}
                        </p>
                        <p className="text-base leading-relaxed text-text-secondary">
                          {item.startTime} - {item.endTime}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="reading text-base leading-relaxed text-text-secondary">
                  Le reste de la journee est leger.
                </p>
              )}
            </SectionCard>
          </div>

          <Card className="rounded-[20px] border-border-default bg-bg-surface shadow-card">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl font-bold tracking-[0.01em] text-text-primary">
                  Timeline
                </h2>
                <Badge variant="neutral">{timeline.length} items</Badge>
              </div>

              <div className="relative pl-7" data-testid="timeline-vertical-list">
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-3 top-0 w-px bg-border-default"
                />
                <ul className="space-y-3">
                  {timeline.map((item) => {
                    const ItemIcon = getKindIcon(item);
                    const isNow = nowItem?.id === item.id;

                    return (
                      <li key={item.id} className="relative">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute -left-7 top-3 inline-flex size-6 items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface text-text-secondary",
                            isNow ? "border-brand-primary/40 bg-brand-50 text-brand-primary" : "",
                          )}
                        >
                          <ItemIcon className="size-4" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                          className={cn(
                            "w-full rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-3 text-left transition-all duration-200 hover:bg-bg-surface-hover",
                            isNow ? "border-brand-primary/35 bg-brand-50/45 shadow-card" : "",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[17px] font-semibold tracking-[0.01em] text-text-primary">
                                {item.title}
                              </p>
                              <p className="text-base leading-relaxed text-text-secondary">
                                {item.startTime} - {item.endTime}
                              </p>
                            </div>
                            <Badge variant={getStatusVariant(item.status)}>
                              {getStatusLabel(item.status)}
                            </Badge>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            variant="primary"
            fullWidth
            className="from-brand-primary to-brand-primary text-[18px] font-bold tracking-[0.01em]"
            onClick={() => router.push("/child/my-day")}
          >
            Continuer ma journee
            <ArrowRightIcon className="size-5" />
          </Button>
        </div>
      ) : null}

      <Modal
        open={Boolean(selectedItem)}
        onClose={closeDetail}
        title={selectedItem?.title ?? "Detail"}
        closeLabel="Fermer le detail"
        className="max-w-2xl p-4 md:p-5"
        {...(selectedItem
          ? { description: `${selectedItem.startTime} - ${selectedItem.endTime}` }
          : {})}
      >
        {selectedItem ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{getKindLabel(selectedItem)}</Badge>
              <Badge variant={getStatusVariant(selectedItem.status)}>
                {getStatusLabel(selectedItem.status)}
              </Badge>
            </div>

            <p className="reading text-base leading-relaxed text-text-secondary">
              {selectedItem.description ?? "Description courte non renseignee."}
            </p>

            {selectedTask && selectedPrimaryAction ? (
              <Button
                size="lg"
                variant="primary"
                fullWidth
                className="from-brand-primary to-brand-primary text-[17px] font-bold"
                loading={pendingInstanceId === selectedTask.id}
                disabled={pendingInstanceId === selectedTask.id}
                onClick={() => handleStatusChange(selectedTask.id, selectedPrimaryAction.status)}
              >
                {selectedPrimaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(focusOverlayTask)}
        onClose={closeFocus}
        title="Focus"
        description="Pomodoro doux pour avancer sans pression."
        closeLabel="Fermer le focus"
        className="max-w-4xl p-4 md:p-5"
      >
        {focusOverlayTask ? (
          <FocusView
            instance={focusOverlayTask}
            presentation="overlay"
            onClose={closeFocus}
            onSessionComplete={handleFocusSessionComplete}
            calmPomodoroOnly
          />
        ) : null}
      </Modal>
    </section>
  );
}
