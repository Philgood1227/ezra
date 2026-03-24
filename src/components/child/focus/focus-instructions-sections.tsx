"use client";

import * as React from "react";
import { CategoryIcon } from "@/components/ds";
import { splitMissionInstructionsHtml } from "@/lib/day-templates/instructions";
import { cn } from "@/lib/utils";

interface FocusInstructionsSectionsProps {
  instructionsHtml: string | null | undefined;
  className?: string;
  mainTitle?: string;
}

export function FocusInstructionsSections({
  instructionsHtml,
  className,
  mainTitle = "Ce que tu dois faire",
}: FocusInstructionsSectionsProps): React.JSX.Element {
  const sections = React.useMemo(
    () => splitMissionInstructionsHtml(instructionsHtml ?? ""),
    [instructionsHtml],
  );

  return (
    <div className={cn("space-y-4", className)} data-testid="focus-instructions-sections">
      <section className="mission-panel-surface focus-instructions-surface p-5 md:p-6" data-testid="focus-instructions-main">
        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Instructions</p>
          <h2 className="font-display text-2xl font-black tracking-tight text-text-primary">{mainTitle}</h2>
        </header>
        <div
          className="mission-richtext mt-4 space-y-3"
          dangerouslySetInnerHTML={{ __html: sections.mainInstructionsHtml }}
        />
      </section>

      {sections.tipHtml ? (
        <section
          className="mission-panel-surface focus-tip-surface p-5 md:p-6"
          data-testid="focus-instructions-tip"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-radius-button border border-status-info/30 bg-status-info/15 text-status-info">
              <CategoryIcon iconKey="health" className="size-5" />
            </span>
            <h3 className="font-display text-xl font-black tracking-tight text-text-primary">Astuce</h3>
          </div>
          <div
            className="mission-richtext mt-3.5 space-y-3"
            dangerouslySetInnerHTML={{ __html: sections.tipHtml }}
          />
        </section>
      ) : null}
    </div>
  );
}
