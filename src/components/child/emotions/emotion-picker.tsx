"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button, Input } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import type { EmotionMoment, EmotionValue } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

const EMOTION_OPTIONS: Array<{ value: EmotionValue; emoji: string; label: string; ring: string }> = [
  { value: "tres_content", emoji: "??", label: "Tres content", ring: "ring-status-success" },
  { value: "content", emoji: "??", label: "Content", ring: "ring-brand-secondary" },
  { value: "neutre", emoji: "??", label: "Neutre", ring: "ring-status-info" },
  { value: "triste", emoji: "??", label: "Triste", ring: "ring-status-warning" },
  { value: "tres_triste", emoji: "??", label: "Tres triste", ring: "ring-status-error" },
];

interface EmotionPickerProps {
  moment: EmotionMoment;
  selectedEmotion?: EmotionValue | null;
  isCompleted: boolean;
  initialNote?: string | null;
  isPending?: boolean;
  onSelect: (emotion: EmotionValue, note: string | null) => void;
}

export function EmotionPicker({
  moment,
  selectedEmotion = null,
  isCompleted,
  initialNote = null,
  isPending = false,
  onSelect,
}: EmotionPickerProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [draftEmotion, setDraftEmotion] = React.useState<EmotionValue | null>(selectedEmotion);
  const [note, setNote] = React.useState(initialNote ?? "");

  React.useEffect(() => {
    setDraftEmotion(selectedEmotion);
  }, [selectedEmotion]);

  React.useEffect(() => {
    setNote(initialNote ?? "");
  }, [initialNote]);

  const selectedOption = EMOTION_OPTIONS.find((option) => option.value === draftEmotion) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-secondary">
          {moment === "matin" ? "Matin" : "Soir"}
        </p>
        <p className="text-xs text-text-muted">{isCompleted ? "Enregistre" : "A faire"}</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {EMOTION_OPTIONS.map((option) => {
          const isSelected = draftEmotion === option.value;
          const hasSelection = draftEmotion !== null;

          return (
            <ScaleOnTap key={option.value} className="shrink-0">
              <button
                type="button"
                onClick={() => setDraftEmotion(option.value)}
                className={cn(
                  "grid h-16 w-16 place-items-center rounded-radius-pill border border-border-default bg-bg-surface text-3xl transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                  hasSelection && !isSelected ? "opacity-35" : "opacity-100",
                  isSelected ? cn("ring-2", option.ring, "shadow-glass") : "",
                )}
                aria-label={option.label}
              >
                <motion.span
                  layoutId={`emotion-${moment}`}
                  animate={isSelected ? { scale: 1.25 } : { scale: 1 }}
                  transition={{ duration: prefersReducedMotion ? 0.05 : 0.15 }}
                >
                  {option.emoji}
                </motion.span>
              </button>
            </ScaleOnTap>
          );
        })}
      </div>

      <p className="text-sm font-semibold text-text-primary">{selectedOption?.label ?? "Choisir une emotion"}</p>

      <Input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note courte (optionnel)"
        className="h-touch-md"
      />

      <Button
        size="lg"
        variant="primary"
        disabled={!draftEmotion || isPending}
        onClick={() => {
          if (!draftEmotion) {
            return;
          }
          onSelect(draftEmotion, note.trim() ? note.trim() : null);
        }}
      >
        Enregistrer
      </Button>
    </div>
  );
}
