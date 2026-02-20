"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createKnowledgeCardAction,
  createKnowledgeCategoryAction,
  deleteKnowledgeCardAction,
  deleteKnowledgeCategoryAction,
  updateKnowledgeCardAction,
  updateKnowledgeCategoryAction,
} from "@/lib/actions/knowledge";
import type {
  KnowledgeCardInput,
  KnowledgeCardSummary,
  KnowledgeCategorySummary,
  KnowledgeSubjectSummary,
} from "@/lib/day-templates/types";

interface KnowledgeSubjectManagerProps {
  subject: KnowledgeSubjectSummary;
  categories: KnowledgeCategorySummary[];
}

interface CategoryDraft {
  label: string;
  sortOrder: number;
}

interface CardDraft {
  categoryId: string;
  title: string;
  summary: string;
  difficulty: string;
  rappel: string;
  exemple: string;
  astuce: string;
}

const EMPTY_CATEGORY_DRAFT: CategoryDraft = {
  label: "",
  sortOrder: 0,
};

function getEmptyCardDraft(categories: KnowledgeCategorySummary[]): CardDraft {
  return {
    categoryId: categories[0]?.id ?? "",
    title: "",
    summary: "",
    difficulty: "",
    rappel: "",
    exemple: "",
    astuce: "",
  };
}

function buildCardPayload(draft: CardDraft): KnowledgeCardInput {
  return {
    categoryId: draft.categoryId,
    title: draft.title.trim(),
    summary: draft.summary.trim() ? draft.summary.trim() : null,
    difficulty: draft.difficulty.trim() ? draft.difficulty.trim() : null,
    content: {
      sections: [
        { title: "Rappel", text: draft.rappel.trim(), bullets: [] },
        { title: "Exemple", text: draft.exemple.trim(), bullets: [] },
        { title: "Astuce", text: draft.astuce.trim(), bullets: [] },
      ],
    },
  };
}

function getSectionText(card: KnowledgeCardSummary, sectionTitle: string): string {
  return card.content.sections.find((section) => section.title.toLowerCase() === sectionTitle.toLowerCase())?.text ?? "";
}

