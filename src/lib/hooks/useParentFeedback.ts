"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ParentFeedbackTone = "info" | "success" | "warning" | "error";

export interface ParentFeedbackState {
  tone: ParentFeedbackTone;
  message: string;
}

interface UseParentFeedbackOptions {
  autoDismissTones?: ReadonlyArray<ParentFeedbackTone>;
  autoDismissMs?: number;
}

const DEFAULT_AUTO_DISMISS_TONES: ReadonlyArray<ParentFeedbackTone> = ["success"];
const DEFAULT_AUTO_DISMISS_MS = 4000;

export function useParentFeedback(
  options: UseParentFeedbackOptions = {},
): {
  feedback: ParentFeedbackState | null;
  showFeedback: (next: ParentFeedbackState) => void;
  clearFeedback: () => void;
} {
  const autoDismissTones = options.autoDismissTones ?? DEFAULT_AUTO_DISMISS_TONES;
  const autoDismissMs = options.autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS;

  const [feedback, setFeedback] = useState<ParentFeedbackState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setFeedback(null);
  }, []);

  const showFeedback = useCallback(
    (next: ParentFeedbackState) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setFeedback(next);

      if (autoDismissTones.includes(next.tone)) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          setFeedback(null);
        }, autoDismissMs);
      }
    },
    [autoDismissMs, autoDismissTones],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    feedback,
    showFeedback,
    clearFeedback,
  };
}

