"use client";

import * as React from "react";
import { EmptyState, Skeleton } from "@/components/ds";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { FavoriteMealsList } from "@/components/child/meals/favorite-meals-list";
import { MealCard } from "@/components/child/meals/meal-card";
import { rateMealAction } from "@/lib/actions/meals";
import type { MealWithRatingSummary } from "@/lib/day-templates/types";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";
import { useToast } from "@/components/ds/toast";

interface ChildMealsViewProps {
  todayDate: string;
  todayMeals: MealWithRatingSummary[];
  favoriteMeals: MealWithRatingSummary[];
  isLoading?: boolean;
}

function formatLongDate(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(dateKey));
}

function updateMealRating(
  meals: MealWithRatingSummary[],
  mealId: string,
  rating: 1 | 2 | 3,
): MealWithRatingSummary[] {
  return meals.map((meal) => {
    if (meal.id !== mealId) {
      return meal;
    }

    const nextRating = meal.rating
      ? { ...meal.rating, rating, updatedAt: new Date().toISOString() }
      : {
          id: `${mealId}-local-rating`,
          mealId,
          rating,
          comment: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    return {
      ...meal,
      rating: nextRating,
      isFavorite: rating === 3,
    };
  });
}

function MealsLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-radius-card" />
      <Skeleton className="h-36 w-full rounded-radius-card" count={3} />
      <Skeleton className="h-24 w-full rounded-radius-card" />
    </div>
  );
}

export function ChildMealsView({
  todayDate,
  todayMeals,
  favoriteMeals,
  isLoading = false,
}: ChildMealsViewProps): React.JSX.Element {
  const toast = useToast();
  const [localTodayMeals, setLocalTodayMeals] = React.useState(todayMeals);
  const [localFavorites, setLocalFavorites] = React.useState(favoriteMeals);
  const [pendingMealId, setPendingMealId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalTodayMeals(todayMeals);
  }, [todayMeals]);

  React.useEffect(() => {
    setLocalFavorites(favoriteMeals);
  }, [favoriteMeals]);

  const handleRate = React.useCallback(
    (mealId: string, rating: 1 | 2 | 3) => {
      if (pendingMealId) {
        return;
      }

      if (!isOnline()) {
        toast.error("Mode hors-ligne active, avis indisponible.");
        return;
      }

      const previousToday = localTodayMeals;
      const previousFavorites = localFavorites;
      setPendingMealId(mealId);
      setLocalTodayMeals((current) => updateMealRating(current, mealId, rating));
      setLocalFavorites((current) => {
        const ratedCurrent = updateMealRating(current, mealId, rating);
        const mealFromToday = previousToday.find((meal) => meal.id === mealId);

        if (rating === 3 && mealFromToday && !ratedCurrent.some((meal) => meal.id === mealId)) {
          return [{ ...mealFromToday, rating: { ...(mealFromToday.rating ?? {
            id: `${mealId}-local-rating`,
            mealId,
            rating,
            comment: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }), rating }, isFavorite: true }, ...ratedCurrent];
        }

        if (rating !== 3) {
          return ratedCurrent.filter((meal) => meal.id !== mealId);
        }

        return ratedCurrent;
      });
      haptic("tap");

      void (async () => {
        const result = await rateMealAction({ mealId, rating, comment: null });
        if (!result.success) {
          setLocalTodayMeals(previousToday);
          setLocalFavorites(previousFavorites);
          setPendingMealId(null);
          toast.error("Impossible d'enregistrer cet avis.");
          haptic("error");
          return;
        }

        setPendingMealId(null);
        toast.success("Avis enregistrÃ© !");
      })();
    },
    [localFavorites, localTodayMeals, pendingMealId, toast],
  );

  return (
      <section className="mx-auto w-full max-w-[920px] space-y-4">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Mes repas ðŸ½</h1>
          <p className="text-sm text-text-secondary">Note les repas et retrouve tes favoris.</p>
        </header>

        {isLoading ? <MealsLoadingSkeleton /> : null}

        {!isLoading ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Aujourd&apos;hui Â· {formatLongDate(todayDate)}
            </p>

            {localTodayMeals.length === 0 ? (
              <EmptyState
                icon="ðŸ½"
                title="Aucun repas prÃ©vu aujourd'hui"
                description="Tes parents peuvent en ajouter."
              />
            ) : (
              <StaggerContainer className="space-y-3">
                {localTodayMeals.map((meal) => (
                  <StaggerItem key={meal.id}>
                    <MealCard
                      mealType={meal.mealType}
                      description={meal.description}
                      preparedByLabel={meal.preparedByLabel}
                      rating={meal.rating?.rating ?? null}
                      disabled={pendingMealId === meal.id}
                      onRate={(rating) => handleRate(meal.id, rating)}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            <section className="space-y-2">
              <h2 className="text-sm font-black text-text-primary">Mes favoris â¤ï¸</h2>
              <FavoriteMealsList meals={localFavorites} />
            </section>
          </>
        ) : null}
      </section>
  );
}

