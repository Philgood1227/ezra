"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "transition"> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.25,
  ...props
}: FadeInProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { delay, duration, ease: "easeOut" as const },
      };

  return (
    <motion.div {...animationProps} {...props}>
      {children}
    </motion.div>
  );
}
