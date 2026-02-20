"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface PageTransitionProps extends Omit<HTMLMotionProps<"div">, "transition"> {
  children: React.ReactNode;
}

export function PageTransition({
  children,
  className,
  ...props
}: PageTransitionProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3, ease: "easeOut" as const },
      };

  return (
    <motion.div className={className} {...animationProps} {...props}>
      {children}
    </motion.div>
  );
}
