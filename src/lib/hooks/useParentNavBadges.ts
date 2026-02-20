"use client";

import * as React from "react";
import {
  EMPTY_PARENT_NAV_BADGES,
  type ParentNavBadges,
} from "@/lib/navigation/parent-nav-badges";

interface UseParentNavBadgesOptions {
  initialBadges?: ParentNavBadges;
  enabled?: boolean;
  intervalMs?: number;
}

export function useParentNavBadges(options?: UseParentNavBadgesOptions): ParentNavBadges {
  const {
    initialBadges = EMPTY_PARENT_NAV_BADGES,
    enabled = true,
    intervalMs = 60_000,
  } = options ?? {};

  const [badges, setBadges] = React.useState<ParentNavBadges>(initialBadges);

  React.useEffect(() => {
    setBadges(initialBadges);
  }, [initialBadges]);

  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let isDisposed = false;

    const loadBadges = async (): Promise<void> => {
      try {
        const response = await fetch("/api/parent/nav-badges", {
          method: "GET",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ParentNavBadges;
        if (!isDisposed) {
          setBadges({
            notifications: payload.notifications ?? 0,
            schoolDiary: payload.schoolDiary ?? 0,
            checklists: payload.checklists ?? 0,
            alarms: payload.alarms ?? 0,
          });
        }
      } catch {
        // keep latest known counts when refresh fails
      }
    };

    void loadBadges();
    const timerId = window.setInterval(() => {
      void loadBadges();
    }, intervalMs);

    return () => {
      isDisposed = true;
      window.clearInterval(timerId);
    };
  }, [enabled, intervalMs]);

  return badges;
}
