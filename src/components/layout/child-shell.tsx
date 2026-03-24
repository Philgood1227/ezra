"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ds";
import { ChildAlarmCenter } from "@/features/alarms/components";
import { FeedbackPreferencesCard } from "@/components/preferences/feedback-preferences-card";
import { ChildOnboardingOverlay } from "@/components/onboarding/child-onboarding-overlay";
import { ChildFloatingTools } from "@/components/layout/child-floating-tools";
import { ChildFloatingToolsVisibilityProvider } from "@/components/layout/child-floating-tools-visibility";
import { readChildOnboardingState } from "@/lib/preferences/onboarding";

interface ChildShellProps {
  children: React.ReactNode;
  checklistBadgeCount?: number;
  childProfileId?: string | null;
  childDisplayName?: string;
  hideFloatingTools?: boolean;
}

export function ChildShell({
  children,
  checklistBadgeCount = 0,
  childProfileId = null,
  childDisplayName = "Ezra",
  hideFloatingTools = false,
}: ChildShellProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const isFocusRoute = pathname.startsWith("/child/focus/");
  const isMyDayRoute = pathname.startsWith("/child/my-day");
  const isTodayRoute = pathname === "/child";
  const isRevisionRoute = pathname.startsWith("/child/revisions/");
  const isRewardsRoute = pathname.startsWith("/child/missions");
  const usesHomeWidthLayout = isTodayRoute || isRevisionRoute;
  const contentPaddingBottom =
    pathname === "/child"
      ? "pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
      : "pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-10";
  const [isFeedbackSettingsOpen, setIsFeedbackSettingsOpen] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showMiniTutorial, setShowMiniTutorial] = React.useState(false);
  const [floatingToolsHiddenRequestCount, setFloatingToolsHiddenRequestCount] = React.useState(0);
  const [hasBlockingOverlay, setHasBlockingOverlay] = React.useState(false);
  void checklistBadgeCount;

  const shouldHideFloatingTools =
    hideFloatingTools || isFocusRoute || floatingToolsHiddenRequestCount > 0 || hasBlockingOverlay;

  React.useEffect(() => {
    if (process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.VITEST === "1") {
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Shared rule: when another full-screen dialog is active, floating tools are hidden.
    const updateBlockingOverlayState = (): void => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
      const hasBlockingDialog = dialogs.some((dialog) => {
        return !(dialog instanceof HTMLElement && dialog.classList.contains("child-tools-dialog"));
      });
      setHasBlockingOverlay(hasBlockingDialog);
    };

    updateBlockingOverlayState();

    const observer = new MutationObserver(() => {
      updateBlockingOverlayState();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-modal", "role"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    const handleOpenSettings = () => {
      setIsFeedbackSettingsOpen(true);
    };

    window.addEventListener("ezra:open-child-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("ezra:open-child-settings", handleOpenSettings);
    };
  }, []);

  React.useEffect(() => {
    const routesToPrefetch = [
      "/child/checklists",
      "/child/achievements",
      "/child/tools",
      "/child/my-day",
      "/child/missions",
      "/child/knowledge",
    ];

    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  React.useEffect(() => {
    if (childProfileId?.startsWith("dev-")) {
      setShowOnboarding(false);
      setShowMiniTutorial(false);
      return;
    }

    const onboardingState = readChildOnboardingState(childProfileId);
    if (!onboardingState.completed) {
      setShowOnboarding(true);
      setShowMiniTutorial(false);
      return;
    }

    setShowOnboarding(false);
    if (onboardingState.remindLater && pathname === "/child") {
      setShowMiniTutorial(true);
    }
  }, [childProfileId, pathname]);

  return (
    <div
      className={
        isFocusRoute
          ? "mx-auto flex min-h-dvh w-full flex-col overflow-x-clip"
          : usesHomeWidthLayout
            ? `child-shell-compact-landscape flex min-h-dvh w-full flex-col overflow-x-clip px-[var(--page-x)] ${contentPaddingBottom} pt-safe pt-3 md:pt-4`
            : `child-shell-compact-landscape mx-auto flex min-h-dvh w-full max-w-[1080px] flex-col overflow-x-clip px-[var(--page-x)] ${contentPaddingBottom} pt-safe pt-3 md:pt-4`
      }
    >
      <ChildFloatingToolsVisibilityProvider onHiddenCountChange={setFloatingToolsHiddenRequestCount}>
        <main className="flex-1">{children}</main>
        <ChildAlarmCenter />

        <ChildFloatingTools hidden={shouldHideFloatingTools} />

        {!isFocusRoute ? (
          <>
            {!isMyDayRoute && !isTodayRoute && !isRevisionRoute && !isRewardsRoute ? (
              <Button
                size="sm"
                variant="secondary"
                className="pt-safe fixed right-4 top-4 z-30 md:right-6"
                onClick={() => setIsFeedbackSettingsOpen(true)}
                aria-label={"Ouvrir les reglages enfant"}
              >
                {"Reglages"}
              </Button>
            ) : null}

            <Modal
              open={isFeedbackSettingsOpen}
              onClose={() => setIsFeedbackSettingsOpen(false)}
              title={"Reglages enfant"}
              description="Vibrations et sons pour cet appareil."
            >
              <FeedbackPreferencesCard scope="global" />
            </Modal>
          </>
        ) : null}
      </ChildFloatingToolsVisibilityProvider>

      <ChildOnboardingOverlay
        open={showOnboarding}
        profileId={childProfileId}
        childName={childDisplayName}
        onClose={() => setShowOnboarding(false)}
      />
      <ChildOnboardingOverlay
        open={showMiniTutorial}
        profileId={childProfileId}
        childName={childDisplayName}
        mode="mini"
        onClose={() => setShowMiniTutorial(false)}
      />
    </div>
  );
}
