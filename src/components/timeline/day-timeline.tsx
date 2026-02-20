"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge, Button, Card, CardContent } from "@/components/ds";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { NextUpBanner } from "@/components/timeline/next-up-banner";
import { NowCursor } from "@/components/timeline/now-cursor";
import { TimeAxis } from "@/components/timeline/time-axis";
import { TimelineTaskCard } from "@/components/timeline/timeline-task-card";
import { getCurrentAndNextTasks, getTaskPhase, sortTemplateTasks } from "@/lib/day-templates/timeline";
import { getCurrentMinutes, timeToMinutes } from "@/lib/day-templates/time";
import type {
  DayContextSummary,
  DayTemplateBlockSummary,
  TaskInstanceStatus,
  TaskInstanceSummary,
} from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

interface DayTimelineProps {
  tasks: TaskInstanceSummary[];
  blocks?: DayTemplateBlockSummary[];
  dayContext?: DayContextSummary;
  currentTime: Date;
  pendingInstanceId?: string | null;
  pointsFlyUpByInstanceId?: Record<string, number>;
  onStatusChange: (instanceId: string, newStatus: TaskInstanceStatus) => void;
  onFocusMode: (instanceId: string) => void;
  childName?: string;
  showBanner?: boolean;
  compact?: boolean;
  autoScrollToCurrent?: boolean;
  showDetailPanel?: boolean;
  className?: string;
}

interface TimelinePlacement {
  task: TaskInstanceSummary;
  top: number;
  height: number;
  variant: "mini" | "compact" | "full";
  phase: {
    isPast: boolean;
    isCurrent: boolean;
    isFuture: boolean;
  };
}

interface BlockPlacement {
  block: DayTemplateBlockSummary;
  top: number;
  height: number;
}

interface PrimaryAction {
  label: string;
  status: TaskInstanceStatus;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildRange(tasks: TaskInstanceSummary[], blocks: DayTemplateBlockSummary[]): { start: number; end: number } {
  if (tasks.length === 0 && blocks.length === 0) {
    return { start: 7 * 60, end: 18 * 60 };
  }

  const starts = [
    ...tasks.map((task) => timeToMinutes(task.startTime)),
    ...blocks.map((block) => timeToMinutes(block.startTime)),
  ];
  const ends = [
    ...tasks.map((task) => timeToMinutes(task.endTime)),
    ...blocks.map((block) => timeToMinutes(block.endTime)),
  ];

  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const start = Math.floor(minStart / 60) * 60;
  const end = Math.max(start + 60, Math.ceil(maxEnd / 60) * 60);
  return { start, end };
}

function buildHourMarkers(rangeStartMinutes: number, rangeEndMinutes: number): number[] {
  const startHour = Math.floor(rangeStartMinutes / 60);
  const endHour = Math.ceil(rangeEndMinutes / 60);
  const markers: number[] = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    markers.push(hour);
  }
  return markers;
}

