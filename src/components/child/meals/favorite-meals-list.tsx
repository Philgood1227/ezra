"use client";

import * as React from "react";
import { Card } from "@/components/ds";
import type { MealWithRatingSummary } from "@/lib/day-templates/types";

interface FavoriteMealsListProps {
  meals: MealWithRatingSummary[];
}

function formatDate(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateKey));
}

export function FavoriteMealsList({ meals }: FavoriteMealsListProps): React.JSX.Element {
  if (meals.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          Pas encore de repas favoris. Note tes repas pour retrouver ceux que tu adores !
        </p>
      </Card>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {meals.map((meal) => (
        <Card key={meal.id} className="min-w-[220px] p-4">
          <p className="line-clamp-2 text-sm font-semibold text-text-primary">{meal.description}</p>
          <p className="mt-2 text-xs text-text-secondary">❤️ {formatDate(meal.date)}</p>
        </Card>
      ))}
    </div>
  );
}
