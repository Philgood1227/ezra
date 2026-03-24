import { describe, expect, it } from "vitest";
import { computeNextRewardProgress, computePointsForTransition } from "@/lib/domain/points";
import { canTransitionTaskStatus } from "@/lib/domain/task-status";
import type { RewardTierSummary } from "@/lib/day-templates/types";

describe("points domain", () => {
  it("accorde des points seulement au premier passage vers termine", () => {
    expect(
      computePointsForTransition({
        currentStatus: "a_faire",
        nextStatus: "termine",
        pointsBase: 3,
      }),
    ).toBe(3);

    expect(
      computePointsForTransition({
        currentStatus: "termine",
        nextStatus: "termine",
        pointsBase: 3,
      }),
    ).toBe(0);
  });

  it("calcule le prochain palier et la progression", () => {
    const tiers: RewardTierSummary[] = [
      {
        id: "r1",
        familyId: "f1",
        label: "30 min d'écran",
        description: null,
        pointsRequired: 30,
        sortOrder: 0,
      },
      {
        id: "r2",
        familyId: "f1",
        label: "Dessert",
        description: null,
        pointsRequired: 50,
        sortOrder: 1,
      },
    ];

    const progress = computeNextRewardProgress(18, tiers);
    expect(progress.nextTier?.label).toBe("30 min d'écran");
    expect(progress.remainingPoints).toBe(12);
    expect(progress.progressPercent).toBeCloseTo(60);
  });

  it("controle les transitions de statut autorisees", () => {
    expect(canTransitionTaskStatus("a_faire", "en_cours")).toBe(true);
    expect(canTransitionTaskStatus("a_faire", "termine")).toBe(true);
    expect(canTransitionTaskStatus("en_cours", "a_faire")).toBe(true);
    expect(canTransitionTaskStatus("en_cours", "termine")).toBe(true);
    expect(canTransitionTaskStatus("termine", "en_cours")).toBe(false);
  });
});
