import type {
  KnowledgeCardContent,
  KnowledgeCardSummary,
  KnowledgeCategorySummary,
  KnowledgeSection,
  KnowledgeSubjectSummary,
} from "@/lib/day-templates/types";

export interface KnowledgeSubjectRecord {
  id: string;
  familyId: string;
  code: string;
  label: string;
}

export interface KnowledgeCategoryRecord {
  id: string;
  subjectId: string;
  label: string;
  sortOrder: number;
}

export interface KnowledgeCardRecord {
  id: string;
  categoryId: string;
  title: string;
  summary: string | null;
  difficulty: string | null;
  content: KnowledgeCardContent;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_KNOWLEDGE_SECTION_TITLES = ["Rappel", "Exemple", "Astuce"] as const;

function normalizeBullets(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
}

function normalizeSection(value: unknown): KnowledgeSection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  const bullets = normalizeBullets(raw.bullets);

  if (!title && !text && bullets.length === 0) {
    return null;
  }

  return {
    title: title || "Section",
    text,
    bullets,
  };
}

export function normalizeKnowledgeContent(value: unknown): KnowledgeCardContent {
  if (!value || typeof value !== "object") {
    return {
      sections: DEFAULT_KNOWLEDGE_SECTION_TITLES.map((title) => ({
        title,
        text: "",
        bullets: [],
      })),
    };
  }

  const raw = value as Record<string, unknown>;
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map((section) => normalizeSection(section)).filter((section): section is KnowledgeSection => section !== null)
    : [];

  if (sections.length === 0) {
    return {
      sections: DEFAULT_KNOWLEDGE_SECTION_TITLES.map((title) => ({
        title,
        text: "",
        bullets: [],
      })),
    };
  }

  return { sections };
}

export function buildKnowledgeSubjectSummaries(input: {
  subjects: KnowledgeSubjectRecord[];
  categories: KnowledgeCategoryRecord[];
  cards: KnowledgeCardRecord[];
}): KnowledgeSubjectSummary[] {
  const categoryCountBySubjectId = new Map<string, number>();
  const subjectIdByCategoryId = new Map(input.categories.map((category) => [category.id, category.subjectId]));

  input.categories.forEach((category) => {
    categoryCountBySubjectId.set(
      category.subjectId,
      (categoryCountBySubjectId.get(category.subjectId) ?? 0) + 1,
    );
  });

  const cardCountBySubjectId = new Map<string, number>();
  input.cards.forEach((card) => {
    const subjectId = subjectIdByCategoryId.get(card.categoryId);
    if (!subjectId) {
      return;
    }

    cardCountBySubjectId.set(subjectId, (cardCountBySubjectId.get(subjectId) ?? 0) + 1);
  });

  return input.subjects
    .map((subject) => ({
      id: subject.id,
      familyId: subject.familyId,
      code: subject.code,
      label: subject.label,
      categoryCount: categoryCountBySubjectId.get(subject.id) ?? 0,
      cardCount: cardCountBySubjectId.get(subject.id) ?? 0,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

export function buildKnowledgeCategoriesForSubject(input: {
  subjectId: string;
  categories: KnowledgeCategoryRecord[];
  cards: KnowledgeCardRecord[];
  favoriteCardIds: string[];
}): KnowledgeCategorySummary[] {
  const favoriteCardIds = new Set(input.favoriteCardIds);

  return input.categories
    .filter((category) => category.subjectId === input.subjectId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, "fr"))
    .map((category) => {
      const cards = input.cards
        .filter((card) => card.categoryId === category.id)
        .sort((left, right) => left.title.localeCompare(right.title, "fr"))
        .map((card) => {
          const mapped: KnowledgeCardSummary = {
            id: card.id,
            categoryId: card.categoryId,
            title: card.title,
            summary: card.summary,
            difficulty: card.difficulty,
            content: normalizeKnowledgeContent(card.content),
            isFavorite: favoriteCardIds.has(card.id),
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
          };
          return mapped;
        });

      const mappedCategory: KnowledgeCategorySummary = {
        id: category.id,
        subjectId: category.subjectId,
        label: category.label,
        sortOrder: category.sortOrder,
        cards,
      };

      return mappedCategory;
    });
}

export function getKnowledgeCardById(
  categories: KnowledgeCategorySummary[],
  cardId: string,
): KnowledgeCardSummary | null {
  for (const category of categories) {
    const card = category.cards.find((entry) => entry.id === cardId);
    if (card) {
      return card;
    }
  }

  return null;
}
