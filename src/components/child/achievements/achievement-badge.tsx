"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LockIcon, TrophyIcon } from "@/components/child/icons/child-premium-icons";
import { Badge, Modal } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  icon: string;
  label: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  hint?: string;
  colorKey?: string;
  freshUnlocked?: boolean;
}

const CATEGORY_RING: Record<string, string> = {
  "category-routine": "bg-category-routine/35",
  "category-ecole": "bg-category-ecole/35",
  "category-repas": "bg-category-repas/35",
  "category-sport": "bg-category-sport/35",
  "category-loisir": "bg-category-loisir/35",
  "category-calme": "bg-category-calme/35",
  "category-sommeil": "bg-category-sommeil/35",
};

function formatUnlockedDate(date?: string | null): string | null {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function AchievementBadge({
  icon,
  label,
  description,
  isUnlocked,
  unlockedAt = null,
  hint,
  colorKey = "category-routine",
  freshUnlocked = false,
}: AchievementBadgeProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = React.useState(false);
  const ringClass = CATEGORY_RING[colorKey] ?? "bg-brand-primary/30";
  const unlockedDate = formatUnlockedDate(unlockedAt);

  return (
    <>
      <ScaleOnTap className="w-full">
        <button
          type="button"
          disabled={!isUnlocked}
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full rounded-radius-card border border-border-subtle bg-bg-surface/80 p-3 text-center shadow-card backdrop-blur-sm transition-colors duration-200",
            isUnlocked ? "hover:bg-bg-surface-hover" : "opacity-80",
            !isUnlocked ? "cursor-default" : "",
          )}
        >
          <div className="mx-auto mb-2 grid size-16 place-items-center rounded-radius-pill bg-bg-surface-hover">
            {isUnlocked ? <span className="text-3xl">{icon}</span> : <LockIcon className="size-7 text-text-muted" />}
          </div>
          <p className={cn("text-sm font-black", isUnlocked ? "text-text-primary" : "text-text-muted")}>{label}</p>
          {isUnlocked ? (
            <p className="text-xs text-text-secondary">{unlockedDate ? `Debloque le ${unlockedDate}` : "Debloque"}</p>
          ) : (
            <p className="text-xs text-text-muted">{hint ?? "Continue"}</p>
          )}
        </button>
      </ScaleOnTap>

      <AnimatePresence>
        {freshUnlocked && isUnlocked ? (
          <motion.span
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-0 rounded-radius-card", ringClass)}
            initial={prefersReducedMotion ? { opacity: 0.5 } : { opacity: 0.2, scale: 0.9 }}
            animate={prefersReducedMotion ? { opacity: 0.5 } : { opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.04, 0.95] }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 1.2, repeat: Number.POSITIVE_INFINITY }}
          />
        ) : null}
      </AnimatePresence>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={label}
        description={unlockedDate ? `Debloque le ${unlockedDate}` : "Succes debloque"}
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">{description}</p>
          <Badge variant="success">
            <TrophyIcon className="size-4" />
            Badge debloque
          </Badge>
        </div>
      </Modal>
    </>
  );
}
