import { getBookById } from "@/lib/api/books";
import type { FindRelevantBookChunksResult, RelevantBookChunk } from "@/lib/books/types";

const MAX_SELECTED_CHUNKS = 5;
const CHUNK_MAX_CHARS = 1200;
const CHUNK_MIN_CHARS = 120;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForTokenMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

function tokenize(value: string): string[] {
  const normalized = normalizeForTokenMatch(value);
  return normalized
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function chunkIndexedText(indexedText: string): string[] {
  const paragraphs = indexedText
    .split(/\n{2,}/)
    .map((paragraph) => normalizeText(paragraph))
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length >= CHUNK_MAX_CHARS) {
      if (current.length >= CHUNK_MIN_CHARS) {
        chunks.push(current);
      }
      current = "";

      for (let offset = 0; offset < paragraph.length; offset += CHUNK_MAX_CHARS) {
        const slice = paragraph.slice(offset, offset + CHUNK_MAX_CHARS).trim();
        if (slice.length >= CHUNK_MIN_CHARS) {
          chunks.push(slice);
        }
      }
      continue;
    }

    if (!current) {
      current = paragraph;
      continue;
    }

    const candidate = `${current}\n\n${paragraph}`;
    if (candidate.length <= CHUNK_MAX_CHARS) {
      current = candidate;
      continue;
    }

    if (current.length >= CHUNK_MIN_CHARS) {
      chunks.push(current);
    }
    current = paragraph;
  }

  if (current.length >= CHUNK_MIN_CHARS) {
    chunks.push(current);
  }

  return chunks;
}

function scoreChunk(chunk: string, topicTokens: string[]): number {
  if (topicTokens.length === 0) {
    return 0;
  }

  const chunkTokens = new Set(tokenize(chunk));
  let score = 0;

  for (const token of topicTokens) {
    if (chunkTokens.has(token)) {
      score += token.length >= 6 ? 3 : 2;
    }
  }

  return score;
}

function buildMergedContext(book: {
  title: string;
  subject: string;
  level: string;
}, chunks: RelevantBookChunk[]): string {
  const header = [
    `Titre du manuel: ${book.title}`,
    `Matiere: ${book.subject}`,
    `Niveau: ${book.level}`,
    "Contrainte pedagogique: utiliser uniquement ces extraits du manuel.",
  ].join("\n");

  const body = chunks
    .map((chunk, index) => [`[CHUNK ${index + 1}]`, chunk.content].join("\n"))
    .join("\n\n");

  return `${header}\n\n${body}`.trim();
}

export async function findRelevantBookChunks(
  bookId: string,
  topic: string,
): Promise<FindRelevantBookChunksResult> {
  const normalizedBookId = normalizeText(bookId);
  const normalizedTopic = normalizeText(topic);

  if (!normalizedBookId) {
    throw new Error("Missing book id.");
  }
  if (!normalizedTopic) {
    throw new Error("Missing topic.");
  }

  const book = await getBookById(normalizedBookId);
  if (!book) {
    throw new Error("Book not found.");
  }

  const indexedText = normalizeText(book.indexedText ?? "");
  if (indexedText.length < CHUNK_MIN_CHARS) {
    throw new Error("Book has no extracted indexed text yet.");
  }

  const chunks = chunkIndexedText(indexedText);
  if (chunks.length === 0) {
    throw new Error("Unable to build chunks from indexed text.");
  }

  const topicTokens = uniqueTokens(tokenize(normalizedTopic));
  const ranked = chunks
    .map((chunk, index) => ({
      id: `${book.id}:chunk:${index + 1}`,
      content: chunk,
      score: scoreChunk(chunk, topicTokens),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.content.length - left.content.length;
    });

  const selected = ranked
    .filter((chunk) => chunk.score > 0)
    .slice(0, MAX_SELECTED_CHUNKS);

  const fallbackSelection = selected.length > 0
    ? selected
    : ranked.slice(0, Math.min(2, ranked.length));

  if (fallbackSelection.length === 0) {
    throw new Error("No relevant chunk found in indexed text.");
  }

  const relevantChunks: RelevantBookChunk[] = fallbackSelection.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    score: chunk.score,
  }));

  return {
    bookId: book.id,
    chunks: relevantChunks,
    mergedContext: buildMergedContext(book, relevantChunks),
  };
}

