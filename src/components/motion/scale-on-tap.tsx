"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface ScaleOnTapProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  scale?: number;
}

export function ScaleOnTap({
  children,
  scale = 0.97,
  ...props
}: ScaleOnTapProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const tapProps = prefersReducedMotion ? {} : { whileTap: { scale } };

  return (
    <motion.div {...tapProps} {...props}>
      {children}
    </motion.div>
  );
}
