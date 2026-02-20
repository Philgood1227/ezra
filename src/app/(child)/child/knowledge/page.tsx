import { ChildKnowledgeView } from "@/components/child/knowledge";
import { getKnowledgeCardByIdForCurrentFamily, getKnowledgePageDataForCurrentChild } from "@/lib/api/knowledge";

interface ChildKnowledgePageProps {
  searchParams: Promise<{
    subjectId?: string;
    cardId?: string;
  }>;
}

export default async function ChildKnowledgePage({
  searchParams,
}: ChildKnowledgePageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const knowledge = await getKnowledgePageDataForCurrentChild(params.subjectId, params.cardId);
  const favoriteCardsRaw = await Promise.all(
    knowledge.favoriteCardIds.map((cardId) => getKnowledgeCardByIdForCurrentFamily(cardId)),
  );
  const favoriteCards = favoriteCardsRaw
    .filter((card): card is NonNullable<typeof card> => card !== null)
    .map((card) => ({ ...card, isFavorite: true }));

  return (
    <ChildKnowledgeView
      subjects={knowledge.subjects}
      selectedSubjectId={knowledge.selectedSubjectId}
      categories={knowledge.categories}
      favoriteCards={favoriteCards}
      initialCardId={params.cardId ?? null}
    />
  );
}
