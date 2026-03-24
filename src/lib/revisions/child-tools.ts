import type { CardType } from "@/lib/revisions/types";

export interface ChildVisibleRevisionCardItem {
  id: string;
  title: string;
  subject: string;
  level: string | null;
  type: CardType;
  status: "published";
  updatedAt: string;
  lastReviewedAt: string | null;
  progressStatus: "unseen" | "in_progress" | "mastered";
  stars: number;
}

export interface ChildRevisionFilterInput {
  search: string;
  subject: string;
  type: "all" | CardType;
}

export interface ChildRevisionFilterOptions {
  subjects: string[];
  types: CardType[];
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function buildChildRevisionFilterOptions(
  cards: ChildVisibleRevisionCardItem[],
): ChildRevisionFilterOptions {
  const subjects = Array.from(new Set(cards.map((card) => card.subject.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "fr", { sensitivity: "base" }),
  );
  const typeSet = new Set<CardType>();
  cards.forEach((card) => {
    typeSet.add(card.type);
  });

  const orderedTypes: CardType[] = ["concept", "procedure", "vocab", "comprehension"];
  const types = orderedTypes.filter((type) => typeSet.has(type));

  return {
    subjects,
    types,
  };
}

export function filterChildVisibleRevisionCards(
  cards: ChildVisibleRevisionCardItem[],
  filters: ChildRevisionFilterInput,
): ChildVisibleRevisionCardItem[] {
  const normalizedSearch = normalizeText(filters.search);

  return cards.filter((card) => {
    if (filters.subject !== "all" && card.subject !== filters.subject) {
      return false;
    }

    if (filters.type !== "all" && card.type !== filters.type) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = `${card.title} ${card.subject} ${card.level ?? ""} ${card.type}`;
    return normalizeText(haystack).includes(normalizedSearch);
  });
}

export function getChildRevisionProgressLabel(card: ChildVisibleRevisionCardItem): string {
  if (card.progressStatus === "mastered") {
    return card.stars > 0 ? `${card.stars} etoiles` : "Vu";
  }

  if (card.progressStatus === "in_progress") {
    return "Vu";
  }

  return "Pas vu";
}
