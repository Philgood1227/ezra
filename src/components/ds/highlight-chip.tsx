import * as React from "react";
import type { HighlightTag } from "@/lib/revisions/types";
import { cn } from "@/lib/utils";

interface HighlightChipProps {
  tag: HighlightTag;
  children: React.ReactNode;
  className?: string;
}

const tagClassMap: Record<HighlightTag, string> = {
  term:
    "inline-flex items-center rounded-radius-pill border border-status-warning/40 bg-status-warning/20 px-2 py-0.5 text-sm font-semibold text-brand-primary",
  keyword: "font-semibold text-brand-primary",
  ending: "font-semibold text-status-info underline decoration-status-info/70 decoration-2 underline-offset-2",
};

export function HighlightChip({ tag, children, className }: HighlightChipProps): React.JSX.Element {
  return <span className={cn(tagClassMap[tag], className)}>{children}</span>;
}