function buildPlacements(
  tasks: TaskInstanceSummary[],
  currentMinutes: number,
  rangeStartMinutes: number,
  rangeEndMinutes: number,
  timelineHeight: number,
  compactView: boolean,
): TimelinePlacement[] {
  const totalRange = Math.max(1, rangeEndMinutes - rangeStartMinutes);
  const verticalGap = compactView ? 4 : 6;
  const minHeightByVariant: Record<TimelinePlacement["variant"], number> = compactView
    ? { mini: 34, compact: 48, full: 70 }
    : { mini: 40, compact: 60, full: 92 };

  const placements: TimelinePlacement[] = [];
  let previousBottom = -verticalGap;

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    if (!task) {
      continue;
    }

    const startMinutes = timeToMinutes(task.startTime);
    const endMinutes = timeToMinutes(task.endTime);
    const durationMinutes = Math.max(1, endMinutes - startMinutes);
    let preferredVariant: TimelinePlacement["variant"] = "full";

    if (durationMinutes < 45) {
      preferredVariant = "mini";
    } else if (durationMinutes < 120) {
      preferredVariant = "compact";
    }

    if (compactView && preferredVariant === "full") {
      preferredVariant = "compact";
    }

    const rawTop = ((startMinutes - rangeStartMinutes) / totalRange) * timelineHeight;
    const minTop = Math.max(0, previousBottom + verticalGap);
    const top = Math.max(rawTop, minTop);
    const nextTask = tasks[index + 1];
    const nextRawTop =
      nextTask
        ? ((timeToMinutes(nextTask.startTime) - rangeStartMinutes) / totalRange) * timelineHeight
        : timelineHeight;
    const computedHeight = (durationMinutes / totalRange) * timelineHeight;
    const resolveTargetHeight = (density: TimelinePlacement["variant"]): number => {
      return Math.max(minHeightByVariant[density], computedHeight);
    };

    const maxHeightByNextStart = Math.max(12, nextRawTop - top - verticalGap);
    const variantOrder: TimelinePlacement["variant"][] =
      preferredVariant === "full" ? ["full", "compact", "mini"] : preferredVariant === "compact" ? ["compact", "mini"] : ["mini"];

    let variant = variantOrder[variantOrder.length - 1] ?? "mini";
    let height = Math.max(12, Math.min(resolveTargetHeight(variant), maxHeightByNextStart));

    for (const candidate of variantOrder) {
      const candidateHeight = resolveTargetHeight(candidate);
      if (candidateHeight <= maxHeightByNextStart) {
        variant = candidate;
        height = candidateHeight;
        break;
      }

      variant = candidate;
      height = Math.max(12, Math.min(candidateHeight, maxHeightByNextStart));
    }

    height = Math.max(12, Math.min(height, timelineHeight - top));
    previousBottom = top + height;

    placements.push({
      task,
      top,
      height,
      variant,
      phase: getTaskPhase(task, currentMinutes),
    });
  }

  return placements;
}

function buildBlockPlacements(
  blocks: DayTemplateBlockSummary[],
  rangeStartMinutes: number,
  rangeEndMinutes: number,
  timelineHeight: number,
  minBlockHeight: number,
): BlockPlacement[] {
  const totalRange = Math.max(1, rangeEndMinutes - rangeStartMinutes);

  return blocks.map((block) => {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    const durationMinutes = Math.max(20, endMinutes - startMinutes);
    const rawTop = ((startMinutes - rangeStartMinutes) / totalRange) * timelineHeight;
    const rawHeight = (durationMinutes / totalRange) * timelineHeight;
    const height = Math.max(minBlockHeight, rawHeight);
    const top = clamp(rawTop, 0, Math.max(0, timelineHeight - height));

    return {
      block,
      top,
      height,
    };
  });
}

function getBlockStyles(blockType: DayTemplateBlockSummary["blockType"]): {
  containerClassName: string;
  label: string;
} {
  if (blockType === "school") {
    return {
      containerClassName: "border-category-ecole/45 bg-category-ecole/10",
      label: "Ecole",
    };
  }

  if (blockType === "daycare") {
    return {
      containerClassName: "border-category-repas/45 bg-category-repas/10",
      label: "Garderie",
    };
  }

  if (blockType === "free_time") {
    return {
      containerClassName: "border-category-calme/45 bg-category-calme/10",
      label: "Temps libre",
    };
  }

  return {
    containerClassName: "border-border-default/80 bg-bg-surface/72",
    label: "Bloc fixe",
  };
}

