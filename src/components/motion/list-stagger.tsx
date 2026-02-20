"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function StaggerContainer({
  children,
  ...props
}: StaggerContainerProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const animationProps = prefersReducedMotion
    ? {}
    : {
        variants: {
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        },
        initial: "hidden" as const,
        animate: "show" as const,
      };

  return (
    <motion.div {...animationProps} {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: StaggerItemProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const animationProps = prefersReducedMotion
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
        },
      };

  return (
    <motion.div {...animationProps} {...props}>
      {children}
    </motion.div>
  );
}
