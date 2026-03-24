import { beforeEach, describe, expect, it, vi } from "vitest";

const getBookByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/books", () => ({
  getBookById: getBookByIdMock,
}));

import { findRelevantBookChunks } from "@/lib/books/rag";

describe("books rag retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when indexed text is missing", async () => {
    getBookByIdMock.mockResolvedValue({
      id: "book-1",
      title: "Francais 6P",
      subject: "french",
      level: "6P",
      indexedText: null,
    });

    await expect(findRelevantBookChunks("book-1", "complement de verbe")).rejects.toThrow(
      "Book has no extracted indexed text yet.",
    );
  });

  it("returns ranked chunks for the requested topic", async () => {
    getBookByIdMock.mockResolvedValue({
      id: "book-2",
      title: "Texte et langue",
      subject: "french",
      level: "6P",
      indexedText: [
        "Le complement de verbe repond a la question quoi et qui.",
        "",
        "Les accords du participe passe sont traites dans une autre unite.",
        "",
        "Exercices sur le complement de verbe: souligne le groupe nominal.",
      ].join("\n\n"),
    });

    const result = await findRelevantBookChunks("book-2", "complement de verbe");

    expect(result.bookId).toBe("book-2");
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.mergedContext).toContain("[CHUNK 1]");
    expect(result.mergedContext).toContain("complement de verbe");
  });

  it("falls back to top chunks when no topic token matches", async () => {
    getBookByIdMock.mockResolvedValue({
      id: "book-3",
      title: "Maths 6P",
      subject: "maths",
      level: "6P",
      indexedText: [
        "Addition avec retenue en colonne: aligne les unites, dizaines et centaines, puis calcule chaque colonne avec verification finale.",
        "",
        "Soustraction avec retenue en colonne: commence par les unites, emprunte quand necessaire, puis controle le resultat avec une addition inverse.",
      ].join("\n\n"),
    });

    const result = await findRelevantBookChunks("book-3", "fraction decimale");

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.mergedContext).toContain("Titre du manuel: Maths 6P");
  });
});
