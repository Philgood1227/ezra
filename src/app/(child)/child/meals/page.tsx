import { ChildMealsView } from "@/components/child/meals";
import { getMealsForChild } from "@/lib/api/meals";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getTodayDateKey } from "@/lib/day-templates/date";

export default async function ChildMealsPage(): Promise<React.JSX.Element> {
  const context = await getCurrentProfile();
  const childProfileId = context.profile?.id ?? "";
  const meals = childProfileId ? await getMealsForChild(childProfileId) : [];
  const todayDateKey = getTodayDateKey();

  const todayMeals = meals.filter((meal) => meal.date === todayDateKey);
  const favoriteMeals = meals.filter((meal) => meal.isFavorite).slice(0, 12);

  return (
    <ChildMealsView
      todayDate={todayDateKey}
      todayMeals={todayMeals}
      favoriteMeals={favoriteMeals}
    />
  );
}
