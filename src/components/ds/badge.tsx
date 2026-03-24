import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-radius-pill border px-2.5 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        neutral: "border-border-default bg-bg-surface text-text-secondary",
        glass: "border-brand-100/65 bg-brand-50/55 text-brand-700 backdrop-blur-sm",
        success: "border-status-success/35 bg-status-success/15 text-status-success",
        warning: "border-status-warning/35 bg-status-warning/15 text-status-warning",
        error: "border-status-error/35 bg-status-error/15 text-status-error",
        danger: "border-status-error/35 bg-status-error/15 text-status-error",
        info: "border-status-info/35 bg-status-info/15 text-status-info",
        routine: "border-category-routine/40 bg-category-routine/20 text-text-primary",
        ecole: "border-category-ecole/40 bg-category-ecole/20 text-text-primary",
        repas: "border-category-repas/40 bg-category-repas/20 text-text-primary",
        sport: "border-category-sport/40 bg-category-sport/20 text-text-primary",
        loisir: "border-category-loisir/40 bg-category-loisir/20 text-text-primary",
        calme: "border-category-calme/40 bg-category-calme/20 text-text-primary",
        sommeil: "border-category-sommeil/40 bg-category-sommeil/20 text-text-primary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
