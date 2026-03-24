"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ds";
import { cn } from "@/lib/utils";

interface SectionAccordionProps {
  id: string;
  title: string;
  teaser?: string | undefined;
  isOpen: boolean;
  isActive?: boolean;
  reduceMotion?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  testId?: string;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn(
        "size-4 text-text-secondary transition-transform duration-200 ease-out",
        isOpen ? "rotate-180" : "rotate-0",
      )}
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SectionAccordion({
  id,
  title,
  teaser,
  isOpen,
  isActive = false,
  reduceMotion = false,
  onToggle,
  children,
  className,
  contentClassName,
  testId,
}: SectionAccordionProps): React.JSX.Element {
  const contentId = `${id}-content`;

  return (
    <Card
      className={cn(
        "mission-panel-surface",
        reduceMotion ? "" : "transition-all duration-200 ease-out",
        isActive ? "scale-[1.005] shadow-soft-xl" : "shadow-card",
        className,
      )}
      data-testid={testId}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-radius-button border border-border-subtle bg-bg-surface/70 px-4 py-3 text-left",
          reduceMotion ? "" : "transition-colors duration-200",
          "hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
        )}
      >
        <p className="font-display text-lg font-bold tracking-tight text-text-primary">{title}</p>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {!isOpen && teaser ? (
        <p className="line-clamp-2 px-1 pt-2 text-sm leading-relaxed text-text-secondary">{teaser}</p>
      ) : null}

      {isOpen ? (
        <CardContent id={contentId} className={cn("pt-3", contentClassName)}>
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}
