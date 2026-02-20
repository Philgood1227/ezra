"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AchievementUnlockCelebrationProps {
  open: boolean;
  icon: string;
  label: string;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "bg-brand-primary",
  "bg-brand-secondary",
  "bg-accent-warm",
  "bg-status-success",
  "bg-category-loisir",
  "bg-category-calme",
];

export function AchievementUnlockCelebration({
  open,
  icon,
  label,
  onClose,
}: AchievementUnlockCelebrationProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(onClose, 1800);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-[70] grid place-items-center bg-bg-base/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.2 }}
        >
          <div className="relative overflow-hidden rounded-radius-card border border-border-subtle bg-bg-surface/95 px-8 py-7 text-center shadow-elevated">
            {!prefersReducedMotion ? (
              <div className="pointer-events-none absolute inset-0">
                {Array.from({ length: 14 }).map((_, index) => (
                  <motion.span
                    key={index}
                    className={cn(
                      "absolute top-0 size-2 rounded-radius-pill",
                      CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                    )}
                    style={{ left: `${8 + (index % 7) * 13}%` }}
                    initial={{ y: -20, opacity: 0, rotate: 0 }}
                    animate={{ y: 160, opacity: [0, 1, 0], rotate: (index % 2 === 0 ? 1 : -1) * 180 }}
                    transition={{ duration: 1.05, delay: (index % 7) * 0.04, ease: "easeOut" }}
                  />
                ))}
              </div>
            ) : null}

            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              transition={{ duration: prefersReducedMotion ? 0.1 : 0.22, ease: "easeOut" }}
              className="relative z-10 space-y-2"
            >
              <p className="text-sm font-black text-accent-warm">Nouveau succes</p>
              <p className="text-5xl" aria-hidden="true">
                {icon}
              </p>
              <p className="font-display text-2xl font-black text-text-primary">{label}</p>
            </motion.div>
          </div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
