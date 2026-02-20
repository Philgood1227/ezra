import type { RewardTierSummary, TaskInstanceStatus } from "@/lib/day-templates/types";

export interface AwardPointsInput {
  currentStatus: TaskInstanceStatus;
  nextStatus: TaskInstanceStatus;
  pointsBase: number;
}

export function computePointsForTransition({
  currentStatus,
  nextStatus,
  pointsBase,
}: AwardPointsInput): number {
  if (currentStatus === "termine") {
    return 0;
  }

  if (nextStatus !== "termine") {
    return 0;
  }

  return Math.max(0, pointsBase);
}

export interface NextRewardProgress {
  nextTier: RewardTierSummary | null;
  remainingPoints: number;
  progressPercent: number;
  targetPoints: number;
}

export function computeNextRewardProgress(
  pointsTotal: number,
  tiers: RewardTierSummary[],
): NextRewardProgress {
  const sorted = [...tiers].sort((left, right) => {
    if (left.pointsRequired !== right.pointsRequired) {
      return left.pointsRequired - right.pointsRequired;
    }

    return left.sortOrder - right.sortOrder;
  });

  const nextTier = sorted.find((tier) => tier.pointsRequired > pointsTotal) ?? null;
  if (!nextTier) {
    return {
      nextTier: null,
      remainingPoints: 0,
      progressPercent: 100,
      targetPoints: Math.max(1, pointsTotal),
    };
  }

  const targetPoints = Math.max(1, nextTier.pointsRequired);
  const progressPercent = Math.max(0, Math.min(100, (pointsTotal / targetPoints) * 100));

  return {
    nextTier,
    remainingPoints: Math.max(0, nextTier.pointsRequired - pointsTotal),
    progressPercent,
    targetPoints,
  };
}

