"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-radius-button font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-brand-primary to-brand-secondary text-text-inverse shadow-card hover:brightness-105",
        premium:
          "bg-gradient-to-r from-brand-500 via-brand-primary to-brand-secondary text-text-inverse shadow-elevated ring-1 ring-brand-200/55 hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "border border-border-default bg-bg-surface/80 text-text-primary shadow-card backdrop-blur-sm hover:bg-bg-surface-hover",
        glass:
          "border border-brand-100/65 bg-bg-surface/72 text-text-primary shadow-glass backdrop-blur-md hover:bg-bg-surface/88",
        tertiary:
          "border border-border-subtle bg-bg-elevated/85 text-text-primary shadow-card backdrop-blur-sm hover:bg-bg-surface-hover",
        ghost: "bg-transparent text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary",
        danger: "bg-status-error text-text-inverse shadow-card hover:bg-status-error/90",
        link: "bg-transparent text-brand-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-touch-sm px-3.5 text-sm",
        md: "h-touch-md px-4 text-sm",
        lg: "h-touch-lg px-6 text-base",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  const buttonContent = (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );

  if (isDisabled) {
    return (
      <ScaleOnTap className={cn(fullWidth ? "w-full" : "inline-flex")} scale={1}>
        {buttonContent}
      </ScaleOnTap>
    );
  }

  return <ScaleOnTap className={cn(fullWidth ? "w-full" : "inline-flex")}>{buttonContent}</ScaleOnTap>;
}

export { buttonVariants };
