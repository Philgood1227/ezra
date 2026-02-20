import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description = "Aucun élément à afficher pour le moment.",
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center rounded-radius-card border border-border-subtle bg-bg-surface/80 px-6 py-8 text-center shadow-card backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-4 inline-flex size-16 items-center justify-center rounded-radius-pill bg-brand-primary/15 text-3xl text-brand-primary">
        {icon ?? "🌤️"}
      </div>
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-text-secondary">{description}</p>
      {action ? (
        <div className="mt-5">
          <Button onClick={action.onClick} variant="secondary">
            {action.label}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
