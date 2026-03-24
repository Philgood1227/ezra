"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Badge, Button, Card, CardContent, resolveCategoryIcon } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import { getCategoryVisual } from "@/components/timeline/category-visuals";
import { PointsFlyUp } from "@/components/timeline/points-fly-up";
import type { TaskCategorySummary, TaskInstanceStatus } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

interface TimelineTaskCardProps {
  instanceId: string;
  title: string;
  startTime: string;
  endTime: string;
  category: Pick<TaskCategorySummary, "name" | "icon" | "colorKey">;
  assignedTo?: { displayName: string; role: string } | null;
  status: TaskInstanceStatus;
  pointsBase: number;
  pointsEarned: number;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  hasLinkedKnowledgeCard: boolean;
  onStatusChange: (instanceId: string, newStatus: TaskInstanceStatus) => void;
  onFocusMode: (instanceId: string) => void;
  knowledgeCardId?: string | null;
  pointsFlyUp?: number;
  isPending?: boolean;
  compact?: boolean;
  density?: "mini" | "compact" | "full";
  isSelected?: boolean;
  onSelect?: (instanceId: string) => void;
  renderActions?: boolean;
}

function getAssignedLabel(assignedTo: TimelineTaskCardProps["assignedTo"]): string | null {
  if (!assignedTo) {
    return null;
  }

  if (assignedTo.role === "child") {
    return "Moi";
  }

  if (assignedTo.role === "parent") {
    const normalizedName = assignedTo.displayName.trim().toLowerCase();
    if (normalizedName.includes("maman")) {
      return "Maman";
    }
    if (normalizedName.includes("papa")) {
      return "Papa";
    }

    return assignedTo.displayName || "Parent";
  }

  return assignedTo.displayName || null;
}

function getPrimaryStatusTarget(status: TaskInstanceStatus, isLate: boolean): TaskInstanceStatus | null {
  if (status === "en_cours") {
    return "termine";
  }

  if (status === "a_faire" || status === "en_retard" || isLate) {
    return "en_cours";
  }

  return null;
}

