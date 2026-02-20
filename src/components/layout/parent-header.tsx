"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, Button, ThemeToggle } from "@/components/ds";
import type { ParentBreadcrumbItem } from "@/lib/navigation/parent-breadcrumb";
import { cn } from "@/lib/utils";

interface ParentHeaderProps {
  title: string;
  breadcrumb: ParentBreadcrumbItem[];
  parentDisplayName: string;
  actions?: React.ReactNode;
  onOpenMobileSidebar: () => void;
  onToggleSidebarCollapse: () => void;
  sidebarCollapsed: boolean;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

function HamburgerIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 transition-transform duration-200", collapsed ? "rotate-180" : "")} aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChildIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ParentHeader({
  title,
  breadcrumb,
  parentDisplayName,
  actions,
  onOpenMobileSidebar,
  onToggleSidebarCollapse,
  sidebarCollapsed,
  onLogout,
  isLoggingOut = false,
}: ParentHeaderProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/90 pt-safe backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-3 px-safe sm:px-4 lg:px-6">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="md:hidden"
              onClick={onOpenMobileSidebar}
              aria-label="Ouvrir la navigation parent"
            >
              <HamburgerIcon />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={onToggleSidebarCollapse}
              aria-label={sidebarCollapsed ? "Déplier la navigation" : "Replier la navigation"}
            >
              <CollapseIcon collapsed={sidebarCollapsed} />
            </Button>

            <nav aria-label="Fil d'ariane" className="hidden items-center gap-1 text-xs text-text-secondary sm:flex">
              {breadcrumb.map((item, index) => {
                const isLast = index === breadcrumb.length - 1;
                return (
                  <React.Fragment key={`${item.label}-${index}`}>
                    {index > 0 ? <span aria-hidden="true">›</span> : null}
                    {isLast || !item.href ? (
                      <span className={cn(isLast ? "font-semibold text-text-primary" : "")}>{item.label}</span>
                    ) : (
                      <Link
                        href={item.href}
                        className="rounded-radius-button px-1 py-0.5 transition-colors duration-200 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                      >
                        {item.label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
          <p className="truncate font-display text-lg font-black text-text-primary sm:text-xl">{title}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="hidden md:inline-flex"
            onClick={() => window.open("/child", "_blank", "noopener,noreferrer")}
          >
            <ChildIcon />
            Voir comme l&apos;enfant
          </Button>
          {actions}
          <ThemeToggle />
          <div className="hidden items-center gap-2 rounded-radius-pill border border-border-default bg-bg-surface/80 px-2.5 py-1.5 shadow-card sm:flex">
            <Avatar name={parentDisplayName} size="sm" />
            <span className="max-w-24 truncate text-xs font-semibold text-text-secondary lg:max-w-32">
              {parentDisplayName}
            </span>
          </div>
          <Button size="sm" variant="secondary" loading={isLoggingOut} onClick={onLogout}>
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
}
