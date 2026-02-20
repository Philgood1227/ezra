import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  KnowledgeCardContent,
  KnowledgeCardInput,
  KnowledgeCardSummary,
  KnowledgeCategoryInput,
  KnowledgeCategorySummary,
  KnowledgeSubjectInput,
  KnowledgeSubjectSummary,
} from "@/lib/day-templates/types";
import {
  buildKnowledgeCategoriesForSubject,
  buildKnowledgeSubjectSummaries,
  normalizeKnowledgeContent,
} from "@/lib/domain/knowledge";

interface DemoKnowledgeSubjectRecord {
  id: string;
  familyId: string;
  code: string;
  label: string;
  createdAt: string;
}

interface DemoKnowledgeCategoryRecord {
  id: string;
  subjectId: string;
  label: string;
  sortOrder: number;
  createdAt: string;
}

interface DemoKnowledgeCardRecord {
  id: string;
  categoryId: string;
  title: string;
  summary: string | null;
  difficulty: string | null;
  content: KnowledgeCardContent;
  createdAt: string;
  updatedAt: string;
}

interface DemoKnowledgeStore {
  subjects: DemoKnowledgeSubjectRecord[];
  categories: DemoKnowledgeCategoryRecord[];
  cards: DemoKnowledgeCardRecord[];
  favorites: Array<{ childProfileId: string; cardId: string; createdAt: string }>;
}

type StoresByFamily = Record<string, DemoKnowledgeStore>;

const stores = new Map<string, DemoKnowledgeStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-knowledge-store.json");

function ensureStoreDir(): void {
  mkdirSync(path.dirname(STORE_FILE_PATH), { recursive: true });
}

function readStoresFromDisk(): StoresByFamily {
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
  const persisted = readStoresFromDisk();
  stores.clear();
  Object.entries(persisted).forEach(([familyId, store]) => {
    stores.set(familyId, store);
  });
}

function persistStoresToDisk(): void {
  ensureStoreDir();
  const serialized: StoresByFamily = {};
  stores.forEach((store, familyId) => {
    serialized[familyId] = store;
  });
  writeFileSync(STORE_FILE_PATH, JSON.stringify(serialized), "utf8");
}

