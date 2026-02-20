"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScaleOnTap } from "@/components/motion";
import { cn } from "@/lib/utils";

function DefaultTabIcon({ active }: { active: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r={active ? "6.5" : "6"}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export interface TabBarItemConfig {
  href?: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  activeIcon?: React.ReactNode;
  badgeCount?: number | undefined;
  showBadgeDot?: boolean | undefined;
  onClick?: (() => void) | undefined;
  isActive?: boolean | undefined;
  matchPrefixes?: string[] | undefined;
}

interface TabBarProps {
  items: TabBarItemConfig[];
  className?: string;
}

interface TabBarItemProps {
  href?: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  activeIcon?: React.ReactNode;
  badgeCount?: number | undefined;
  showBadgeDot?: boolean | undefined;
  onClick?: (() => void) | undefined;
  isActive: boolean;
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) {
    return true;
  }

  return pathname.startsWith(`${prefix}/`);
}

function isItemActive(pathname: string, item: TabBarItemConfig): boolean {
  if (typeof item.isActive === "boolean") {
    return item.isActive;
  }

  const prefixes = item.matchPrefixes?.length
    ? item.matchPrefixes
    : item.href
      ? [item.href]
      : [];

  return prefixes.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

function TabBadge({
  badgeCount,
  showBadgeDot,
}: {
  badgeCount?: number | undefined;
  showBadgeDot?: boolean | undefined;
}): React.JSX.Element | null {
  if (badgeCount && badgeCount > 0) {
    return (
      <span
        className="absolute right-2 top-1 inline-flex min-w-5 items-center justify-center rounded-radius-pill bg-status-error px-1 text-[10px] font-bold text-text-inverse"
        aria-label={`${badgeCount} notification${badgeCount > 1 ? "s" : ""} non lue${badgeCount > 1 ? "s" : ""}`}
      >
        {badgeCount > 9 ? "9+" : badgeCount}
      </span>
    );
  }

  if (showBadgeDot) {
    return (
      <span
        className="absolute right-2.5 top-2 size-2 rounded-radius-pill bg-status-error"
        aria-label="Nouvelle notification"
      />
    );
  }

  return null;
}

export function TabBar({ items, className }: TabBarProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation enfant"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border-default/70 bg-gradient-to-b from-bg-surface via-bg-surface to-bg-surface-hover/70 px-2 pb-safe pt-2.5 backdrop-blur-md sm:px-2.5 md:inset-x-auto md:left-1/2 md:w-[calc(100%-3rem)] md:max-w-[912px] md:-translate-x-1/2 md:rounded-t-[26px] md:border md:px-4 md:shadow-elevated",
        className,
      )}
    >
      <ul
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const isActive = isItemActive(pathname, item);
          const itemProps = {
            ...(item.href ? { href: item.href } : {}),
            ...(item.icon ? { icon: item.icon } : {}),
            ...(item.activeIcon ? { activeIcon: item.activeIcon } : {}),
            ...(item.shortLabel ? { shortLabel: item.shortLabel } : {}),
            ...(typeof item.badgeCount === "number" ? { badgeCount: item.badgeCount } : {}),
            ...(item.showBadgeDot ? { showBadgeDot: item.showBadgeDot } : {}),
            ...(item.onClick ? { onClick: item.onClick } : {}),
          };

          return (
            <li key={item.href ?? item.label}>
              <TabBarItem label={item.label} isActive={isActive} {...itemProps} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TabBarItem({
  href,
  label,
  shortLabel,
  icon,
  activeIcon,
  badgeCount,
  showBadgeDot,
  onClick,
  isActive,
}: TabBarItemProps): React.JSX.Element {
  const classes = cn(
    "relative flex h-[68px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[14px] border px-1 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary max-[360px]:h-[66px] max-[360px]:px-0.5 sm:h-[70px]",
    isActive
      ? "border-brand-primary/25 bg-brand-primary/12 text-brand-primary shadow-card"
      : "border-transparent text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary",
  );

  const itemIcon = isActive ? activeIcon ?? icon ?? <DefaultTabIcon active /> : icon ?? <DefaultTabIcon active={false} />;

  const content = (
    <>
      <span data-slot="tab-icon" className="leading-none [&_svg]:size-6 max-[360px]:[&_svg]:size-5.5">{itemIcon}</span>
      <span
        data-slot="tab-label"
        className="w-full max-w-full px-0.5 text-center text-[0.8rem] leading-tight max-[360px]:text-[0.75rem]"
      >
        <span className="max-[360px]:hidden">{label}</span>
        <span className="hidden max-[360px]:inline">{shortLabel ?? label}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-1 h-1.5 w-6 rounded-radius-pill bg-brand-primary transition-all duration-200",
          isActive ? "opacity-100" : "opacity-0",
        )}
      />
      <TabBadge
        {...(typeof badgeCount === "number" ? { badgeCount } : {})}
        {...(typeof showBadgeDot === "boolean" ? { showBadgeDot } : {})}
      />
    </>
  );

  if (href) {
    return (
      <ScaleOnTap className="block">
        <Link
          href={href}
          className={classes}
          {...(onClick ? { onClick: () => onClick() } : {})}
          aria-current={isActive ? "page" : undefined}
        >
          {content}
        </Link>
      </ScaleOnTap>
    );
  }

  return (
    <ScaleOnTap className="block">
      <button type="button" className={classes} onClick={onClick} aria-pressed={isActive}>
        {content}
      </button>
    </ScaleOnTap>
  );
}
