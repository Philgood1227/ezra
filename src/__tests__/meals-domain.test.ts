import { describe, expect, it } from "vitest";
import {
  computeTrailingBofStreak,
  computeWeeklyIngredientNeeds,
  getMealRatingEmoji,
  getMealTypeLabel,
  isFavoriteMealRating,
} from "@/lib/domain/meals";

describe("meals domain", () => {
  it("mappe les labels utiles", () => {
    expect(getMealTypeLabel("petit_dejeuner")).toBe("Petit-dejeuner");
    expect(getMealRatingEmoji(3)).toBe("\u{1F60D}");
    expect(isFavoriteMealRating(3)).toBe(true);
  });

  it("calcule la serie bof en fin de sequence", () => {
    expect(computeTrailingBofStreak([3, 2, 1, 1])).toBe(2);
    expect(computeTrailingBofStreak([1, 2, 3])).toBe(0);
    expect(computeTrailingBofStreak([])).toBe(0);
  });

  it("aggrege les ingredients de la semaine", () => {
    const summary = computeWeeklyIngredientNeeds([
      { ingredientLabel: "Tomate", ingredientEmoji: "ingredient", quantity: 2, unit: "piece" },
      { ingredientLabel: "Tomate", ingredientEmoji: "ingredient", quantity: 3, unit: "piece" },
      { ingredientLabel: "Sel", ingredientEmoji: "ingredient", quantity: null, unit: null },
    ]);

    expect(summary).toHaveLength(2);
    expect(summary[0]).toMatchObject({
      ingredientLabel: "Sel",
      totalQuantity: null,
      mealsCount: 1,
    });
    expect(summary[1]).toMatchObject({
      ingredientLabel: "Tomate",
      totalQuantity: 5,
      unit: "piece",
      mealsCount: 2,
    });
  });
});
