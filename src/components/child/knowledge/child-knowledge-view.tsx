"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KnowledgeIcon } from "@/components/child/icons/child-premium-icons";
import { Button, EmptyState, Skeleton } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { KnowledgeCardDetail } from "@/components/child/knowledge/knowledge-card-detail";
import { KnowledgeCardTile } from "@/components/child/knowledge/knowledge-card-tile";
import { SubjectCard } from "@/components/child/knowledge/subject-card";
import { setKnowledgeFavoriteAction } from "@/lib/actions/knowledge";
import type { KnowledgeCategorySummary, KnowledgeCardSummary, KnowledgeSubjectSummary } from "@/lib/day-templates/types";
import { haptic } from "@/lib/utils/haptic";

interface ChildKnowledgeViewProps {
  subjects: KnowledgeSubjectSummary[];
  selectedSubjectId: string | null;
  categories: KnowledgeCategorySummary[];
  favoriteCards: KnowledgeCardSummary[];
  initialCardId?: string | null;
  isLoading?: boolean;
}

function KnowledgeLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-radius-card" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-[120px] rounded-radius-card" count={4} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/2 rounded-radius-button" />
        <Skeleton className="h-24 w-full rounded-radius-card" count={3} />
      </div>
    </div>
  );
}

function updateFavoriteInCategories(
  categories: KnowledgeCategorySummary[],
  cardId: string,
  nextFavorite: boolean,
): KnowledgeCategorySummary[] {
  return categories.map((category) => ({
    ...category,
    cards: category.cards.map((card) => (card.id === cardId ? { ...card, isFavorite: nextFavorite } : card)),
  }));
}

function updateFavoriteInCards(cards: KnowledgeCardSummary[], cardId: string, nextFavorite: boolean): KnowledgeCardSummary[] {
  return cards.map((card) => (card.id === cardId ? { ...card, isFavorite: nextFavorite } : card));
}

function dateToFrenchDay(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

export function ChildKnowledgeView({
  subjects,
  selectedSubjectId,
  categories,
  favoriteCards,
  initialCardId = null,
  isLoading = false,
}: ChildKnowledgeViewProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();

  const [localCategories, setLocalCategories] = React.useState<KnowledgeCategorySummary[]>(categories);
  const [localFavoriteCards, setLocalFavoriteCards] = React.useState<KnowledgeCardSummary[]>(favoriteCards);
  const [openedCardId, setOpenedCardId] = React.useState<string | null>(initialCardId);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(categories[0]?.id ?? null);
  const [pendingCardId, setPendingCardId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalCategories(categories);
    setSelectedCategoryId(categories[0]?.id ?? null);
  }, [categories]);

  React.useEffect(() => {
    setLocalFavoriteCards(favoriteCards);
  }, [favoriteCards]);

  const selectedCategory = React.useMemo(
    () => localCategories.find((category) => category.id === selectedCategoryId) ?? localCategories[0] ?? null,
    [localCategories, selectedCategoryId],
  );

  const selectedCards = selectedCategory?.cards ?? [];
  const openedCard =
    selectedCards.find((card) => card.id === openedCardId) ??
    localFavoriteCards.find((card) => card.id === openedCardId) ??
    null;

  const handleToggleFavorite = React.useCallback(
    (card: KnowledgeCardSummary) => {
      if (pendingCardId) {
        return;
      }

      const nextFavorite = !card.isFavorite;
      setPendingCardId(card.id);
      setLocalCategories((current) => updateFavoriteInCategories(current, card.id, nextFavorite));
      setLocalFavoriteCards((current) => {
        const alreadyPresent = current.some((entry) => entry.id === card.id);
        if (nextFavorite && !alreadyPresent) {
          return [{ ...card, isFavorite: true }, ...current];
        }
        if (!nextFavorite) {
          return current.filter((entry) => entry.id !== card.id);
        }
        return updateFavoriteInCards(current, card.id, nextFavorite);
      });
      haptic("tap");

      void (async () => {
        const result = await setKnowledgeFavoriteAction(card.id, nextFavorite);
        if (!result.success) {
          setLocalCategories((current) => updateFavoriteInCategories(current, card.id, card.isFavorite));
          setLocalFavoriteCards((current) => {
            if (card.isFavorite) {
              const exists = current.some((entry) => entry.id === card.id);
              return exists ? updateFavoriteInCards(current, card.id, true) : [{ ...card, isFavorite: true }, ...current];
            }
            return current.filter((entry) => entry.id !== card.id);
          });
          toast.error("Impossible de mettre a jour le favori.");
          haptic("error");
          setPendingCardId(null);
          return;
        }

        toast.success(nextFavorite ? "Ajoute aux favoris" : "Retire des favoris");
        setPendingCardId(null);
      })();
    },
    [pendingCardId, toast],
  );

  return (
    <section className="mx-auto w-full max-w-[920px] space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">Mes fiches</h1>
        <p className="text-sm text-text-secondary">Choisis une fiche d&apos;aide.</p>
      </header>

      {isLoading ? <KnowledgeLoadingSkeleton /> : null}

      {!isLoading ? (
        <>
          {localFavoriteCards.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-black text-text-primary">Favoris</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {localFavoriteCards.map((card) => (
                  <div key={card.id} className="min-w-[260px]">
                    <KnowledgeCardTile
                      title={card.title}
                      summary={card.summary}
                      difficulty={card.difficulty}
                      isFavorite={card.isFavorite}
                      onOpen={() => setOpenedCardId(card.id)}
                      onFavoriteToggle={() => handleToggleFavorite(card)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {subjects.length === 0 ? (
            <EmptyState
              icon={<KnowledgeIcon className="size-8" />}
              title="Aucune fiche"
              description="Demande a un parent d'en ajouter."
            />
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-sm font-black text-text-primary">Matieres</h2>
                <StaggerContainer className="grid gap-3 md:grid-cols-2">
                  {subjects.map((subject) => (
                    <StaggerItem key={subject.id}>
                      <SubjectCard
                        label={subject.label}
                        code={subject.code}
                        cardCount={subject.cardCount}
                        categoryCount={subject.categoryCount}
                        selected={subject.id === selectedSubjectId}
                        onSelect={() => router.push(`/child/knowledge?subjectId=${subject.id}`)}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>

              {openedCard ? (
                <KnowledgeCardDetail
                  card={openedCard}
                  onBack={() => setOpenedCardId(null)}
                  onToggleFavorite={() => handleToggleFavorite(openedCard)}
                />
              ) : (
                <section className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {localCategories.map((category) => (
                      <Button
                        key={category.id}
                        size="sm"
                        variant={selectedCategoryId === category.id ? "primary" : "secondary"}
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        {category.label} ({category.cards.length})
                      </Button>
                    ))}
                  </div>

                  {selectedCards.length === 0 ? (
                    <EmptyState
                      icon={<KnowledgeIcon className="size-8" />}
                      title="Aucune fiche ici"
                      description="Essaie une autre categorie."
                    />
                  ) : (
                    <StaggerContainer className="grid gap-3 md:grid-cols-2">
                      {selectedCards.map((card) => (
                        <StaggerItem key={card.id}>
                          <KnowledgeCardTile
                            title={card.title}
                            summary={card.summary}
                            difficulty={card.difficulty}
                            isFavorite={card.isFavorite}
                            onOpen={() => setOpenedCardId(card.id)}
                            onFavoriteToggle={() => handleToggleFavorite(card)}
                          />
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  )}
                </section>
              )}

              {openedCard ? (
                <p className="text-xs text-text-muted">
                  Mise a jour: {dateToFrenchDay(openedCard.updatedAt)}
                </p>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
