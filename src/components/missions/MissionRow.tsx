"use client";

import * as React from "react";
import { getActivityVisual } from "@/components/child/icons/child-premium-icons";
import { Badge, Button, CategoryIcon } from "@/components/ds";
import { cn } from "@/lib/utils";
import { getMissionStatusLabel } from "./mappers";
import type { MissionUI } from "./types";

interface MissionRowProps {
  mission: MissionUI;
  onOpen: (missionId: string) => void;
  onToggleDone: (missionId: string) => void | Promise<void>;
  onStart: (missionId: string) => void | Promise<void>;
  onFocus: (missionId: string) => void | Promise<void>;
  isPending?: boolean;
}

function statusPillVariant(status: MissionUI["status"]): "neutral" | "warning" | "success" {
  if (status === "in_progress") {
    return "warning";
  }

  if (status === "done") {
    return "success";
  }

  return "neutral";
}

export function MissionRow({
  mission,
  onOpen,
  onToggleDone,
  onStart,
  onFocus,
  isPending = false,
}: MissionRowProps): React.JSX.Element {
  const categoryVisual = getActivityVisual(mission.colorKey);
  const canStart = mission.status === "todo";
  const canFocus = mission.status === "in_progress";

  return (
    <article
      className={cn(
        "mission-row-surface p-3.5 sm:p-4",
        isPending && "pointer-events-none opacity-75",
      )}
      data-testid={`mission-row-${mission.id}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => void onToggleDone(mission.id)}
          className={cn(
            "inline-flex h-touch-sm w-touch-sm shrink-0 items-center justify-center rounded-radius-pill border text-base font-black transition-all duration-200",
            mission.status === "done"
              ? "border-status-success/35 bg-status-success/20 text-status-success"
              : "border-border-default bg-bg-surface text-text-secondary hover:border-status-success/35 hover:bg-status-success/12 hover:text-status-success",
          )}
          aria-label={
            mission.status === "done"
              ? `Mission ${mission.title} deja terminee`
              : `Marquer ${mission.title} comme faite`
          }
          disabled={isPending || mission.status === "done"}
        >
          {mission.status === "done" ? "v" : "o"}
        </button>

        <button
          type="button"
          className="flex min-h-touch-sm flex-1 items-start gap-3 text-left"
          onClick={() => onOpen(mission.id)}
          aria-label={`Voir la mission ${mission.title}`}
        >
          <span
            className={cn(
              "inline-flex h-touch-sm w-touch-sm shrink-0 items-center justify-center rounded-[16px] border",
              categoryVisual.borderClass,
              categoryVisual.softClass,
              categoryVisual.iconToneClass,
            )}
          >
            <CategoryIcon iconKey={mission.iconKey} className="size-5" />
          </span>

          <span className="min-w-0 flex-1 space-y-1">
            <span className="block truncate text-[clamp(1.2rem,1.7vw,2.15rem)] font-bold tracking-[0.01em] text-text-primary">
              {mission.title}
            </span>
            <Badge variant={statusPillVariant(mission.status)}>
              {getMissionStatusLabel(mission.status)}
            </Badge>
          </span>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant="neutral" className="min-h-touch-sm px-3 py-1 text-[1.05rem]">
            {mission.estimatedMinutes} min
          </Badge>
          <Badge variant="info" className="min-h-touch-sm px-3 py-1 text-[1.05rem] font-bold">
            +{mission.points}
          </Badge>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {canStart ? (
          <Button
            size="sm"
            variant="secondary"
            className="min-w-[8.75rem] rounded-radius-pill border-brand-primary/20 bg-brand-50 text-brand-primary"
            onClick={() => void onStart(mission.id)}
            disabled={isPending}
          >
            Commencer
          </Button>
        ) : null}

        {canFocus ? (
          <Button
            size="sm"
            variant="secondary"
            className="min-w-[8.75rem] rounded-radius-pill"
            onClick={() => void onFocus(mission.id)}
            disabled={isPending}
          >
            Focus
          </Button>
        ) : null}

        {mission.status === "done" ? (
          <Badge variant="success" className="min-h-touch-sm px-3 text-sm">
            Mission terminee
          </Badge>
        ) : null}
      </div>
    </article>
  );
}