function getEffectiveStatus(status: TaskInstanceStatus, phase: TimelinePlacement["phase"]): TaskInstanceStatus {
  if (status === "a_faire" && phase.isPast && !phase.isCurrent) {
    return "en_retard";
  }

  return status;
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

function getPrimaryAction(status: TaskInstanceStatus): PrimaryAction | null {
  if (status === "en_cours") {
    return { label: "Valider", status: "termine" };
  }

  if (status === "a_faire" || status === "en_retard") {
    return { label: "Commencer", status: "en_cours" };
  }

  return null;
}

function CelebrationBanner({ childName }: { childName: string }): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const dots = ["bg-brand-primary", "bg-accent-warm", "bg-brand-secondary", "bg-category-loisir", "bg-status-success"];

  return (
    <section className="relative overflow-hidden rounded-radius-card border border-status-success/30 bg-status-success/14 px-4 py-3">
      <p className="text-sm font-black text-status-success">Bravo {childName} ! Toutes les taches sont terminees.</p>
      {!prefersReducedMotion ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16">
          {dots.map((dotClassName, index) => (
            <motion.span
              key={`${dotClassName}-${index}`}
              className={`absolute top-0 size-2 rounded-radius-pill ${dotClassName}`}
              style={{ left: `${14 + index * 16}%` }}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 48, opacity: [0, 1, 0] }}
              transition={{
                duration: 1.2,
                delay: index * 0.08,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 1.8,
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function DayTimeline({
  tasks,
  blocks = [],
  dayContext,
  currentTime,
  pendingInstanceId = null,
  pointsFlyUpByInstanceId = {},
  onStatusChange,
  onFocusMode,
  childName = "Ezra",
  showBanner = true,
  compact = false,
  autoScrollToCurrent = false,
  showDetailPanel = true,
  className,
}: DayTimelineProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLElement | null>(null);
  const currentTaskRef = useRef<HTMLDivElement | null>(null);
  const didAutoScrollRef = useRef(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const orderedTasks = useMemo(() => sortTemplateTasks(tasks), [tasks]);
  const orderedBlocks = useMemo(
    () =>
      [...blocks].sort((left, right) => {
        if (left.startTime !== right.startTime) {
          return left.startTime.localeCompare(right.startTime);
        }

        return left.sortOrder - right.sortOrder;
      }),
    [blocks],
  );

  const currentMinutes = getCurrentMinutes(currentTime);
  const range = useMemo(() => buildRange(orderedTasks, orderedBlocks), [orderedBlocks, orderedTasks]);
  const totalRange = Math.max(1, range.end - range.start);
  const timelineDensity = compact ? 0.84 : 0.72;
  const timelineHeight = clamp(totalRange * timelineDensity, compact ? 300 : 320, compact ? 760 : 860);
  const minBlockHeight = compact ? 34 : 40;

  const hourMarkers = useMemo(() => buildHourMarkers(range.start, range.end), [range.end, range.start]);
  const placements = useMemo(
    () => buildPlacements(orderedTasks, currentMinutes, range.start, range.end, timelineHeight, compact),
    [compact, currentMinutes, orderedTasks, range.end, range.start, timelineHeight],
  );
  const blockPlacements = useMemo(
    () => buildBlockPlacements(orderedBlocks, range.start, range.end, timelineHeight, minBlockHeight),
    [minBlockHeight, orderedBlocks, range.end, range.start, timelineHeight],
  );

  const { currentTask, nextTask } = useMemo(
    () => getCurrentAndNextTasks(orderedTasks, currentMinutes),
    [currentMinutes, orderedTasks],
  );
  const nowCursorTop = useMemo(() => {
    const normalizedMinutes = clamp(currentMinutes, range.start, range.end);
    return ((normalizedMinutes - range.start) / totalRange) * timelineHeight;
  }, [currentMinutes, range.end, range.start, timelineHeight, totalRange]);
  const showNowCursorLabel = useMemo(() => {
    if (compact) {
      return false;
    }

    const clearance = compact ? 18 : 24;
    return !placements.some(
      (placement) =>
        nowCursorTop >= placement.top - clearance && nowCursorTop <= placement.top + placement.height + clearance,
    );
  }, [compact, nowCursorTop, placements]);
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return orderedTasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [orderedTasks, selectedTaskId]);
  const selectedPlacement = useMemo(
    () => placements.find((placement) => placement.task.id === selectedTask?.id) ?? null,
    [placements, selectedTask?.id],
  );
  const selectedTaskEffectiveStatus = selectedPlacement
    ? getEffectiveStatus(selectedPlacement.task.status, selectedPlacement.phase)
    : null;
  const selectedPrimaryAction = selectedTaskEffectiveStatus ? getPrimaryAction(selectedTaskEffectiveStatus) : null;

  const showSchoolNowMessage = Boolean(dayContext?.isInSchoolBlock);
  const effectiveCurrentTask = showSchoolNowMessage ? null : currentTask;
  const currentMessage = showSchoolNowMessage
    ? dayContext?.activeSchoolBlockEndTime
      ? `Maintenant: Ecole jusqu'a ${dayContext.activeSchoolBlockEndTime}`
      : "Maintenant: Ecole"
    : undefined;

  const allDone = useMemo(
    () =>
      orderedTasks.length > 0 &&
      orderedTasks.every((task) => task.status === "termine" || task.status === "ignore" || task.isReadOnly),
    [orderedTasks],
  );

  useEffect(() => {
    if (!autoScrollToCurrent || didAutoScrollRef.current) {
      return;
    }

    const target = currentTaskRef.current ?? rootRef.current?.querySelector<HTMLElement>("#my-day-now-cursor-anchor");
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: compact ? "start" : "center",
    });

    didAutoScrollRef.current = true;
  }, [autoScrollToCurrent, compact, placements, prefersReducedMotion]);

  useEffect(() => {
    if (orderedTasks.length === 0) {
      if (selectedTaskId !== null) {
        setSelectedTaskId(null);
      }
      return;
    }

    if (selectedTaskId && orderedTasks.some((task) => task.id === selectedTaskId)) {
      return;
    }

    const preferredId = currentTask?.id ?? orderedTasks[0]?.id ?? null;
    setSelectedTaskId(preferredId);
  }, [currentTask?.id, orderedTasks, selectedTaskId]);

  return (
    <section ref={rootRef} className={cn("space-y-3", className)}>
      {allDone ? <CelebrationBanner childName={childName} /> : null}

      <div className="relative rounded-radius-card border border-border-subtle bg-bg-surface/65 p-3 shadow-card backdrop-blur-sm md:p-4">
        {showBanner ? (
          <NextUpBanner
            currentTask={
              effectiveCurrentTask
                ? {
                    title: effectiveCurrentTask.title,
                    icon: effectiveCurrentTask.category.icon,
                    endTime: effectiveCurrentTask.endTime,
                  }
                : null
            }
            nextTask={
              nextTask
                ? {
                    title: nextTask.title,
                    icon: nextTask.category.icon,
                    startTime: nextTask.startTime,
                  }
                : null
            }
            className="mb-3"
            {...(currentMessage ? { currentMessage } : {})}
          />
        ) : null}

        <div className="relative">
          <NowCursor
            rangeStartMinutes={range.start}
            rangeEndMinutes={range.end}
            timelineHeight={timelineHeight}
            axisOffsetPx={compact ? 28 : 32}
            currentTime={currentTime}
            showLabel={showNowCursorLabel}
          />

          <div className="grid grid-cols-[56px_1fr] gap-2.5 md:grid-cols-[64px_1fr] md:gap-3">
            <TimeAxis
              hourMarkers={hourMarkers}
              rangeStartMinutes={range.start}
              rangeEndMinutes={range.end}
              timelineHeight={timelineHeight}
            />

            <div className="relative" style={{ height: `${timelineHeight}px` }}>
              <div className="absolute inset-0 z-0">
                {blockPlacements.map((placement) => {
                  const blockStyle = getBlockStyles(placement.block.blockType);
                  const label = placement.block.label ?? blockStyle.label;
                  const blockPaddingTop = placement.top < 20 ? "1.1rem" : undefined;

                  return (
                    <div
                      key={`block-${placement.block.id}`}
                      className={cn(
                        "pointer-events-none absolute inset-x-0 overflow-hidden rounded-radius-button border border-dashed px-2.5 py-1.5 md:px-3 md:py-2",
                        blockStyle.containerClassName,
                      )}
                      style={{ top: `${placement.top}px`, height: `${placement.height}px`, paddingTop: blockPaddingTop }}
                    >
                      <p className="text-[0.78rem] font-semibold leading-snug text-text-secondary md:text-xs">{label}</p>
                      <p className="text-[0.72rem] leading-snug text-text-muted md:text-xs">
                        {placement.block.startTime} - {placement.block.endTime}
                      </p>
                    </div>
                  );
                })}
              </div>

              <StaggerContainer className="relative z-[1] h-full">
                {placements.map((placement) => (
                  <StaggerItem
                    key={placement.task.id}
                    className="absolute inset-x-0 overflow-hidden"
                    style={{ top: `${placement.top}px`, height: `${placement.height}px` }}
                  >
                    <FadeIn className="h-full">
                      <div className="h-full" ref={placement.phase.isCurrent ? currentTaskRef : undefined}>
                        <TimelineTaskCard
                          instanceId={placement.task.id}
                          title={placement.task.title}
                          startTime={placement.task.startTime}
                          endTime={placement.task.endTime}
                          category={placement.task.category}
                          assignedTo={
                            placement.task.assignedProfileDisplayName || placement.task.assignedProfileRole
                              ? {
                                  displayName: placement.task.assignedProfileDisplayName ?? "Parent",
                                  role: placement.task.assignedProfileRole ?? "parent",
                                }
                              : null
                          }
                          status={placement.task.status}
                          pointsBase={placement.task.pointsBase}
                          pointsEarned={placement.task.pointsEarned}
                          isPast={placement.phase.isPast}
                          isCurrent={placement.phase.isCurrent}
                          isFuture={placement.phase.isFuture}
                          hasLinkedKnowledgeCard={Boolean(placement.task.knowledgeCardId)}
                          knowledgeCardId={placement.task.knowledgeCardId ?? null}
                          pointsFlyUp={pointsFlyUpByInstanceId[placement.task.id] ?? 0}
                          isPending={pendingInstanceId === placement.task.id}
                          onStatusChange={onStatusChange}
                          onFocusMode={onFocusMode}
                          compact={compact}
                          density={placement.variant}
                          renderActions={!compact && placement.variant === "full"}
                          isSelected={selectedTaskId === placement.task.id}
                          onSelect={setSelectedTaskId}
                        />
                      </div>
                    </FadeIn>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </div>

        {showDetailPanel && selectedTask && (compact || selectedPlacement?.variant !== "full") ? (
          <Card className="mt-3 border-border-default bg-bg-surface/95 shadow-card" data-testid="timeline-detail-panel">
            <CardContent className="space-y-3 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-wide text-text-secondary">Detail</p>
                  <p className="text-xl font-black leading-snug text-text-primary">{selectedTask.title}</p>
                  <p className="text-sm font-medium text-text-secondary">
                    {selectedTask.startTime} - {selectedTask.endTime}
                  </p>
                </div>
                {selectedTaskEffectiveStatus ? (
                  <Badge variant={getStatusBadgeVariant(selectedTaskEffectiveStatus)}>
                    {getStatusLabel(selectedTaskEffectiveStatus)}
                  </Badge>
                ) : null}
              </div>

              {selectedTask.description ? (
                <p className="text-sm font-medium text-text-secondary">{selectedTask.description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{selectedTask.category.name}</Badge>
                {selectedTask.assignedProfileDisplayName ? (
                  <Badge variant="neutral">{selectedTask.assignedProfileDisplayName}</Badge>
                ) : null}
                <Badge variant="neutral">{selectedTask.pointsBase} pts</Badge>
              </div>

              {selectedTask.status !== "termine" && selectedTask.status !== "ignore" ? (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedPrimaryAction ? (
                    <Button
                      size="md"
                      variant={selectedPrimaryAction.status === "termine" ? "primary" : "secondary"}
                      disabled={pendingInstanceId === selectedTask.id}
                      loading={pendingInstanceId === selectedTask.id}
                      onClick={() => onStatusChange(selectedTask.id, selectedPrimaryAction.status)}
                    >
                      {selectedPrimaryAction.label}
                    </Button>
                  ) : null}

                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
                    onClick={() => onFocusMode(selectedTask.id)}
                  >
                    Focus
                  </button>

                  {selectedTask.knowledgeCardId ? (
                    <Link
                      href={`/child/knowledge?cardId=${selectedTask.knowledgeCardId}`}
                      className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      Fiche
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
