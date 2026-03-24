"use client";

import * as React from "react";
import { Button } from "@/components/ds";
import { cn } from "@/lib/utils";

export interface StepSectionItem {
  id: string;
  title: string;
}

function CompletedStepIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden="true">
      <path
        d="M5 10.5L8.5 14L15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface StepSectionsNavigatorProps {
  sections: StepSectionItem[];
  activeIndex: number;
  isDesktop: boolean;
  completedSectionIds?: string[];
  showCompletionProgress?: boolean;
  completionLabel?: string;
  maxSelectableIndex?: number;
  reduceMotion?: boolean;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function StepSectionsNavigator({
  sections,
  activeIndex,
  isDesktop,
  completedSectionIds = [],
  showCompletionProgress = false,
  completionLabel = "etapes vues",
  maxSelectableIndex,
  reduceMotion = false,
  onSelect,
  onPrevious,
  onNext,
}: StepSectionsNavigatorProps): React.JSX.Element {
  const currentLabel = sections[activeIndex]?.title ?? "";
  const totalSteps = sections.length;
  const completedCount = sections.reduce((count, section) => {
    return completedSectionIds.includes(section.id) ? count + 1 : count;
  }, 0);
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <section className="space-y-3" data-testid="revision-stepper">
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary"
          data-testid="revision-step-indicator"
        >
          Etape {activeIndex + 1} / {sections.length}
        </p>
        {!isDesktop ? (
          <p className="text-sm font-semibold text-text-primary" data-testid="revision-current-step-label">
            {currentLabel}
          </p>
        ) : null}
      </div>

      {showCompletionProgress ? (
        <div className="space-y-1.5" data-testid="revision-step-progress">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text-secondary" data-testid="revision-step-progress-label">
              {completedCount} / {totalSteps} {completionLabel}
            </p>
            <p className="text-xs font-semibold text-text-secondary">{progressPercent}%</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border-subtle/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
              data-testid="revision-step-progress-bar"
            />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Parcours de revision">
        {sections.map((section, index) => {
          const isActive = index === activeIndex;
          const isCompleted = completedSectionIds.includes(section.id);
          const isSelectable = maxSelectableIndex === undefined || index <= maxSelectableIndex;

          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!isSelectable}
              aria-label={`Etape ${index + 1}: ${section.title}`}
              onClick={() => {
                if (!isSelectable) {
                  return;
                }
                onSelect(index);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-radius-pill border px-3 py-1.5 text-sm font-semibold",
                reduceMotion ? "" : "transition-all duration-200",
                isActive
                  ? "border-brand-primary/45 bg-brand-primary/12 text-brand-primary shadow-card"
                  : "border-border-subtle bg-bg-surface/80 text-text-secondary hover:bg-bg-surface-hover",
                !isSelectable ? "cursor-not-allowed opacity-55 hover:bg-bg-surface/80" : "",
              )}
              data-testid={`revision-step-dot-${index}`}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-xs font-bold",
                  isActive
                    ? "bg-brand-primary text-text-inverse"
                    : showCompletionProgress && isCompleted
                      ? "bg-status-success/20 text-status-success"
                      : "bg-bg-elevated text-text-secondary",
                )}
                aria-hidden="true"
              >
                {showCompletionProgress && isCompleted ? <CompletedStepIcon /> : index + 1}
              </span>
              {isDesktop ? <span>{section.title}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={activeIndex <= 0}
          onClick={onPrevious}
          data-testid="revision-step-previous"
        >
          Precedent
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={activeIndex >= sections.length - 1}
          onClick={onNext}
          data-testid="revision-step-next"
        >
          Suivant
        </Button>
      </div>
    </section>
  );
}
