"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ds";
import { TimeBlockDrawer } from "@/components/child/today/time-block-drawer";
import type { TimeBlock, TimeBlockId } from "@/components/child/today/types";
import { cn } from "@/lib/utils";

interface TimeGridTimelineProps {
  blocks: TimeBlock[];
  onStartMission: (timeBlockId: TimeBlockId, activityId: string) => void;
  className?: string;
}

function getBlockStateClasses(state: TimeBlock["state"]): string {
  if (state === "past") {
    return "border-border-subtle bg-bg-elevated text-text-secondary";
  }

  if (state === "current") {
    return "border-brand-primary/35 bg-brand-primary/12 text-brand-primary shadow-card";
  }

  return "border-border-default bg-bg-surface text-text-primary";
}

function getStateLabel(state: TimeBlock["state"]): string {
  if (state === "past") {
    return "Passe";
  }

  if (state === "current") {
    return "Maintenant";
  }

  return "A venir";
}

export function TimeGridTimeline({
  blocks,
  onStartMission,
  className,
}: TimeGridTimelineProps): React.JSX.Element {
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null);
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <>
      <Card className={cn("border-border-default bg-bg-surface/95 shadow-card", className)}>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">
              Timeline de la journee
            </h2>
            <p className="text-sm text-text-secondary">Touchez un bloc pour voir les details.</p>
          </div>
          <ul
            className={cn("grid gap-2", blocks.length === 3 ? "grid-cols-3" : "grid-cols-5")}
            data-testid="today-time-grid"
          >
            {blocks.map((block) => (
              <li key={block.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={cn(
                    "flex min-h-[108px] w-full flex-col items-center justify-between rounded-radius-card border px-2 py-2 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                    getBlockStateClasses(block.state),
                  )}
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-radius-pill border border-border-subtle bg-bg-surface/70">
                    {block.icon}
                  </span>
                  <span className="text-sm font-bold">{block.label}</span>
                  <span className="text-xs font-semibold">{getStateLabel(block.state)}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <TimeBlockDrawer
        open={Boolean(selectedBlock)}
        block={selectedBlock}
        onClose={() => setSelectedBlockId(null)}
        onStartMission={onStartMission}
      />
    </>
  );
}
