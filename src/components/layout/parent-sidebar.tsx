"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ds";
import { ScaleOnTap } from "@/components/motion";
import {
  parentNavFooterItems,
  parentNavSections,
  type ParentNavBadgeKey,
  type ParentNavItem,
} from "@/config/parent-nav";
import type { ParentNavBadges } from "@/lib/navigation/parent-nav-badges";
import { cn } from "@/lib/utils";

interface ParentSidebarProps {
  currentPath: string;
  badges: ParentNavBadges;
  collapsed: boolean;
  mobileOpen: boolean;
  parentDisplayName: string;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

function LogoutIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m14 8 4 4-4 4M8 12h10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 transition-transform duration-200", collapsed ? "rotate-180" : "")} aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SectionChevronIcon({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 transition-transform duration-200", open ? "rotate-90" : "")} aria-hidden="true">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function normalizeHref(href: string): string {
  const hashIndex = href.indexOf("#");
  return hashIndex >= 0 ? href.slice(0, hashIndex) : href;
}

function isPathActive(currentPath: string, item: ParentNavItem): boolean {
  if (item.excludePrefixes?.some((prefix) => currentPath.startsWith(prefix))) {
    return false;
  }

  if (item.matchPrefixes?.some((prefix) => currentPath.startsWith(prefix))) {
    return true;
  }

  if (!item.href) {
    return false;
  }

  const normalizedHref = normalizeHref(item.href);
  return currentPath === normalizedHref || currentPath.startsWith(`${normalizedHref}/`);
}

function getBadgeTone(key: ParentNavBadgeKey): string {
  return key === "notifications" || key === "alarms"
    ? "bg-status-error text-text-inverse"
    : "bg-accent-warm text-text-inverse";
}

function NavItem({
  item,
  currentPath,
  badges,
  collapsed,
  pendingHref,
  onSetPendingHref,
  onNavigate,
}: {
  item: ParentNavItem;
  currentPath: string;
  badges: ParentNavBadges;
  collapsed: boolean;
  pendingHref: string | null;
  onSetPendingHref: React.Dispatch<React.SetStateAction<string | null>>;
  onNavigate: (href: string) => void;
}): React.JSX.Element {
  if (!item.href) {
    return <></>;
  }
  const href = item.href;

  const isActive = isPathActive(currentPath, item);
  const Icon = item.icon;
  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
  const showBadge = badgeCount > 0;
  const isPending = pendingHref === href && !isActive;

  return (
    <ScaleOnTap className="block">
      <Link
        href={href}
        onClick={() => {
          if (!isActive) {
            onSetPendingHref(href);
            window.setTimeout(() => {
              onSetPendingHref((current) => (current === href ? null : current));
            }, 2500);
          }
          onNavigate(href);
        }}
        title={collapsed ? item.label : undefined}
        className={cn(
          "relative flex h-touch-lg items-center rounded-radius-button border-l-4 px-3 text-sm font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
          isActive
            ? "border-l-brand-primary bg-brand-primary/10 text-brand-primary"
            : "border-l-transparent text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary",
          isPending ? "opacity-85" : "",
          collapsed ? "justify-center px-2" : "gap-3",
        )}
        aria-current={isActive ? "page" : undefined}
        aria-busy={isPending || undefined}
      >
        <Icon className="size-5 shrink-0" active={isActive} />
        <span className={cn(collapsed ? "sr-only" : "truncate")}>{item.label}</span>
        {isPending ? (
          <span
            className="absolute right-2 top-2 inline-flex size-3.5 animate-spin rounded-full border-2 border-brand-primary/30 border-t-brand-primary"
            aria-label="Navigation en cours"
          />
        ) : showBadge ? (
          <span
            className={cn(
              "absolute right-2 top-1 inline-flex min-w-5 items-center justify-center rounded-radius-pill px-1 text-[10px] font-bold",
              getBadgeTone(item.badgeKey ?? "notifications"),
            )}
            aria-label={`${badgeCount} element(s) en attente`}
          >
            {badgeCount}
          </span>
        ) : null}
      </Link>
    </ScaleOnTap>
  );
}

function getDefaultOpenSections(currentPath: string, collapsed: boolean): Set<string> {
  if (collapsed) {
    return new Set(parentNavSections.map((section) => section.id));
  }

  const next = new Set<string>(["overview", "learning"]);
  const activeSection = parentNavSections.find((section) =>
    section.items.some((item) => isPathActive(currentPath, item)),
  );

  if (activeSection) {
    next.add(activeSection.id);
  }

  return next;
}

