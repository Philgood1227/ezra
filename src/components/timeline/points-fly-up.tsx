"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface PointsFlyUpProps {
  points: number;
  sequence?: string | number;
}

export function PointsFlyUp({ points, sequence }: PointsFlyUpProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const key = `${sequence ?? "points"}-${points}`;

  return (
    <AnimatePresence>
      {points > 0 ? (
        <motion.span
          key={key}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          animate={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -40, scale: 1.06 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.8, ease: "easeOut" }}
          className="pointer-events-none absolute -top-2 right-2 text-sm font-black text-accent-warm"
          aria-live="polite"
        >
          +{points} points
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