function getStore(familyId: string): DemoKnowledgeStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      subjects: [],
      categories: [],
      cards: [],
      favorites: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureSeedData(familyId: string): void {
  const store = getStore(familyId);
  if (store.subjects.length > 0) {
    return;
  }

  const nowIso = new Date().toISOString();

  const francaisId = randomUUID();
  const mathsId = randomUUID();
  const allemandId = randomUUID();

  store.subjects.push(
    { id: francaisId, familyId, code: "francais", label: "Francais", createdAt: nowIso },
    { id: mathsId, familyId, code: "maths", label: "Maths", createdAt: nowIso },
    { id: allemandId, familyId, code: "allemand", label: "Allemand", createdAt: nowIso },
  );

  const grammaireId = randomUUID();
  const problemesId = randomUUID();
  const vocabulaireId = randomUUID();

  store.categories.push(
    { id: grammaireId, subjectId: francaisId, label: "Grammaire", sortOrder: 0, createdAt: nowIso },
    { id: problemesId, subjectId: mathsId, label: "Problemes", sortOrder: 0, createdAt: nowIso },
    { id: vocabulaireId, subjectId: allemandId, label: "Vocabulaire", sortOrder: 0, createdAt: nowIso },
  );

  store.cards.push(
    {
      id: randomUUID(),
      categoryId: grammaireId,
      title: "Sujet et verbe",
      summary: "Repere qui fait l'action.",
      difficulty: "CM1",
      content: {
        sections: [
          { title: "Rappel", text: "Le sujet fait l'action.", bullets: ["Question: qui est-ce qui ?"] },
          { title: "Exemple", text: "Lina mange une pomme.", bullets: ["Sujet: Lina", "Verbe: mange"] },
          { title: "Astuce", text: "Entoure d'abord le verbe.", bullets: [] },
        ],
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: randomUUID(),
      categoryId: problemesId,
      title: "Probleme en 3 etapes",
      summary: "Lis, cherche, calcule.",
      difficulty: "CM1",
      content: {
        sections: [
          { title: "Rappel", text: "Lis l'enonce doucement.", bullets: ["Surligne les nombres"] },
          { title: "Exemple", text: "J'ai 12 billes et j'en gagne 5.", bullets: ["12 + 5 = 17"] },
          { title: "Astuce", text: "Ecris l'operation avant de calculer.", bullets: [] },
        ],
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  );

  persistStoresToDisk();
}

export function resetDemoKnowledgeStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

function mapSubjectSummaries(store: DemoKnowledgeStore): KnowledgeSubjectSummary[] {
  return buildKnowledgeSubjectSummaries({
    subjects: store.subjects.map((subject) => ({
      id: subject.id,
      familyId: subject.familyId,
      code: subject.code,
      label: subject.label,
    })),
    categories: store.categories.map((category) => ({
      id: category.id,
      subjectId: category.subjectId,
      label: category.label,
      sortOrder: category.sortOrder,
    })),
    cards: store.cards.map((card) => ({
      id: card.id,
      categoryId: card.categoryId,
      title: card.title,
      summary: card.summary,
      difficulty: card.difficulty,
      content: card.content,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    })),
  });
}

export function listDemoKnowledgeSubjects(familyId: string): KnowledgeSubjectSummary[] {
  ensureSeedData(familyId);
  return mapSubjectSummaries(getStore(familyId));
}

export function listDemoKnowledgeCategoriesForSubject(
  familyId: string,
  subjectId: string,
  childProfileId?: string,
): KnowledgeCategorySummary[] {
  ensureSeedData(familyId);
  const store = getStore(familyId);

  const favoriteCardIds = childProfileId
    ? store.favorites.filter((favorite) => favorite.childProfileId === childProfileId).map((favorite) => favorite.cardId)
    : [];

  return buildKnowledgeCategoriesForSubject({
    subjectId,
    categories: store.categories.map((category) => ({
      id: category.id,
      subjectId: category.subjectId,
      label: category.label,
      sortOrder: category.sortOrder,
    })),
    cards: store.cards.map((card) => ({
      id: card.id,
      categoryId: card.categoryId,
      title: card.title,
      summary: card.summary,
      difficulty: card.difficulty,
      content: card.content,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    })),
    favoriteCardIds,
  });
}

export function upsertDemoKnowledgeSubject(
  familyId: string,
  input: KnowledgeSubjectInput,
  subjectId?: string,
): KnowledgeSubjectSummary {
  const store = getStore(familyId);
  const code = normalizeCode(input.code || input.label);
  const nowIso = new Date().toISOString();

  const existing = subjectId ? store.subjects.find((subject) => subject.id === subjectId) : undefined;
  if (existing) {
    existing.code = code;
    existing.label = input.label;
    persistStoresToDisk();
    return mapSubjectSummaries(store).find((subject) => subject.id === existing.id)!;
  }

  const created: DemoKnowledgeSubjectRecord = {
    id: randomUUID(),
    familyId,
    code,
    label: input.label,
    createdAt: nowIso,
  };

  store.subjects.push(created);
  persistStoresToDisk();
  return mapSubjectSummaries(store).find((subject) => subject.id === created.id)!;
}

export function deleteDemoKnowledgeSubject(familyId: string, subjectId: string): boolean {
  const store = getStore(familyId);
  const categoryIds = store.categories
    .filter((category) => category.subjectId === subjectId)
    .map((category) => category.id);
  const cardIds = store.cards.filter((card) => categoryIds.includes(card.categoryId)).map((card) => card.id);

  const before = store.subjects.length;
  store.subjects = store.subjects.filter((subject) => subject.id !== subjectId);
  store.categories = store.categories.filter((category) => category.subjectId !== subjectId);
  store.cards = store.cards.filter((card) => !categoryIds.includes(card.categoryId));
  store.favorites = store.favorites.filter((favorite) => !cardIds.includes(favorite.cardId));

  if (before === store.subjects.length) {
    return false;
  }

  persistStoresToDisk();
  return true;
}

export function upsertDemoKnowledgeCategory(
  familyId: string,
  input: KnowledgeCategoryInput,
  categoryId?: string,
): KnowledgeCategorySummary | null {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();
  const subject = store.subjects.find((entry) => entry.id === input.subjectId);
  if (!subject) {
    return null;
  }

  const existing = categoryId ? store.categories.find((entry) => entry.id === categoryId) : undefined;
  if (existing) {
    existing.subjectId = input.subjectId;
    existing.label = input.label;
    existing.sortOrder = Math.max(0, Math.trunc(input.sortOrder));
  } else {
    store.categories.push({
      id: randomUUID(),
      subjectId: input.subjectId,
      label: input.label,
      sortOrder: Math.max(0, Math.trunc(input.sortOrder)),
      createdAt: nowIso,
    });
  }

  persistStoresToDisk();

  const targetId = existing?.id ?? store.categories[store.categories.length - 1]?.id;
  if (!targetId) {
    return null;
  }

  return listDemoKnowledgeCategoriesForSubject(familyId, input.subjectId).find((category) => category.id === targetId) ?? null;
}

export function deleteDemoKnowledgeCategory(familyId: string, categoryId: string): boolean {
  const store = getStore(familyId);
  const cardIds = store.cards.filter((card) => card.categoryId === categoryId).map((card) => card.id);

  const before = store.categories.length;
  store.categories = store.categories.filter((category) => category.id !== categoryId);
  store.cards = store.cards.filter((card) => card.categoryId !== categoryId);
  store.favorites = store.favorites.filter((favorite) => !cardIds.includes(favorite.cardId));

  if (before === store.categories.length) {
    return false;
  }

  persistStoresToDisk();
  return true;
}

export function upsertDemoKnowledgeCard(
  familyId: string,
  input: KnowledgeCardInput,
  cardId?: string,
): KnowledgeCardSummary | null {
  const store = getStore(familyId);
  const category = store.categories.find((entry) => entry.id === input.categoryId);
  if (!category) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const normalizedContent = normalizeKnowledgeContent(input.content);

  const existing = cardId ? store.cards.find((entry) => entry.id === cardId) : undefined;
  if (existing) {
    existing.categoryId = input.categoryId;
    existing.title = input.title;
    existing.summary = input.summary;
    existing.difficulty = input.difficulty;
    existing.content = normalizedContent;
    existing.updatedAt = nowIso;
  } else {
    store.cards.push({
      id: randomUUID(),
      categoryId: input.categoryId,
      title: input.title,
      summary: input.summary,
      difficulty: input.difficulty,
      content: normalizedContent,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  persistStoresToDisk();

  const targetId = existing?.id ?? store.cards[store.cards.length - 1]?.id;
  if (!targetId) {
    return null;
  }

  const categoryWithCards = listDemoKnowledgeCategoriesForSubject(familyId, category.subjectId).find(
    (entry) => entry.id === input.categoryId,
  );

  return categoryWithCards?.cards.find((card) => card.id === targetId) ?? null;
}

export function deleteDemoKnowledgeCard(familyId: string, cardId: string): boolean {
  const store = getStore(familyId);
  const before = store.cards.length;
  store.cards = store.cards.filter((card) => card.id !== cardId);
  store.favorites = store.favorites.filter((favorite) => favorite.cardId !== cardId);

  if (before === store.cards.length) {
    return false;
  }

  persistStoresToDisk();
  return true;
}

export function listDemoKnowledgeFavoriteCardIds(familyId: string, childProfileId: string): string[] {
  const store = getStore(familyId);
  return store.favorites
    .filter((favorite) => favorite.childProfileId === childProfileId)
    .map((favorite) => favorite.cardId);
}

export function setDemoKnowledgeFavorite(
  familyId: string,
  childProfileId: string,
  cardId: string,
  isFavorite: boolean,
): void {
  const store = getStore(familyId);
  const existingIndex = store.favorites.findIndex(
    (favorite) => favorite.childProfileId === childProfileId && favorite.cardId === cardId,
  );

  if (isFavorite) {
    if (existingIndex >= 0) {
      return;
    }

    store.favorites.push({
      childProfileId,
      cardId,
      createdAt: new Date().toISOString(),
    });
    persistStoresToDisk();
    return;
  }

  if (existingIndex < 0) {
    return;
  }

  store.favorites.splice(existingIndex, 1);
  persistStoresToDisk();
}
