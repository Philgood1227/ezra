import { describe, expect, it } from "vitest";
import {
  buildKnowledgeCategoriesForSubject,
  buildKnowledgeSubjectSummaries,
  normalizeKnowledgeContent,
} from "@/lib/domain/knowledge";

describe("knowledge domain", () => {
  it("compte categories et cartes par matiere", () => {
    const summaries = buildKnowledgeSubjectSummaries({
      subjects: [
        { id: "s1", familyId: "f1", code: "maths", label: "Maths" },
        { id: "s2", familyId: "f1", code: "fr", label: "Francais" },
      ],
      categories: [
        { id: "c1", subjectId: "s1", label: "Calcul", sortOrder: 0 },
        { id: "c2", subjectId: "s1", label: "Problemes", sortOrder: 1 },
      ],
      cards: [
        {
          id: "k1",
          categoryId: "c1",
          title: "Addition",
          summary: null,
          difficulty: null,
          content: { sections: [{ title: "Rappel", text: "1+1", bullets: [] }] },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(summaries.find((entry) => entry.id === "s1")?.categoryCount).toBe(2);
    expect(summaries.find((entry) => entry.id === "s1")?.cardCount).toBe(1);
    expect(summaries.find((entry) => entry.id === "s2")?.categoryCount).toBe(0);
    expect(summaries.find((entry) => entry.id === "s2")?.cardCount).toBe(0);
  });

  it("filtre les cartes par matiere et applique les favoris", () => {
    const categories = buildKnowledgeCategoriesForSubject({
      subjectId: "s1",
      categories: [
        { id: "c1", subjectId: "s1", label: "Calcul", sortOrder: 0 },
        { id: "c2", subjectId: "s2", label: "Vocabulaire", sortOrder: 0 },
      ],
      cards: [
        {
          id: "k1",
          categoryId: "c1",
          title: "Addition",
          summary: null,
          difficulty: null,
          content: { sections: [{ title: "Rappel", text: "1+1", bullets: [] }] },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "k2",
          categoryId: "c2",
          title: "Der, die, das",
          summary: null,
          difficulty: null,
          content: { sections: [{ title: "Rappel", text: "Genre", bullets: [] }] },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      favoriteCardIds: ["k1"],
    });

    expect(categories).toHaveLength(1);
    expect(categories[0]?.cards).toHaveLength(1);
    expect(categories[0]?.cards[0]?.isFavorite).toBe(true);
  });

  it("normalise le contenu quand le json est vide", () => {
    const content = normalizeKnowledgeContent({});

    expect(content.sections.length).toBeGreaterThan(0);
    expect(content.sections[0]?.title).toBe("Rappel");
  });
});
