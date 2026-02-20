"use client";

import * as React from "react";
import { Badge, Card } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import type { KnowledgeCardSummary } from "@/lib/day-templates/types";
import { cn } from "@/lib/utils";

interface KnowledgeCardDetailProps {
  card: KnowledgeCardSummary;
  onBack: () => void;
  onToggleFavorite: () => void;
}

function getSectionStyle(title: string): string {
  const normalized = title.toLowerCase();

  if (normalized.includes("rappel")) {
    return "bg-status-info/12 border-status-info/25";
  }

  if (normalized.includes("exemple")) {
    return "bg-status-success/12 border-status-success/25";
  }

  if (normalized.includes("astuce")) {
    return "bg-status-warning/12 border-status-warning/25";
  }

  return "bg-bg-surface border-border-subtle";
}

export function KnowledgeCardDetail({
  card,
  onBack,
  onToggleFavorite,
}: KnowledgeCardDetailProps): React.JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <ScaleOnTap>
          <button
            type="button"
            onClick={onBack}
            className="rounded-radius-button border border-border-default bg-bg-surface px-3 py-2 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Retour
          </button>
        </ScaleOnTap>
        <ScaleOnTap>
          <button
            type="button"
            onClick={onToggleFavorite}
            className="rounded-radius-pill border border-border-default bg-bg-surface px-3 py-2 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            {card.isFavorite ? "❤️ Favori" : "🤍 Favori"}
          </button>
        </ScaleOnTap>
      </div>

      <header className="space-y-2">
        <h2 className="font-display text-2xl font-black tracking-tight text-text-primary">{card.title}</h2>
        <div className="flex items-center gap-2">
          {card.difficulty ? <Badge variant="info">{card.difficulty}</Badge> : null}
          {card.summary ? <p className="text-sm text-text-secondary">{card.summary}</p> : null}
        </div>
      </header>

      <div className="space-y-3">
        {card.content.sections.map((section, index) => (
          <section
            key={`${section.title}-${index}`}
            className={cn("rounded-radius-button border p-4", getSectionStyle(section.title))}
          >
            <h3 className="text-base font-black text-text-primary">{section.title}</h3>
            {section.text ? <p className="mt-1 text-sm text-text-secondary">{section.text}</p> : null}
            {section.bullets.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={`${section.title}-${bulletIndex}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </Card>
  );
}

