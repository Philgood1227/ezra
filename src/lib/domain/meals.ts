import type { MealType, WeeklyIngredientNeedSummary } from "@/lib/day-templates/types";

export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  petit_dejeuner: "Petit-dejeuner",
  dejeuner: "Dejeuner",
  diner: "Diner",
  collation: "Collation",
};

export interface IngredientAggregateInput {
  ingredientLabel: string;
  ingredientEmoji: string;
  unit: string | null;
  quantity: number | null;
}

export interface DefaultIngredientLibraryItem {
  label: string;
  emoji: string;
  defaultUnit: string | null;
}

export const DEFAULT_INGREDIENT_LIBRARY: DefaultIngredientLibraryItem[] = [
  { label: "Oeufs", emoji: "\u{1F95A}", defaultUnit: "piece" },
  { label: "Farine", emoji: "\u{1F33E}", defaultUnit: "g" },
  { label: "Lait", emoji: "\u{1F95B}", defaultUnit: "ml" },
  { label: "Beurre", emoji: "\u{1F9C8}", defaultUnit: "g" },
  { label: "Tomates", emoji: "\u{1F345}", defaultUnit: "piece" },
  { label: "Pates", emoji: "\u{1F35D}", defaultUnit: "g" },
  { label: "Riz", emoji: "\u{1F35A}", defaultUnit: "g" },
  { label: "Poulet", emoji: "\u{1F357}", defaultUnit: "g" },
  { label: "Poisson", emoji: "\u{1F41F}", defaultUnit: "g" },
  { label: "Fromage", emoji: "\u{1F9C0}", defaultUnit: "g" },
  { label: "Pommes de terre", emoji: "\u{1F954}", defaultUnit: "piece" },
  { label: "Huile d'olive", emoji: "\u{1FAD2}", defaultUnit: "ml" },
  { label: "Sel", emoji: "\u{1F9C2}", defaultUnit: null },
  { label: "Poivre", emoji: "\u{1F336}\u{FE0F}", defaultUnit: null },
];

export function getMealTypeLabel(type: MealType): string {
  return MEAL_TYPE_LABEL[type];
}

export function getMealRatingEmoji(rating: 1 | 2 | 3): string {
  if (rating === 1) {
    return "\u{1F610}";
  }

  if (rating === 2) {
    return "\u{1F642}";
  }

  return "\u{1F60D}";
}

export function isFavoriteMealRating(rating: number | null | undefined): boolean {
  return rating === 3;
}

export function computeTrailingBofStreak(ratings: number[]): number {
  let streak = 0;

  for (let index = ratings.length - 1; index >= 0; index -= 1) {
    if (ratings[index] !== 1) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export function computeWeeklyIngredientNeeds(
  lines: IngredientAggregateInput[],
): WeeklyIngredientNeedSummary[] {
  const byKey = new Map<string, WeeklyIngredientNeedSummary>();

  for (const line of lines) {
    const label = line.ingredientLabel.trim();
    if (!label) {
      continue;
    }

    const unit = line.unit?.trim() ? line.unit.trim() : null;
    const key = `${label.toLocaleLowerCase("fr")}::${(unit ?? "").toLocaleLowerCase("fr")}`;
    const current = byKey.get(key) ?? {
      key,
      ingredientLabel: label,
      ingredientEmoji: line.ingredientEmoji.trim() || "ingredient",
      unit,
      totalQuantity: null,
      mealsCount: 0,
    };

    current.mealsCount += 1;

    const hasQuantity = typeof line.quantity === "number" && Number.isFinite(line.quantity);
    if (hasQuantity) {
      const quantity = line.quantity ?? 0;
      current.totalQuantity = (current.totalQuantity ?? 0) + quantity;
    }

    byKey.set(key, current);
  }

  return [...byKey.values()].sort((left, right) => {
    const labelOrder = left.ingredientLabel.localeCompare(right.ingredientLabel, "fr");
    if (labelOrder !== 0) {
      return labelOrder;
    }

    return (left.unit ?? "").localeCompare(right.unit ?? "", "fr");
  });
}