export function TimelineTaskCard({
  instanceId,
  title,
  startTime,
  endTime,
  category,
  assignedTo = null,
  status,
  pointsBase,
  pointsEarned,
  isPast,
  isCurrent,
  isFuture,
  hasLinkedKnowledgeCard,
  onStatusChange,
  onFocusMode,
  knowledgeCardId = null,
  pointsFlyUp = 0,
  isPending = false,
  compact = false,
  density,
  isSelected = false,
  onSelect,
  renderActions = true,
}: TimelineTaskCardProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const categoryVisual = getCategoryVisual(category.colorKey);
  const CategoryIcon = resolveCategoryIcon(category.icon);
  const isLate = status === "a_faire" && isPast && !isCurrent;
  const effectiveStatus: TaskInstanceStatus = isLate ? "en_retard" : status;
  const resolvedDensity = density ?? (compact ? "compact" : "full");
  const isMini = resolvedDensity === "mini";
  const isCompact = resolvedDensity !== "full";
  const assignedLabel = getAssignedLabel(assignedTo);
  const primaryTarget = getPrimaryStatusTarget(effectiveStatus, isLate);
  const isDone = status === "termine";
  const isIgnored = status === "ignore";
  const canOpenFocus =
    effectiveStatus === "a_faire" || effectiveStatus === "en_cours" || effectiveStatus === "en_retard";

  const cardTone =
    effectiveStatus === "termine"
      ? "border-status-success bg-bg-surface opacity-65"
      : effectiveStatus === "ignore"
        ? "border-border-default bg-bg-surface opacity-45"
        : effectiveStatus === "en_retard"
          ? "border-status-warning bg-bg-surface"
          : "bg-bg-surface";

  const statusLabel =
    effectiveStatus === "en_cours"
      ? "En cours"
      : effectiveStatus === "termine"
        ? "Termine"
        : effectiveStatus === "en_retard"
          ? "En retard"
          : effectiveStatus === "ignore"
            ? "Ignore"
            : "A faire";

  return (
    <ScaleOnTap className="block h-full">
      <Card
        data-testid={`timeline-task-${instanceId}`}
          className={cn(
            "relative h-full overflow-hidden border-l-4 p-0 transition-all duration-200",
          cardTone,
          effectiveStatus === "a_faire" || effectiveStatus === "en_cours" ? categoryVisual.border : "",
          effectiveStatus === "en_cours"
            ? cn("ring-2 shadow-glass", categoryVisual.ring)
            : "",
          isSelected ? "ring-2 ring-brand-primary/45" : "",
          isFuture ? "opacity-100" : "",
          isPast && !isCurrent && !isDone && !isIgnored ? "opacity-85" : "",
        )}
      >
        <motion.div
          initial={false}
          animate={
            isDone && !prefersReducedMotion
              ? { scale: [1, 1.015, 1], opacity: [1, 0.96, 1] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: "easeOut" }}
          className="h-full"
        >
          <CardContent className={cn("h-full", isMini ? "space-y-1 p-2" : isCompact ? "space-y-1.5 p-2.5" : "space-y-3 p-3.5")}>
            <PointsFlyUp points={pointsFlyUp} sequence={instanceId} />

            <button
              type="button"
              className={cn("w-full text-left", isMini ? "space-y-0.5" : isCompact ? "space-y-1" : "space-y-1.5")}
              onClick={() => onSelect?.(instanceId)}
              aria-label={`Voir le detail de ${title}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-radius-pill border bg-bg-surface shadow-card",
                        isMini ? "size-6" : isCompact ? "size-7" : "size-9",
                        categoryVisual.border,
                      )}
                      aria-hidden="true"
                    >
                      <CategoryIcon className={isMini ? "size-3.5" : isCompact ? "size-4" : "size-5"} />
                    </span>
                    <p
                      className={cn(
                        "min-w-0 truncate font-bold leading-snug text-text-primary",
                        isMini ? "text-xs" : isCompact ? "text-sm" : "text-base sm:text-[1.02rem]",
                        isDone ? "line-through opacity-75" : "",
                      )}
                    >
                      {title}
                    </p>
                  </div>
                  <p className={cn("font-medium text-text-secondary", isMini ? "text-[0.7rem]" : isCompact ? "text-xs" : "text-sm sm:text-[0.96rem]")}>
                    {startTime} - {endTime}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {assignedLabel && !isCompact ? <Badge variant="neutral">{assignedLabel}</Badge> : null}
                  {!isMini ? (
                    <Badge
                      variant={
                        effectiveStatus === "termine"
                          ? "success"
                          : effectiveStatus === "en_retard"
                            ? "warning"
                            : effectiveStatus === "ignore"
                              ? "neutral"
                              : "info"
                      }
                    >
                      {statusLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </button>

            {!isCompact ? (
              <div className="flex flex-wrap gap-2">
                {isDone ? (
                  <Badge variant="success">+{Math.max(pointsEarned, pointsBase)} pts</Badge>
                ) : null}
                {isCurrent && effectiveStatus === "en_cours" ? (
                  <Badge variant="info" className={cn(!prefersReducedMotion ? "animate-pulse" : "")}>
                    En cours
                  </Badge>
                ) : null}
              </div>
            ) : null}

            {!isCompact && !isDone && !isIgnored && renderActions ? (
              <div className="flex flex-wrap items-center gap-2">
                {primaryTarget ? (
                  <Button
                    size="md"
                    variant={primaryTarget === "termine" ? "primary" : "secondary"}
                    disabled={isPending}
                    loading={isPending}
                    onClick={() => onStatusChange(instanceId, primaryTarget)}
                  >
                    {primaryTarget === "termine" ? "Valider" : "Commencer"}
                  </Button>
                ) : null}
                {canOpenFocus ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
                    onClick={() => onFocusMode(instanceId)}
                  >
                    Focus
                  </button>
                ) : null}
                {hasLinkedKnowledgeCard ? (
                  <Link
                    href={knowledgeCardId ? `/child/knowledge?cardId=${knowledgeCardId}` : "/child/knowledge"}
                    className="text-sm font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    Fiche
                  </Link>
                ) : null}
              </div>
            ) : null}

          </CardContent>
        </motion.div>
      </Card>
    </ScaleOnTap>
  );
}
