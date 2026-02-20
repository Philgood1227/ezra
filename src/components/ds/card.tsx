import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({
  className,
  interactive,
  ...props
}: CardProps): React.JSX.Element {
  const isInteractive = interactive ?? typeof props.onClick === "function";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border-subtle bg-bg-surface/80 p-5 shadow-card backdrop-blur-sm transition-all duration-200",
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
