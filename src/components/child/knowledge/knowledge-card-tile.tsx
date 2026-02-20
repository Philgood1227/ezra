"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { StarIcon } from "@/components/child/icons/child-premium-icons";
import { Badge, Card } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

interface KnowledgeCardTileProps {
  title: string;
  summary?: string | null;
  difficulty?: string | null;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onOpen: () => void;
}

export function KnowledgeCardTile({
  title,
  summary,
  difficulty,
  isFavorite,
  onFavoriteToggle,
  onOpen,
}: KnowledgeCardTileProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <ScaleOnTap className="w-full">
      <Card interactive className="p-0">
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <p className="truncate text-base font-black text-text-primary">{title}</p>
              {summary ? <p className="line-clamp-1 text-sm text-text-secondary">{summary}</p> : null}
            </button>
            <button
              type="button"
              onClick={onFavoriteToggle}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="rounded-radius-pill p-1.5 text-text-secondary transition-colors duration-200 hover:bg-bg-surface-hover hover:text-accent-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <motion.span
                initial={false}
                animate={isFavorite ? { scale: 1.15 } : { scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0.05 : 0.16, ease: "easeOut" }}
                className={cn("inline-flex", isFavorite ? "text-accent-warm" : "text-text-muted")}
              >
                <StarIcon className="size-5" />
              </motion.span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {difficulty ? <Badge variant="info">{difficulty}</Badge> : null}
            <button
              type="button"
              onClick={onOpen}
              className="text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Ouvrir la fiche
            </button>
          </div>
        </div>
      </Card>
    </ScaleOnTap>
  );
}
