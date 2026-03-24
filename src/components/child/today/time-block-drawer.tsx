"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { Badge, Button } from "@/components/ds";
import type { TimeBlock, TimeBlockActivity, TimeBlockId } from "@/components/child/today/types";
import { cn } from "@/lib/utils";

interface TimeBlockDrawerProps {
  open: boolean;
  block: TimeBlock | null;
  onClose: () => void;
  onStartMission: (timeBlockId: TimeBlockId, activityId: string) => void;
}

function getBlockTitle(blockId: TimeBlockId): string {
  if (blockId === "morning") {
    return "Ce matin";
  }
  if (blockId === "noon") {
    return "Ce midi";
  }
  if (blockId === "afternoon") {
    return "Cet apres-midi";
  }
  if (blockId === "home") {
    return "En rentrant a la maison";
  }
  return "Ce soir";
}

function getActivityIcon(type: TimeBlockActivity["type"]): string {
  if (type === "school") {
    return "🏫";
  }
  if (type === "homework") {
    return "📘";
  }
  if (type === "activity") {
    return "⭐";
  }
  return "🎉";
}

export function TimeBlockDrawer({
  open,
  block,
  onClose,
  onStartMission,
}: TimeBlockDrawerProps): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  const homeworkActivity =
    block?.activities.find((activity) => activity.type === "homework") ?? null;
  const funActivity = block?.activities.find((activity) => activity.type === "fun") ?? null;

  return createPortal(
    <AnimatePresence>
      {open && block ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm"
          onClick={onClose}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={getBlockTitle(block.id)}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl rounded-t-[24px] border border-border-subtle bg-bg-surface px-4 pb-5 pt-4 shadow-elevated"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: "easeOut" }}
          >
            <div
              className="mx-auto mb-3 h-1.5 w-14 rounded-radius-pill bg-border-default"
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  {getBlockTitle(block.id)}
                </h2>
                <p className="text-sm text-text-secondary">
                  Ce qui est prevu dans ce moment de la journee.
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={onClose}>
                Fermer
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {block.activities.length === 0 ? (
                <p className="rounded-radius-button border border-border-subtle bg-bg-elevated px-3 py-3 text-sm text-text-secondary">
                  Rien de special dans ce bloc pour le moment.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {block.activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="rounded-radius-button border border-border-subtle bg-bg-elevated px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl" aria-hidden="true">
                          {getActivityIcon(activity.type)}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-base font-semibold text-text-primary">
                            {activity.label}
                          </p>
                          {activity.note ? (
                            <p className="reading text-sm leading-relaxed text-text-secondary">
                              {activity.note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {homeworkActivity ? (
                <article className="rounded-radius-card border border-brand-primary/30 bg-brand-primary/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-text-primary">
                      Mission principale dans ce bloc
                    </h3>
                    <Badge variant="info">Mission</Badge>
                  </div>
                  <p className="mt-2 text-base font-semibold text-text-primary">
                    {homeworkActivity.label}
                  </p>
                  {homeworkActivity.durationMinutes ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      ≈ {homeworkActivity.durationMinutes} min
                    </p>
                  ) : null}
                  <Button
                    size="lg"
                    variant="primary"
                    className="mt-3 w-full"
                    onClick={() => onStartMission(block.id, homeworkActivity.id)}
                  >
                    Commencer maintenant
                  </Button>
                </article>
              ) : null}

              {funActivity ? (
                <p
                  className={cn(
                    "rounded-radius-button border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-secondary",
                  )}
                >
                  Moment sympa:{" "}
                  <span className="font-semibold text-text-primary">{funActivity.label}</span>
                </p>
              ) : null}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
