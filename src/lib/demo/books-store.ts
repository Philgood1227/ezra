import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Book, CreateBookInput, UpdateBookStatusInput } from "@/lib/books/types";

interface DemoBooksStore {
  books: Book[];
}

type StoresByFamily = Record<string, DemoBooksStore>;

const stores = new Map<string, DemoBooksStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-books-store.json");
const SHOULD_PERSIST_TO_DISK =
  process.env.NODE_ENV !== "test" && process.env.VITEST !== "true" && process.env.VITEST !== "1";

function ensureStoreDir(): void {
  mkdirSync(path.dirname(STORE_FILE_PATH), { recursive: true });
}

function readStoresFromDisk(): StoresByFamily {
  if (!SHOULD_PERSIST_TO_DISK) {
    return {};
  }

  try {
    if (!existsSync(STORE_FILE_PATH)) {
      return {};
    }

    const raw = readFileSync(STORE_FILE_PATH, "utf8");
    if (!raw.trim()) {
      return {};
    }

    return JSON.parse(raw) as StoresByFamily;
  } catch {
    return {};
  }
}

function syncStoresFromDisk(): void {
  if (!SHOULD_PERSIST_TO_DISK) {
    return;
  }

  const persisted = readStoresFromDisk();
  stores.clear();
  Object.entries(persisted).forEach(([familyId, store]) => {
    stores.set(familyId, {
      books: store.books ?? [],
    });
  });
}

function persistStoresToDisk(): void {
  if (!SHOULD_PERSIST_TO_DISK) {
    return;
  }

  ensureStoreDir();
  const serialized: StoresByFamily = {};
  stores.forEach((store, familyId) => {
    serialized[familyId] = store;
  });
  writeFileSync(STORE_FILE_PATH, JSON.stringify(serialized), "utf8");
}

function getStore(familyId: string): DemoBooksStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = { books: [] };
    stores.set(familyId, store);
    persistStoresToDisk();
  }
  return store;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function resetDemoBooksStore(familyId?: string): void {
  syncStoresFromDisk();
  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function listDemoBooks(familyId: string): Book[] {
  return [...getStore(familyId).books].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getDemoBookById(familyId: string, bookId: string): Book | null {
  return getStore(familyId).books.find((book) => book.id === bookId) ?? null;
}

export function createDemoBook(
  familyId: string,
  createdByProfileId: string | null,
  input: CreateBookInput,
  filePath: string,
): Book {
  const nowIso = new Date().toISOString();
  const book: Book = {
    id: randomUUID(),
    familyId,
    createdByProfileId,
    subject: input.subject,
    level: normalizeText(input.level),
    title: normalizeText(input.title),
    schoolYear: input.schoolYear ? normalizeText(input.schoolYear) : null,
    fileName: normalizeText(input.fileName),
    filePath,
    status: "uploaded",
    errorMessage: null,
    indexedText: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const store = getStore(familyId);
  store.books.push(book);
  persistStoresToDisk();
  return book;
}

export function updateDemoBookStatus(
  familyId: string,
  input: UpdateBookStatusInput,
): Book | null {
  const store = getStore(familyId);
  const book = store.books.find((entry) => entry.id === input.bookId) ?? null;
  if (!book) {
    return null;
  }

  book.status = input.status;
  if (input.errorMessage !== undefined) {
    book.errorMessage = input.errorMessage;
  }
  if (input.indexedText !== undefined) {
    book.indexedText = input.indexedText;
  }
  book.updatedAt = new Date().toISOString();
  persistStoresToDisk();
  return book;
}

export function deleteDemoBook(familyId: string, bookId: string): Book | null {
  const store = getStore(familyId);
  const index = store.books.findIndex((entry) => entry.id === bookId);
  if (index < 0) {
    return null;
  }

  const [deleted] = store.books.splice(index, 1);
  persistStoresToDisk();
  return deleted ?? null;
}
