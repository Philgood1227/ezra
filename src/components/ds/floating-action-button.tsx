"use client";

import * as React from "react";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

export interface FloatingActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  icon: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

export function FloatingActionButton({
  icon,
  ariaLabel,
  className,
  type = "button",
  ...props
}: FloatingActionButtonProps): React.JSX.Element {
  return (
    <ScaleOnTap className="inline-flex">
      <button
        type={type}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex size-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-brand-primary to-brand-secondary text-text-inverse shadow-card",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
          "disabled:pointer-events-none disabled:opacity-55",
          className,
        )}
        {...props}
      >
        <span className="inline-flex size-6 items-center justify-center [&_svg]:size-6">{icon}</span>
      </button>
    </ScaleOnTap>
  );
}
