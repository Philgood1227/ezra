"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import { ParentHeader } from "@/components/layout/parent-header";
import { ParentModuleSubnav } from "@/components/layout/parent-module-subnav";
import { ParentQuickActionsDrawer } from "@/components/layout/parent-quick-actions-drawer";
import { ParentSidebar } from "@/components/layout/parent-sidebar";
import { PageTransition } from "@/components/motion";
import { ParentOnboardingModal } from "@/components/onboarding/parent-onboarding-modal";
import { useParentNavBadges } from "@/lib/hooks/useParentNavBadges";
import {
  EMPTY_PARENT_NAV_BADGES,
  type ParentNavBadges,
} from "@/lib/navigation/parent-nav-badges";
import { getParentBreadcrumb, getParentPageTitle } from "@/lib/navigation/parent-breadcrumb";
import { readParentOnboardingState } from "@/lib/preferences/onboarding";

interface ParentShellProps {
  children: React.ReactNode;
  initialBadges?: ParentNavBadges;
  parentProfileId?: string | null;
  parentDisplayName?: string;
  disableBadgeRefresh?: boolean;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "ezra-parent-sidebar-collapsed";

function LightningIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M13.4 2 6.6 12.2h4.8L10.6 22l6.8-10.2h-4.8L13.4 2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ParentShell({
  children,
  initialBadges = EMPTY_PARENT_NAV_BADGES,
  parentProfileId = null,
  parentDisplayName = "Parent",
  disableBadgeRefresh = false,
}: ParentShellProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const badges = useParentNavBadges({
    initialBadges,
    enabled: !disableBadgeRefresh,
  });

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = React.useState(false);

  React.useEffect(() => {
    const persisted = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (persisted === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  React.useEffect(() => {
    if (parentProfileId?.startsWith("dev-")) {
      setShowOnboarding(false);
      return;
    }

    const onboardingState = readParentOnboardingState(parentProfileId);
    setShowOnboarding(!onboardingState.completed && !onboardingState.skipped);
  }, [parentProfileId]);

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    setQuickActionsOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const routesToPrefetch = [
      "/parent/dashboard",
      "/parent/revisions",
      "/parent/revisions/generate",
      "/parent/resources/books",
      "/parent/checklists",
      "/parent/day-templates",
      "/parent/weekly-tasks",
      "/parent/fiches",
    ];

    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  const toggleSidebarCollapsed = React.useCallback(() => {
    setSidebarCollapsed((current) => {
      const nextValue = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, nextValue ? "1" : "0");
      return nextValue;
    });
  }, []);

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

  const breadcrumb = React.useMemo(() => getParentBreadcrumb(pathname), [pathname]);
  const title = React.useMemo(() => getParentPageTitle(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <a
        href="#parent-main-content"
        className="sr-only rounded-radius-button bg-bg-surface px-3 py-2 text-sm font-semibold text-text-primary focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:ring-2 focus:ring-brand-primary"
      >
        Aller au contenu principal
      </a>
      <div className="flex min-h-screen">
        <ParentSidebar
          currentPath={pathname}
          badges={badges}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          parentDisplayName={parentDisplayName}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onToggleCollapsed={toggleSidebarCollapsed}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <ParentHeader
            title={title}
            breadcrumb={breadcrumb}
            parentDisplayName={parentDisplayName}
            actions={
              <Button
                size="sm"
                variant="secondary"
                className="hidden md:inline-flex"
                onClick={() => setQuickActionsOpen(true)}
              >
                <LightningIcon />
                Actions rapides
              </Button>
            }
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            onToggleSidebarCollapse={toggleSidebarCollapsed}
            sidebarCollapsed={sidebarCollapsed}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
          <ParentModuleSubnav pathname={pathname} />
          <main id="parent-main-content" className="min-w-0 flex-1 overflow-y-auto">
            <PageTransition>
              <div className="min-h-full bg-bg-base">{children}</div>
            </PageTransition>
          </main>
        </div>
      </div>
      <ParentQuickActionsDrawer
        open={quickActionsOpen}
        pathname={pathname}
        onClose={() => setQuickActionsOpen(false)}
      />
      <ParentOnboardingModal
        open={showOnboarding}
        profileId={parentProfileId}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
