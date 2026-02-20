"use client";

import * as React from "react";
import { TrophyIcon } from "@/components/child/icons/child-premium-icons";
import { AchievementBadge } from "@/components/child/achievements/achievement-badge";
import { AchievementUnlockCelebration } from "@/components/child/achievements/achievement-unlock-celebration";
import { EmptyState, ProgressBar, Skeleton } from "@/components/ds";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { extractAchievementConditionHint } from "@/lib/domain/achievements";
import type { AchievementCategoryWithItems } from "@/lib/day-templates/types";
import { haptic } from "@/lib/utils/haptic";
import { playSound } from "@/lib/utils/sounds";

interface ChildAchievementsViewProps {
  categories: AchievementCategoryWithItems[];
  unlockedCount: number;
  totalCount: number;
  isLoading?: boolean;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AchievementLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-radius-card" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-3 shadow-card backdrop-blur-sm">
            <div className="space-y-2">
              <Skeleton className="mx-auto size-16" circle />
              <Skeleton className="mx-auto h-3 w-2/3" />
              <Skeleton className="mx-auto h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChildAchievementsView({
  categories,
  unlockedCount,
  totalCount,
  isLoading = false,
}: ChildAchievementsViewProps): React.JSX.Element {
  const [showCelebration, setShowCelebration] = React.useState(false);
  const todayKey = formatDateKey(new Date());

  const freshlyUnlocked = React.useMemo(() => {
    for (const category of categories) {
      for (const achievement of category.achievements) {
        if (!achievement.unlockedAt) {
          continue;
        }

        if (achievement.unlockedAt.startsWith(todayKey)) {
          return {
            id: achievement.id,
            icon: achievement.icon,
            label: achievement.label,
          };
        }
      }
    }
    return null;
  }, [categories, todayKey]);

  React.useEffect(() => {
    if (!freshlyUnlocked) {
      return;
    }

    setShowCelebration(true);
    haptic("success");
    playSound("badgeUnlock");
  }, [freshlyUnlocked]);

  const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <>
      <section className="mx-auto w-full max-w-[920px] space-y-4">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Mes succes</h1>
          <p className="text-sm text-text-secondary">{unlockedCount} debloques</p>
        </header>

        {isLoading ? <AchievementLoadingSkeleton /> : null}

        {!isLoading ? (
          <>
            <div className="rounded-radius-card border border-border-subtle bg-bg-surface/80 p-4 shadow-card backdrop-blur-sm">
              <p className="mb-2 text-sm font-semibold text-text-primary">
                Progression: {unlockedCount}/{totalCount}
              </p>
              <ProgressBar value={progress} variant={progress === 100 ? "success" : "primary"} />
            </div>

            {categories.length === 0 ? (
              <EmptyState icon={<TrophyIcon className="size-8" />} title="Aucun badge" />
            ) : (
              <StaggerContainer className="space-y-4">
                {categories.map((category) => {
                  const unlockedInCategory = category.achievements.filter((achievement) => achievement.isUnlocked).length;
                  return (
                    <StaggerItem key={category.id} className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-black text-text-primary">{category.label}</h2>
                        <p className="text-xs font-semibold text-text-secondary">
                          {unlockedInCategory}/{category.achievements.length}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {category.achievements.map((achievement) => (
                          <div key={achievement.id} className="relative">
                            <AchievementBadge
                              icon={achievement.icon}
                              label={achievement.label}
                              description={achievement.description ?? "Succes debloque."}
                              isUnlocked={achievement.isUnlocked}
                              unlockedAt={achievement.unlockedAt}
                              {...(!achievement.isUnlocked
                                ? { hint: extractAchievementConditionHint(achievement.condition) }
                                : {})}
                              colorKey={category.colorKey}
                              freshUnlocked={freshlyUnlocked?.id === achievement.id}
                            />
                          </div>
                        ))}
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </>
        ) : null}
      </section>

      <AchievementUnlockCelebration
        open={showCelebration && Boolean(freshlyUnlocked)}
        icon={freshlyUnlocked?.icon ?? "*"}
        label={freshlyUnlocked?.label ?? "Nouveau succes"}
        onClose={() => setShowCelebration(false)}
      />
    </>
  );
}
