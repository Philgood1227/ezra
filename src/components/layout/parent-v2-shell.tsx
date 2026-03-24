"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ds";
import { cn } from "@/lib/utils";

interface ParentV2ShellProps {
  children: React.ReactNode;
  parentDisplayName?: string;
}

interface ParentV2NavItem {
  id: string;
  href: string;
  label: string;
  matchPrefixes?: string[];
}

const NAV_ITEMS: ParentV2NavItem[] = [
  { id: "dashboard", href: "/parent-v2/dashboard", label: "Tableau de bord" },
  { id: "school-missions", href: "/parent-v2/school-missions", label: "Missions d'ecole" },
  { id: "checklists", href: "/parent-v2/checklists", label: "Checklists" },
  { id: "pleasure-activities", href: "/parent-v2/pleasure-activities", label: "Activites plaisir" },
  { id: "conjugaison", href: "/parent-v2/conjugaison", label: "Conjugaison" },
  { id: "fiches", href: "/parent-v2/fiches", label: "Fiches" },
  { id: "calendar", href: "/parent-v2/calendar", label: "Calendrier" },
  { id: "rewards", href: "/parent-v2/rewards", label: "Recompenses" },
  { id: "settings", href: "/parent-v2/settings", label: "Parametres" },
];

function isItemActive(pathname: string, item: ParentV2NavItem): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  return (
    item.matchPrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ?? false
  );
}

function getCurrentPageLabel(pathname: string): string {
  const activeItem = NAV_ITEMS.find((item) => isItemActive(pathname, item));
  return activeItem?.label ?? "Dashboard";
}

function TrophyIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M8.5 4.5h7v3.3c0 2.1-1.5 3.8-3.5 4.1v2.6h2.6v2H9.4v-2H12v-2.6c-2-.3-3.5-2-3.5-4.1V4.5Z"
        fill="currentColor"
      />
      <path
        d="M6.2 6.2H4.6a.6.6 0 0 0-.6.6v1.1c0 1.6 1.3 2.9 2.9 2.9M17.8 6.2h1.6c.3 0 .6.3.6.6v1.1c0 1.6-1.3 2.9-2.9 2.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M14.5 6.5 9 12l5.5 5.5M9.5 12h9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function NavIcon({
  itemId,
  className,
}: {
  itemId: ParentV2NavItem["id"];
  className?: string;
}): React.JSX.Element {
  if (itemId === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="3.5"
          y="3.5"
          width="7.5"
          height="7.5"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="13"
          y="3.5"
          width="7.5"
          height="5.5"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="13"
          y="11"
          width="7.5"
          height="9.5"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="3.5"
          y="13"
          width="7.5"
          height="7.5"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (itemId === "school-missions") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M4.5 8.2 12 4l7.5 4.2L12 12.5 4.5 8.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 10.3v4.5c0 1.6 2 2.7 4.5 2.7s4.5-1.1 4.5-2.7v-4.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (itemId === "checklists") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m8 9 1.4 1.4L11.5 8.3M8 12h8M8 15h8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (itemId === "pleasure-activities") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="9.2" cy="10.2" r="1" fill="currentColor" />
        <circle cx="14.8" cy="10.2" r="1" fill="currentColor" />
        <path
          d="M8.7 14.3c.9 1 2 1.5 3.3 1.5 1.3 0 2.4-.5 3.3-1.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (itemId === "fiches") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 9h8M8 12h8M8 15h5.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (itemId === "conjugaison") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="4"
          y="3.5"
          width="16"
          height="17"
          rx="2.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 8.2h8M8 12h8M8 15.8h5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (itemId === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="4.5"
          y="5.5"
          width="15"
          height="14"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M4.5 9.2h15M8 3.8v3M16 3.8v3M8.5 12h2M12.5 12h2M8.5 15h2M12.5 15h2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (itemId === "settings") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 15.5 7 20l5-2.7L17 20l-1.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ParentV2Shell({
  children,
  parentDisplayName = "Parent",
}: ParentV2ShellProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const pageLabel = React.useMemo(() => getCurrentPageLabel(pathname), [pathname]);

  const handleLogout = React.useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/parent/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
    } finally {
      router.push("/auth/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-gray-200 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                <TrophyIcon className="size-6 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-gray-900">Ezra</h1>
                <p className="text-xs text-gray-500">Dashboard Parent V2</p>
              </div>
            </div>
            <p className="mb-3 text-sm font-medium text-gray-700">{parentDisplayName}</p>
            <Link
              href="/child"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              <ArrowLeftIcon className="size-4" />
              Retour a l&apos;app enfant
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all",
                    active
                      ? item.id === "school-missions"
                        ? "bg-brand-100/70 text-brand-600 shadow-sm"
                        : "bg-indigo-50 text-indigo-700 shadow-sm"
                      : item.id === "school-missions"
                        ? "text-gray-600 hover:bg-brand-50/70 hover:text-brand-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <NavIcon itemId={item.id} className="size-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-gray-200 p-4">
            <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                Parent connecte
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{parentDisplayName}</p>
            </div>
            <Button
              variant="tertiary"
              fullWidth
              onClick={() => void handleLogout()}
              loading={isLoggingOut}
            >
              Deconnexion
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Dashboard Parent
                </p>
                <h2 className="truncate text-lg font-extrabold text-gray-900">{pageLabel}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/child" className="hidden sm:block">
                  <Button size="sm" variant="secondary">
                    Voir comme l&apos;enfant
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="tertiary"
                  onClick={() => void handleLogout()}
                  loading={isLoggingOut}
                >
                  Deconnexion
                </Button>
              </div>
            </div>
            <div className="border-t border-gray-200 bg-white px-2 py-2 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {NAV_ITEMS.map((item) => {
                  const active = isItemActive(pathname, item);
                  return (
                    <Link key={item.href} href={item.href} className="shrink-0">
                      <Button
                        size="sm"
                        variant={active ? "premium" : "glass"}
                        className={
                          item.id === "school-missions"
                            ? active
                              ? "from-brand-500 via-brand-500 to-brand-600 ring-brand-300/70"
                              : "border-brand-200/70 bg-brand-50/70 text-brand-700 hover:bg-brand-100/70"
                            : undefined
                        }
                      >
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
