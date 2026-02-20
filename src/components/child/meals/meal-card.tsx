"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import type { MealType } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

interface MealCardProps {
  mealType: MealType;
  description: string;
  preparedByLabel?: string | null;
  rating?: 1 | 2 | 3 | null;
  disabled?: boolean;
  onRate: (rating: 1 | 2 | 3) => void;
}

const MEAL_VISUALS: Record<MealType, { icon: string; label: string }> = {
  petit_dejeuner: { icon: "🥐", label: "Petit-déjeuner" },
  dejeuner: { icon: "🍽️", label: "Déjeuner" },
  diner: { icon: "🍝", label: "Dîner" },
  collation: { icon: "🍎", label: "Collation" },
};

const RATING_OPTIONS: Array<{ value: 1 | 2 | 3; emoji: string; label: string; tone: string }> = [
  { value: 1, emoji: "😐", label: "Bof", tone: "text-status-warning" },
  { value: 2, emoji: "🙂", label: "Bon", tone: "text-status-info" },
  { value: 3, emoji: "😍", label: "J'adore", tone: "text-status-success" },
];

export function MealCard({
  mealType,
  description,
  preparedByLabel = null,
  rating = null,
  disabled = false,
  onRate,
}: MealCardProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const visual = MEAL_VISUALS[mealType];

  return (
    <Card className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-text-primary">
            <span aria-hidden="true">{visual.icon} </span>
            {visual.label}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
      </header>

      <p className="text-xs text-text-secondary">
        Préparé par : <span className="font-semibold text-text-primary">{preparedByLabel ?? "La famille"}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {RATING_OPTIONS.map((option) => {
          const isSelected = rating === option.value;
          return (
            <ScaleOnTap key={option.value}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRate(option.value)}
                className={cn(
                  "flex h-touch-md min-w-[72px] items-center justify-center gap-1 rounded-radius-button border border-border-default bg-bg-surface px-3 text-sm font-semibold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                  disabled ? "cursor-not-allowed opacity-60" : "hover:bg-bg-surface-hover",
                  isSelected ? "border-brand-primary bg-brand-primary/10" : "",
                  rating !== null && !isSelected ? "opacity-45" : "",
                )}
                aria-label={option.label}
              >
                <motion.span
                  animate={isSelected ? { scale: 1.2 } : { scale: 1 }}
                  transition={{ duration: prefersReducedMotion ? 0.05 : 0.14, ease: "easeOut" }}
                  className={cn("text-xl", isSelected ? option.tone : "")}
                >
                  {option.emoji}
                </motion.span>
                <span>{option.label}</span>
              </button>
            </ScaleOnTap>
          );
        })}
      </div>
    </Card>
  );
}
