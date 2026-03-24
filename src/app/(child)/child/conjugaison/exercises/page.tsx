import { ChildConjugationExercisesList } from "@/features/conjugation/components";
import {
  getConjugationChildHomeDataForCurrentChild,
  isConjugationTimeKey,
  listConjugationExercisesForCurrentChild,
} from "@/lib/api/conjugation";

interface ChildConjugaisonExercisesPageProps {
  searchParams: Promise<{
    time?: string;
  }>;
}

export default async function ChildConjugaisonExercisesPage({
  searchParams,
}: ChildConjugaisonExercisesPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const timeParam = params.time;
  const selectedTimeKey = timeParam && isConjugationTimeKey(timeParam) ? timeParam : null;

  const [homeData, items] = await Promise.all([
    getConjugationChildHomeDataForCurrentChild(),
    listConjugationExercisesForCurrentChild(selectedTimeKey ?? undefined),
  ]);

  return (
    <ChildConjugationExercisesList
      items={items}
      timeDefinitions={homeData.timeDefinitions}
      selectedTimeKey={selectedTimeKey}
    />
  );
}
