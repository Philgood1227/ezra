import { parseCategoryColorKey } from "@/lib/day-templates/constants";
import type { CategoryColorKey } from "@/lib/day-templates/types";

export interface CategoryVisual {
  border: string;
  softBackground: string;
  ring: string;
}

const CATEGORY_VISUALS: Record<CategoryColorKey, CategoryVisual> = {
  "category-routine": {
    border: "border-category-routine",
    softBackground: "bg-category-routine/18",
    ring: "ring-category-routine/35",
  },
  "category-ecole": {
    border: "border-category-ecole",
    softBackground: "bg-category-ecole/18",
    ring: "ring-category-ecole/35",
  },
  "category-repas": {
    border: "border-category-repas",
    softBackground: "bg-category-repas/18",
    ring: "ring-category-repas/35",
  },
  "category-sport": {
    border: "border-category-sport",
    softBackground: "bg-category-sport/18",
    ring: "ring-category-sport/35",
  },
  "category-loisir": {
    border: "border-category-loisir",
    softBackground: "bg-category-loisir/18",
    ring: "ring-category-loisir/35",
  },
  "category-calme": {
    border: "border-category-calme",
    softBackground: "bg-category-calme/18",
    ring: "ring-category-calme/35",
  },
  "category-sommeil": {
    border: "border-category-sommeil",
    softBackground: "bg-category-sommeil/18",
    ring: "ring-category-sommeil/35",
  },
};

const DEFAULT_VISUAL: CategoryVisual = {
  border: "border-brand-primary",
  softBackground: "bg-brand-primary/14",
  ring: "ring-brand-primary/35",
};

export function getCategoryVisual(colorKey: string | null | undefined): CategoryVisual {
  return CATEGORY_VISUALS[parseCategoryColorKey(colorKey)] ?? DEFAULT_VISUAL;
}
