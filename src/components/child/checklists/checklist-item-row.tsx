"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

interface ChecklistItemRowProps {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ChecklistItemRow({
  label,
  isChecked,
  onToggle,
  disabled = false,
}: ChecklistItemRowProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <ScaleOnTap className="w-full">
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "flex h-touch-lg w-full items-center gap-3 rounded-radius-button border border-border-default bg-bg-surface/80 px-3 text-left transition-colors duration-200",
          "hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
          disabled ? "cursor-not-allowed opacity-60" : "",
        )}
      >
        <motion.span
          className={cn(
            "grid size-7 place-items-center rounded-radius-pill border-2 transition-colors duration-200",
            isChecked ? "border-status-success bg-status-success/15" : "border-border-default bg-bg-surface",
          )}
          animate={
            isChecked && !prefersReducedMotion
              ? { scale: [1, 1.08, 1], opacity: [1, 0.9, 1] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.22, ease: "easeOut" }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="size-4 text-status-success">
            <motion.path
              d="M5 13.5 10 18 19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={prefersReducedMotion ? { pathLength: isChecked ? 1 : 0 } : { pathLength: isChecked ? 1 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0.05 : 0.2, ease: "easeOut" }}
            />
          </svg>
        </motion.span>

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-semibold transition-[color,text-decoration-color] duration-200",
            isChecked ? "text-text-muted line-through decoration-text-muted" : "text-text-primary",
          )}
        >
          {label}
        </span>
      </button>
    </ScaleOnTap>
  );
}
