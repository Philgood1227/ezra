"use client";

import * as React from "react";
import { Badge, Card } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  label: string;
  code: string;
  cardCount: number;
  categoryCount: number;
  selected?: boolean;
  onSelect: () => void;
}

function getSubjectVisual(label: string): { gradient: string; emoji: string } {
  const normalized = label.toLowerCase();

  if (normalized.includes("math")) {
    return { gradient: "from-status-info/65 to-brand-primary/65", emoji: "🔢" };
  }

  if (normalized.includes("fran")) {
    return { gradient: "from-status-success/65 to-brand-secondary/65", emoji: "✍️" };
  }

  if (normalized.includes("allem")) {
    return { gradient: "from-status-warning/65 to-status-error/65", emoji: "🗣️" };
  }

  return { gradient: "from-brand-primary/60 to-category-sommeil/60", emoji: "📘" };
}

export function SubjectCard({
  label,
  code,
  cardCount,
  categoryCount,
  selected = false,
  onSelect,
}: SubjectCardProps): React.JSX.Element {
  const visual = getSubjectVisual(label);

  return (
    <ScaleOnTap className="w-full">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <Card
          className={cn(
            "relative h-[120px] overflow-hidden border border-border-subtle p-4",
            selected ? "ring-2 ring-brand-primary" : "",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-90",
              visual.gradient,
            )}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full flex-col justify-between text-text-inverse">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{code}</p>
              <Badge variant="neutral" className="bg-bg-surface/80 text-text-primary">
                {cardCount} fiches
              </Badge>
            </div>
            <div>
              <p className="text-2xl" aria-hidden="true">
                {visual.emoji}
              </p>
              <p className="text-lg font-black">{label}</p>
              <p className="text-xs opacity-90">{categoryCount} catégorie(s)</p>
            </div>
          </div>
        </Card>
      </button>
    </ScaleOnTap>
  );
}

