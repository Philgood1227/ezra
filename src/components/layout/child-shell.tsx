"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChecklistIcon as PremiumChecklistIcon,
  CinemaIcon as PremiumCinemaIcon,
  DayPlannerIcon as PremiumDayPlannerIcon,
  EmotionsIcon as PremiumEmotionsIcon,
  HomeIcon as PremiumHomeIcon,
  KnowledgeIcon as PremiumKnowledgeIcon,
  MealIcon as PremiumMealIcon,
  SparkIcon as PremiumSparkIcon,
  TrophyIcon as PremiumTrophyIcon,
} from "@/components/child/icons/child-premium-icons";
import { Button, Modal, TabBar, type TabBarItemConfig } from "@/components/ds";
import { ChildAlarmCenter } from "@/features/alarms/components";
import { MoreMenu, type MoreMenuItem } from "@/components/layout/more-menu";
import { FeedbackPreferencesCard } from "@/components/preferences/feedback-preferences-card";
import { ChildOnboardingOverlay } from "@/components/onboarding/child-onboarding-overlay";
import { readChildOnboardingState } from "@/lib/preferences/onboarding";

interface ChildShellProps {
  children: React.ReactNode;
  checklistBadgeCount?: number;
  childProfileId?: string | null;
  childDisplayName?: string;
}

function HomeIcon({ active }: { active: boolean }): React.JSX.Element {
  return <PremiumHomeIcon className={active ? "size-6" : "size-6"} />;
}

function DayIcon({ active }: { active: boolean }): React.JSX.Element {
  return <PremiumDayPlannerIcon className={active ? "size-6" : "size-6"} />;
}

function ChecklistIcon({ active }: { active: boolean }): React.JSX.Element {
  return <PremiumChecklistIcon className={active ? "size-6" : "size-6"} />;
}

function KnowledgeIcon({ active }: { active: boolean }): React.JSX.Element {
  return <PremiumKnowledgeIcon className={active ? "size-6" : "size-6"} />;
}

function MoreIcon({ active }: { active: boolean }): React.JSX.Element {
  return <PremiumSparkIcon className={active ? "size-6" : "size-6"} />;
}

function TrophyIcon(): React.JSX.Element {
  return <PremiumTrophyIcon className="size-5" />;
}

function CinemaIcon(): React.JSX.Element {
  return <PremiumCinemaIcon className="size-5" />;
}

function HeartIcon(): React.JSX.Element {
  return <PremiumEmotionsIcon className="size-5" />;
}

function MealsIcon(): React.JSX.Element {
  return <PremiumMealIcon className="size-5" />;
}

function isRouteActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function ChildShell({
  children,
  checklistBadgeCount = 0,
  childProfileId = null,
  childDisplayName = "Ezra",
}: ChildShellProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const isFocusRoute = pathname.startsWith("/child/focus/");
  const isMyDayRoute = pathname === "/child/my-day";
  const contentPaddingBottom =
    pathname === "/child"
      ? "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-20"
      : "pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-28";
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
  const [isFeedbackSettingsOpen, setIsFeedbackSettingsOpen] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showMiniTutorial, setShowMiniTutorial] = React.useState(false);

  React.useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);

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
    router.prefetch("/child/achievements");
    router.prefetch("/child/cinema");
    router.prefetch("/child/emotions");
    router.prefetch("/child/meals");
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

  const moreLinks: MoreMenuItem[] = React.useMemo(
    () => [
      { href: "/child/achievements", label: "Succ\u00E8s", icon: <TrophyIcon /> },
      { href: "/child/cinema", label: "Cin\u00E9ma", icon: <CinemaIcon /> },
      { href: "/child/emotions", label: "\u00C9motions", icon: <HeartIcon /> },
      { href: "/child/meals", label: "Repas", icon: <MealsIcon /> },
    ],
    [],
  );

  const isMoreSectionActive = React.useMemo(
    () => moreLinks.some((item) => isRouteActive(pathname, item.href)),
    [moreLinks, pathname],
  );

  const childTabs: TabBarItemConfig[] = React.useMemo(
    () => [
      {
        href: "/child",
        label: "Accueil",
        icon: <HomeIcon active={false} />,
        activeIcon: <HomeIcon active />,
      },
      {
        href: "/child/my-day",
        label: "Ma journ\u00E9e",
        shortLabel: "Journ\u00E9e",
        icon: <DayIcon active={false} />,
        activeIcon: <DayIcon active />,
        matchPrefixes: ["/child/my-day", "/child/focus"],
      },
      {
        href: "/child/checklists",
        label: "Checklists",
        shortLabel: "Listes",
        icon: <ChecklistIcon active={false} />,
        activeIcon: <ChecklistIcon active />,
        badgeCount: checklistBadgeCount,
      },
      {
        href: "/child/knowledge",
        label: "Fiches",
        icon: <KnowledgeIcon active={false} />,
        activeIcon: <KnowledgeIcon active />,
      },
      {
        label: "Plus",
        icon: <MoreIcon active={false} />,
        activeIcon: <MoreIcon active />,
        isActive: isMoreSectionActive || isMoreMenuOpen,
        onClick: () => setIsMoreMenuOpen((current) => !current),
      },
    ],
    [checklistBadgeCount, isMoreSectionActive, isMoreMenuOpen],
  );

  return (
    <div
      className={
        isFocusRoute
          ? "mx-auto flex min-h-screen w-full flex-col overflow-x-clip"
          : `mx-auto flex min-h-screen w-full max-w-[960px] flex-col overflow-x-clip px-4 ${contentPaddingBottom} pt-3 pt-safe md:px-6 md:pt-4`
      }
    >
      <main className="flex-1">{children}</main>
      <ChildAlarmCenter />
      {!isFocusRoute ? (
        <>
          {!isMyDayRoute ? (
            <Button
              size="sm"
              variant="secondary"
              className="fixed right-4 top-4 z-30 pt-safe md:right-6"
              onClick={() => setIsFeedbackSettingsOpen(true)}
              aria-label={"Ouvrir les r\u00E9glages enfant"}
            >
              {"R\u00E9glages"}
            </Button>
          ) : null}

          <MoreMenu
            open={isMoreMenuOpen}
            onClose={() => setIsMoreMenuOpen(false)}
            items={moreLinks.map((item) => ({
              ...item,
              isActive: isRouteActive(pathname, item.href),
            }))}
          />
          <TabBar items={childTabs} />
          <Modal
            open={isFeedbackSettingsOpen}
            onClose={() => setIsFeedbackSettingsOpen(false)}
            title={"R\u00E9glages enfant"}
            description="Vibrations et sons pour cet appareil."
          >
            <FeedbackPreferencesCard scope="global" />
          </Modal>
        </>
      ) : null}

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
