import { ChildMealsView } from "@/components/child/meals";

export default function ChildMealsLoading(): React.JSX.Element {
  return (
    <ChildMealsView
      todayDate={new Date().toISOString().slice(0, 10)}
      todayMeals={[]}
      favoriteMeals={[]}
      isLoading
    />
  );
}
