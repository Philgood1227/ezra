import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ds";

interface MealsWidgetProps {
  mealsCount: number;
  ratedMealsCount: number;
  favoriteMealsCount: number;
  bofStreak: number;
}

export function MealsWidget({
  mealsCount,
  ratedMealsCount,
  favoriteMealsCount,
  bofStreak,
}: MealsWidgetProps): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Repas de la semaine</CardTitle>
        <CardDescription>Planification et preferences enfant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-radius-button bg-bg-surface-hover/70 p-2">
            <p className="text-[11px] text-text-secondary">Planifies</p>
            <p className="text-lg font-bold text-text-primary">{mealsCount}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 p-2">
            <p className="text-[11px] text-text-secondary">Avis recus</p>
            <p className="text-lg font-bold text-text-primary">{ratedMealsCount}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 p-2">
            <p className="text-[11px] text-text-secondary">Favoris</p>
            <p className="text-lg font-bold text-text-primary">{favoriteMealsCount}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 p-2">
            <p className="text-[11px] text-text-secondary">Serie bof</p>
            <p className="text-lg font-bold text-text-primary">{bofStreak}</p>
          </div>
        </div>
        {bofStreak >= 2 ? (
          <p className="rounded-radius-button border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs font-semibold text-text-primary">
            {bofStreak} repas bof consecutifs : ajuster les menus.
          </p>
        ) : (
          <p className="text-xs text-text-secondary">Pas de signal d&apos;alerte sur les repas.</p>
        )}
      </CardContent>
    </Card>
  );
}
