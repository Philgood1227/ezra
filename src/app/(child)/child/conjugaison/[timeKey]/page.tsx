import { notFound } from "next/navigation";
import { ChildConjugationSheet } from "@/features/conjugation/components";
import {
  getConjugationSheetForCurrentFamily,
  isConjugationTimeKey,
  listConjugationExercisesForCurrentChild,
} from "@/lib/api/conjugation";
import { getConjugationTimeDefinition } from "@/lib/conjugation/types";

interface ChildConjugaisonTimePageProps {
  params: Promise<{
    timeKey: string;
  }>;
}

export default async function ChildConjugaisonTimePage({
  params,
}: ChildConjugaisonTimePageProps): Promise<React.JSX.Element> {
  const { timeKey } = await params;

  if (!isConjugationTimeKey(timeKey)) {
    notFound();
  }

  const [sheet, exercises] = await Promise.all([
    getConjugationSheetForCurrentFamily(timeKey),
    listConjugationExercisesForCurrentChild(timeKey),
  ]);

  if (!sheet) {
    notFound();
  }

  return (
    <ChildConjugationSheet
      timeDefinition={getConjugationTimeDefinition(timeKey)}
      sheet={sheet}
      exerciseCount={exercises.length}
    />
  );
}
