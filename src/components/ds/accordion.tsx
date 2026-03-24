"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

export interface AccordionSectionProps {
  id: string;
  title: string;
  teaser?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  buttonClassName?: string;
  testId?: string;
}

export function AccordionSection({
  id,
  title,
  teaser,
  isOpen,
  onToggle,
  children,
  className,
  headerClassName,
  contentClassName,
  buttonClassName,
  testId,
}: AccordionSectionProps): React.JSX.Element {
  const contentId = `${id}-content`;

  return (
    <Card className={cn("mission-panel-surface", className)} data-testid={testId}>
      <div className={cn("space-y-2", headerClassName)}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-radius-button border border-border-subtle bg-bg-surface/70 px-4 py-3 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
            buttonClassName,
          )}
        >
          <span className="font-display text-lg font-bold tracking-tight text-text-primary">{title}</span>
          <span className="text-sm font-semibold text-text-secondary" aria-hidden="true">
            {isOpen ? "Masquer" : "Voir"}
          </span>
        </button>

        {!isOpen && teaser ? (
          <p className="line-clamp-2 px-1 text-sm leading-relaxed text-text-secondary">{teaser}</p>
        ) : null}
      </div>

      {isOpen ? (
        <CardContent id={contentId} className={cn("pt-3", contentClassName)}>
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}
