"use client";

import * as React from "react";
import { CinemaIcon, TrophyIcon } from "@/components/child/icons/child-premium-icons";
import { Badge, Button, Card } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

interface MovieOptionCardProps {
  title: string;
  platform?: string | null;
  durationMinutes?: number | null;
  description?: string | null;
  isSelected: boolean;
  isChosen: boolean;
  onVote: () => void;
  disabled?: boolean;
  index?: number;
}

const POSTER_GRADIENTS = [
  "from-brand-primary/75 to-category-sommeil/70",
  "from-accent-soft/75 to-category-loisir/65",
  "from-accent-warm/75 to-status-warning/65",
];

function getPosterGradient(index: number): string {
  const fallback = POSTER_GRADIENTS[0];
  if (!fallback) {
    return "from-brand-primary/75 to-category-sommeil/70";
  }
  return POSTER_GRADIENTS[index % POSTER_GRADIENTS.length] ?? fallback;
}

export function MovieOptionCard({
  title,
  platform,
  durationMinutes,
  description,
  isSelected,
  isChosen,
  onVote,
  disabled = false,
  index = 0,
}: MovieOptionCardProps): React.JSX.Element {
  const gradientClass = getPosterGradient(index);

  return (
    <Card
      className={cn(
        "relative min-h-[300px] overflow-hidden p-0",
        isChosen ? "border-accent-warm shadow-glass" : isSelected ? "border-accent-warm/70" : "",
      )}
    >
      <div className={cn("h-40 bg-gradient-to-br p-3 text-text-inverse", gradientClass)}>
        <div className="flex h-full flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Option film</p>
          <CinemaIcon className="size-11" />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 text-base font-black text-text-primary">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {platform ? <Badge variant="info">{platform}</Badge> : null}
            {durationMinutes ? <Badge variant="neutral">{durationMinutes} min</Badge> : null}
          </div>
        </div>

        {description ? <p className="line-clamp-2 text-sm text-text-secondary">{description}</p> : null}

        <div className="pt-1">
          {isChosen ? (
            <Badge variant="warning">
              <TrophyIcon className="size-4" />
              Film choisi
            </Badge>
          ) : (
            <ScaleOnTap className="w-full">
              <Button size="lg" fullWidth variant={isSelected ? "primary" : "secondary"} onClick={onVote} disabled={disabled}>
                {isSelected ? "Mon choix" : "Choisir ce film"}
              </Button>
            </ScaleOnTap>
          )}
        </div>
      </div>
    </Card>
  );
}
