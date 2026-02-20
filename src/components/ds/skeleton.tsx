import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
  count?: number;
}

function SkeletonBlock({ className, circle, ...props }: SkeletonProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-radius-button bg-bg-surface-hover before:absolute before:inset-0 before:animate-shimmer before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] before:bg-[length:200%_100%] before:content-['']",
        circle && "rounded-radius-pill",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({
  className,
  circle = false,
  count = 1,
  ...props
}: SkeletonProps): React.JSX.Element {
  if (count <= 1) {
    return <SkeletonBlock className={className} circle={circle} {...props} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock
          key={`${index}-${className ?? "skeleton"}`}
          className={className}
          circle={circle}
          {...props}
        />
      ))}
    </div>
  );
}