function SidebarContent({
  currentPath,
  badges,
  collapsed,
  parentDisplayName,
  isLoggingOut = false,
  onToggleCollapsed,
  onNavigate,
  onLogout,
}: {
  currentPath: string;
  badges: ParentNavBadges;
  collapsed: boolean;
  parentDisplayName: string;
  isLoggingOut?: boolean;
  onToggleCollapsed: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}): React.JSX.Element {
  const [openSections, setOpenSections] = React.useState<Set<string>>(() =>
    getDefaultOpenSections(currentPath, collapsed),
  );
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPendingHref(null);
  }, [currentPath]);

  React.useEffect(() => {
    if (collapsed) {
      setOpenSections(new Set(parentNavSections.map((section) => section.id)));
      return;
    }

    const activeSection = parentNavSections.find((section) =>
      section.items.some((item) => isPathActive(currentPath, item)),
    );

    if (!activeSection) {
      return;
    }

    setOpenSections((current) => {
      if (current.has(activeSection.id)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeSection.id);
      return next;
    });
  }, [collapsed, currentPath]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-subtle p-3">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
          <Link
            href="/parent/dashboard"
            onClick={() => {
              setPendingHref("/parent/dashboard");
              window.setTimeout(() => {
                setPendingHref((current) => (current === "/parent/dashboard" ? null : current));
              }, 2500);
              onNavigate("/parent/dashboard");
            }}
            title={collapsed ? "Ezra - Parent" : undefined}
            className="rounded-radius-button px-2 py-1.5 text-left transition-colors duration-200 hover:bg-bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <p className={cn("font-display font-black tracking-tight text-text-primary", collapsed ? "text-base" : "text-lg")}>
              {collapsed ? "EP" : "Ezra - Parent"}
            </p>
            <p className={cn("text-xs text-text-secondary", collapsed ? "sr-only" : "block")}>{parentDisplayName}</p>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleCollapsed}
            className={cn(collapsed ? "hidden lg:inline-flex" : "inline-flex")}
            aria-label={collapsed ? "Deplier la navigation" : "Replier la navigation"}
          >
            <ChevronIcon collapsed={collapsed} />
          </Button>
        </div>
      </div>

      <nav aria-label="Navigation principale parent" className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {parentNavSections.map((section) => {
          const isOpen = collapsed || openSections.has(section.id);
          return (
            <section key={section.id} className="space-y-1">
              {collapsed ? (
                <p className="sr-only">{section.label}</p>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-radius-button px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-text-muted transition-colors duration-200 hover:bg-bg-surface-hover hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpenSections((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) {
                        next.delete(section.id);
                      } else {
                        next.add(section.id);
                      }
                      return next;
                    });
                  }}
                >
                  <span>{section.label}</span>
                  <SectionChevronIcon open={isOpen} />
                </button>
              )}

              {isOpen
                ? section.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      currentPath={currentPath}
                      badges={badges}
                      collapsed={collapsed}
                      pendingHref={pendingHref}
                      onSetPendingHref={setPendingHref}
                      onNavigate={onNavigate}
                    />
                  ))
                : null}
            </section>
          );
        })}
      </nav>

      <footer className="space-y-2 border-t border-border-subtle px-2 py-3">
        {parentNavFooterItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            currentPath={currentPath}
            badges={badges}
            collapsed={collapsed}
            pendingHref={pendingHref}
            onSetPendingHref={setPendingHref}
            onNavigate={onNavigate}
          />
        ))}
        <ScaleOnTap className="block">
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            title={collapsed ? "Deconnexion" : undefined}
            className={cn(
              "flex h-touch-lg w-full items-center rounded-radius-button border-l-4 border-l-transparent px-3 text-sm font-semibold text-text-secondary transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary hover:bg-bg-surface-hover hover:text-text-primary",
              "disabled:pointer-events-none disabled:opacity-60",
              collapsed ? "justify-center px-2" : "gap-3",
            )}
          >
            <LogoutIcon />
            <span className={cn(collapsed ? "sr-only" : "block")}>Deconnexion</span>
          </button>
        </ScaleOnTap>
      </footer>
    </div>
  );
}

export function ParentSidebar({
  currentPath,
  badges,
  collapsed,
  mobileOpen,
  parentDisplayName,
  onCloseMobile,
  onToggleCollapsed,
  onLogout,
  isLoggingOut = false,
}: ParentSidebarProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const overlayMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  const drawerMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { x: -26 },
        animate: { x: 0 },
        exit: { x: -26 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  return (
    <>
      <aside
        className={cn(
          "hidden border-r border-border-subtle bg-bg-elevated md:block",
          collapsed ? "w-20" : "w-[260px]",
        )}
      >
        <SidebarContent
          currentPath={currentPath}
          badges={badges}
          collapsed={collapsed}
          parentDisplayName={parentDisplayName}
          isLoggingOut={isLoggingOut}
          onToggleCollapsed={onToggleCollapsed}
          onNavigate={(href) => {
            void href;
          }}
          onLogout={onLogout}
        />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            {...overlayMotionProps}
          >
            <button
              type="button"
              className="absolute inset-0 bg-bg-base/70 backdrop-blur-sm"
              aria-label="Fermer la navigation parent"
              onClick={onCloseMobile}
            />
            <motion.aside
              className="relative h-full w-[86%] max-w-[300px] border-r border-border-subtle bg-bg-elevated shadow-elevated"
              {...drawerMotionProps}
            >
              <SidebarContent
                currentPath={currentPath}
                badges={badges}
                collapsed={false}
                parentDisplayName={parentDisplayName}
                isLoggingOut={isLoggingOut}
                onToggleCollapsed={() => undefined}
                onNavigate={(href) => {
                  void href;
                  onCloseMobile();
                }}
                onLogout={onLogout}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