export function KnowledgeSubjectManager({
  subject,
  categories,
}: KnowledgeSubjectManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(EMPTY_CATEGORY_DRAFT);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<CardDraft>(getEmptyCardDraft(categories));

  const allCards = useMemo(
    () => categories.flatMap((category) => category.cards.map((card) => ({ ...card, categoryLabel: category.label }))),
    [categories],
  );

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    setCardDraft((current) => {
      const hasCurrentCategory = categories.some((category) => category.id === current.categoryId);
      if (hasCurrentCategory) {
        return current;
      }

      return {
        ...current,
        categoryId: categories[0]?.id ?? "",
      };
    });
  }, [categories]);

  function resetCategoryForm(): void {
    setEditingCategoryId(null);
    setCategoryDraft(EMPTY_CATEGORY_DRAFT);
  }

  function startEditCategory(category: KnowledgeCategorySummary): void {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      label: category.label,
      sortOrder: category.sortOrder,
    });
    setFeedback(null);
  }

  function resetCardForm(): void {
    setEditingCardId(null);
    setCardDraft(getEmptyCardDraft(categories));
  }

  function startEditCard(card: KnowledgeCardSummary): void {
    setEditingCardId(card.id);
    setCardDraft({
      categoryId: card.categoryId,
      title: card.title,
      summary: card.summary ?? "",
      difficulty: card.difficulty ?? "",
      rappel: getSectionText(card, "Rappel"),
      exemple: getSectionText(card, "Exemple"),
      astuce: getSectionText(card, "Astuce"),
    });
    setFeedback(null);
  }

  function handleCategorySubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const payload = {
        subjectId: subject.id,
        label: categoryDraft.label.trim(),
        sortOrder: Math.max(0, Math.trunc(categoryDraft.sortOrder)),
      };

      const result = editingCategoryId
        ? await updateKnowledgeCategoryAction(editingCategoryId, payload)
        : await createKnowledgeCategoryAction(payload);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la categorie." });
        return;
      }

      setFeedback({
        tone: "success",
        message: editingCategoryId ? "Categorie mise a jour." : "Categorie ajoutee.",
      });
      resetCategoryForm();
      router.refresh();
    });
  }

  function handleDeleteCategory(categoryId: string): void {
    if (!window.confirm("Supprimer cette categorie et les fiches associees ?")) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await deleteKnowledgeCategoryAction(categoryId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer la categorie." });
        return;
      }

      if (editingCategoryId === categoryId) {
        resetCategoryForm();
      }

      setFeedback({ tone: "success", message: "Categorie supprimee." });
      router.refresh();
    });
  }

  function handleCardSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const payload = buildCardPayload(cardDraft);
      const result = editingCardId
        ? await updateKnowledgeCardAction(editingCardId, payload)
        : await createKnowledgeCardAction(payload);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la fiche." });
        return;
      }

      setFeedback({
        tone: "success",
        message: editingCardId ? "Fiche mise a jour." : "Fiche ajoutee.",
      });
      resetCardForm();
      router.refresh();
    });
  }

  function handleDeleteCard(cardId: string): void {
    if (!window.confirm("Supprimer cette fiche ?")) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await deleteKnowledgeCardAction(cardId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer la fiche." });
        return;
      }

      if (editingCardId === cardId) {
        resetCardForm();
      }

      setFeedback({ tone: "success", message: "Fiche supprimee." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-brand-200 bg-brand-50">
        <CardHeader>
          <CardTitle>Vue rapide - {subject.label}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Categories: <span className="font-semibold text-ink-strong">{categories.length}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Fiches: <span className="font-semibold text-ink-strong">{allCards.length}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Action: <span className="font-semibold text-ink-strong">structurer puis publier</span>
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-ink-strong">Matiere : {subject.label}</h2>
        <Link href="/parent/knowledge" className="text-sm font-semibold text-accent-700 hover:underline">
          Retour aux matieres
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingCategoryId ? "Modifier une categorie" : "Ajouter une categorie"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 rounded-xl bg-surface-elevated px-3 py-2 text-sm text-ink-muted">
            Etape 1: categorie. Etape 2: fiche. Les suppressions demandent confirmation.
          </p>
          <form className="space-y-3" onSubmit={handleCategorySubmit}>
            <div className="grid gap-3 md:grid-cols-[1fr_120px]">
              <div className="space-y-1">
                <label htmlFor="knowledge-category-label" className="text-sm font-semibold text-ink-muted">
                  Nom
                </label>
                <Input
                  id="knowledge-category-label"
                  value={categoryDraft.label}
                  onChange={(event) =>
                    setCategoryDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Grammaire"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="knowledge-category-order" className="text-sm font-semibold text-ink-muted">
                  Ordre
                </label>
                <Input
                  id="knowledge-category-order"
                  type="number"
                  min={0}
                  value={categoryDraft.sortOrder}
                  onChange={(event) =>
                    setCategoryDraft((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isPending}>
                {editingCategoryId ? "Enregistrer" : "Ajouter"}
              </Button>
              {editingCategoryId ? (
                <Button type="button" variant="ghost" onClick={resetCategoryForm}>
                  Annuler
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingCardId ? "Modifier une fiche" : "Ajouter une fiche"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleCardSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="knowledge-card-category" className="text-sm font-semibold text-ink-muted">
                  Categorie
                </label>
                <select
                  id="knowledge-card-category"
                  value={cardDraft.categoryId}
                  onChange={(event) =>
                    setCardDraft((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-accent-200 bg-white px-3 text-sm text-ink-strong"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="knowledge-card-title" className="text-sm font-semibold text-ink-muted">
                  Titre
                </label>
                <Input
                  id="knowledge-card-title"
                  value={cardDraft.title}
                  onChange={(event) => setCardDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Accord sujet verbe"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="knowledge-card-summary" className="text-sm font-semibold text-ink-muted">
                  Resume
                </label>
                <Input
                  id="knowledge-card-summary"
                  value={cardDraft.summary}
                  onChange={(event) => setCardDraft((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Retiens l'idee principale"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="knowledge-card-difficulty" className="text-sm font-semibold text-ink-muted">
                  Niveau
                </label>
                <Input
                  id="knowledge-card-difficulty"
                  value={cardDraft.difficulty}
                  onChange={(event) => setCardDraft((current) => ({ ...current, difficulty: event.target.value }))}
                  placeholder="CM1"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="knowledge-card-rappel" className="text-sm font-semibold text-ink-muted">
                  Rappel
                </label>
                <textarea
                  id="knowledge-card-rappel"
                  value={cardDraft.rappel}
                  onChange={(event) => setCardDraft((current) => ({ ...current, rappel: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-accent-200 bg-white px-3 py-2 text-sm text-ink-strong"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="knowledge-card-exemple" className="text-sm font-semibold text-ink-muted">
                  Exemple
                </label>
                <textarea
                  id="knowledge-card-exemple"
                  value={cardDraft.exemple}
                  onChange={(event) => setCardDraft((current) => ({ ...current, exemple: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-accent-200 bg-white px-3 py-2 text-sm text-ink-strong"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="knowledge-card-astuce" className="text-sm font-semibold text-ink-muted">
                  Astuce
                </label>
                <textarea
                  id="knowledge-card-astuce"
                  value={cardDraft.astuce}
                  onChange={(event) => setCardDraft((current) => ({ ...current, astuce: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-accent-200 bg-white px-3 py-2 text-sm text-ink-strong"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isPending}>
                {editingCardId ? "Enregistrer" : "Ajouter"}
              </Button>
              {editingCardId ? (
                <Button type="button" variant="ghost" onClick={resetCardForm}>
                  Annuler
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Categories et fiches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune categorie pour cette matiere.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="space-y-2 rounded-xl border border-accent-100 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-strong">{category.label}</p>
                    <p className="text-xs text-ink-muted">Ordre : {category.sortOrder}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEditCategory(category)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>

                {category.cards.length === 0 ? (
                  <p className="text-sm text-ink-muted">Aucune fiche.</p>
                ) : (
                  category.cards.map((card) => (
                    <div key={card.id} className="rounded-lg border border-accent-100 bg-surface-elevated p-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink-strong">{card.title}</p>
                          <p className="text-xs text-ink-muted">
                            {card.difficulty ? `Niveau ${card.difficulty}` : "Niveau libre"}
                          </p>
                          {card.summary ? <p className="text-xs text-ink-muted">{card.summary}</p> : null}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => startEditCard(card)}>
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleDeleteCard(card.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {allCards.length > 0 ? (
        <p className="text-xs text-ink-muted">
          Total fiches : {allCards.length}. Chaque fiche peut ensuite etre liee a une tache dans Journees types.
        </p>
      ) : null}
    </div>
  );
}
