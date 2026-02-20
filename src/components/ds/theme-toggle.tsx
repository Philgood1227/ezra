"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScaleOnTap } from "@/components/motion";
import { useTheme } from "@/lib/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

function SunIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5V5" />
        <path d="M12 19V21.5" />
        <path d="M4.22 4.22L6 6" />
        <path d="M18 18L19.78 19.78" />
        <path d="M2.5 12H5" />
        <path d="M19 12h2.5" />
        <path d="M4.22 19.78L6 18" />
        <path d="M18 6l1.78-1.78" />
      </g>
    </svg>
  );
}

function MoonIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.73 3.3a1 1 0 0 0-1.1 1.5 7.24 7.24 0 0 1 .86 3.44A7.74 7.74 0 0 1 7.76 16a7.24 7.24 0 0 1-3.44-.86 1 1 0 0 0-1.5 1.1A9.74 9.74 0 1 0 15.73 3.3Z"
      />
    </svg>
  );
}

export function ThemeToggle({ className }: ThemeToggleProps): React.JSX.Element {
  const { toggleTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const isDark =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false;

  return (
    <ScaleOnTap className={cn("inline-flex", className)}>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-touch-md w-touch-md items-center justify-center rounded-radius-pill border border-border-default bg-bg-surface/80 text-text-primary shadow-glass transition-all duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={prefersReducedMotion ? false : { opacity: 0, rotate: -20, scale: 0.92 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 20, scale: 0.92 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </motion.span>
        </AnimatePresence>
      </button>
    </ScaleOnTap>
  );
}
