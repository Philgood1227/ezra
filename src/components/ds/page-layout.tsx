import * as React from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export function PageLayout({
  title,
  subtitle,
  actions,
  children,
  className,
  hideHeader = false,
}: PageLayoutProps): React.JSX.Element {
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8", className)}>
      {!hideHeader ? (
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
