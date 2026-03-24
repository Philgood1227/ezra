import { notFound } from "next/navigation";
import { ChildConjugationExercisePlayer } from "@/features/conjugation/components";
import { getConjugationExerciseForCurrentChild } from "@/lib/api/conjugation";
import { getConjugationTimeDefinition } from "@/lib/conjugation/types";

interface ChildConjugaisonExercisePageProps {
  params: Promise<{
    exerciseId: string;
  }>;
}

export default async function ChildConjugaisonExercisePage({
  params,
}: ChildConjugaisonExercisePageProps): Promise<React.JSX.Element> {
  const { exerciseId } = await params;
  const item = await getConjugationExerciseForCurrentChild(exerciseId);

  if (!item) {
    notFound();
  }

  return (
    <ChildConjugationExercisePlayer
      item={item}
      timeDefinition={getConjugationTimeDefinition(item.exercise.timeKey)}
    />
  );
}
