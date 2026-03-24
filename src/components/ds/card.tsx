import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  surface?: "default" | "glass" | "child";
}

export function Card({
  className,
  interactive,
  surface = "default",
  ...props
}: CardProps): React.JSX.Element {
  const isInteractive = interactive ?? typeof props.onClick === "function";

  const surfaceClass =
    surface === "glass"
      ? "border-brand-100/70 bg-bg-surface/76 shadow-glass backdrop-blur-md"
      : surface === "child"
        ? "border-brand-100/80 bg-gradient-to-br from-brand-50/55 via-bg-surface/90 to-bg-surface/88 shadow-elevated backdrop-blur-md"
        : "border-border-subtle bg-bg-surface/80 shadow-card backdrop-blur-sm";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200",
        surfaceClass,
        isInteractive && "hover:-translate-y-0.5 hover:bg-bg-surface hover:shadow-glass",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h2
      className={cn("font-display text-xl font-bold tracking-tight text-text-primary", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("space-y-3", className)} {...props} />;
}
