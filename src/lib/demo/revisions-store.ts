import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  CreateRevisionCardInput,
  RevisionProgress,
  StoredRevisionCard,
  UpdateRevisionCardPatch,
  UserRevisionState,
  UpsertRevisionProgressInput,
} from "@/lib/revisions/types";
import {
  createRevisionCardInputSchema,
  revisionCardContentSchema,
  updateRevisionCardPatchSchema,
  upsertRevisionProgressInputSchema,
} from "@/lib/revisions/validation";

interface DemoRevisionStore {
  cards: StoredRevisionCard[];
  progress: RevisionProgress[];
  userStates: UserRevisionState[];
}

type StoresByFamily = Record<string, DemoRevisionStore>;

const stores = new Map<string, DemoRevisionStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-revisions-store.json");
const SHOULD_PERSIST_TO_DISK = process.env.NODE_ENV !== "test" && process.env.VITEST !== "true" && process.env.VITEST !== "1";

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
      cards: store.cards ?? [],
      progress: store.progress ?? [],
      userStates: store.userStates ?? [],
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

function getStore(familyId: string): DemoRevisionStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      cards: [],
      progress: [],
      userStates: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

export function resetDemoRevisionsStore(familyId?: string): void {
  syncStoresFromDisk();
  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function listDemoRevisionCards(
  familyId: string,
  options?: { publishedOnly?: boolean },
): StoredRevisionCard[] {
  const publishedOnly = options?.publishedOnly ?? false;
  return getStore(familyId).cards
    .filter((card) => (publishedOnly ? card.status === "published" : true))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getDemoRevisionCardById(
  familyId: string,
  cardId: string,
  options?: { publishedOnly?: boolean },
): StoredRevisionCard | null {
  const publishedOnly = options?.publishedOnly ?? false;
  const card = getStore(familyId).cards.find((entry) => entry.id === cardId) ?? null;
  if (!card) {
    return null;
  }

  if (publishedOnly && card.status !== "published") {
    return null;
  }

  return card;
}

export function createDemoRevisionCard(
  familyId: string,
  createdByProfileId: string | null,
  input: CreateRevisionCardInput,
): StoredRevisionCard {
  const parsed = createRevisionCardInputSchema.parse(input);
  const nowIso = new Date().toISOString();
  const card: StoredRevisionCard = {
    id: randomUUID(),
    familyId,
    createdByProfileId,
    title: parsed.title,
    subject: parsed.subject,
    level: parsed.level ?? null,
    tags: parsed.tags,
    content: parsed.content,
    status: parsed.status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const store = getStore(familyId);
  store.cards.push(card);
  persistStoresToDisk();
  return card;
}

export function updateDemoRevisionCard(
  familyId: string,
  cardId: string,
  patch: UpdateRevisionCardPatch,
): StoredRevisionCard | null {
  const parsed = updateRevisionCardPatchSchema.parse(patch);
  const store = getStore(familyId);
  const card = store.cards.find((entry) => entry.id === cardId) ?? null;
  if (!card) {
    return null;
  }

  if (parsed.title !== undefined) {
    card.title = parsed.title;
  }
  if (parsed.subject !== undefined) {
    card.subject = parsed.subject;
  }
  if (parsed.level !== undefined) {
    card.level = parsed.level;
  }
  if (parsed.tags !== undefined) {
    card.tags = parsed.tags;
  }
  if (parsed.content !== undefined) {
    card.content = revisionCardContentSchema.parse(parsed.content);
  }
  if (parsed.status !== undefined) {
    card.status = parsed.status;
  }

  card.updatedAt = new Date().toISOString();
  persistStoresToDisk();
  return card;
}

export function deleteDemoRevisionCard(familyId: string, cardId: string): boolean {
  const store = getStore(familyId);
  const cardIndex = store.cards.findIndex((entry) => entry.id === cardId);
  if (cardIndex < 0) {
    return false;
  }

  store.cards.splice(cardIndex, 1);
  store.progress = store.progress.filter((entry) => entry.revisionCardId !== cardId);
  store.userStates = store.userStates.filter((entry) => entry.cardId !== cardId);
  persistStoresToDisk();
  return true;
}

export function getDemoUserRevisionState(
  familyId: string,
  userId: string,
  cardId: string,
): UserRevisionState | null {
  const store = getStore(familyId);
  return (
    store.userStates.find((entry) => entry.userId === userId && entry.cardId === cardId) ?? null
  );
}

export function listDemoUserRevisionStatesForUser(
  familyId: string,
  userId: string,
): UserRevisionState[] {
  const store = getStore(familyId);
  return store.userStates.filter((entry) => entry.userId === userId);
}

export function upsertDemoUserRevisionState(
  familyId: string,
  state: UserRevisionState,
): UserRevisionState {
  const store = getStore(familyId);
  const existing = store.userStates.find(
    (entry) => entry.userId === state.userId && entry.cardId === state.cardId,
  );

  if (existing) {
    existing.status = state.status;
    existing.stars = state.stars;
    existing.lastReviewedAt = state.lastReviewedAt;
    if (state.quizScore) {
      existing.quizScore = state.quizScore;
    } else {
      delete existing.quizScore;
    }
    persistStoresToDisk();
    return existing;
  }

  const created: UserRevisionState = {
    userId: state.userId,
    cardId: state.cardId,
    status: state.status,
    stars: state.stars,
    lastReviewedAt: state.lastReviewedAt,
    ...(state.quizScore ? { quizScore: state.quizScore } : {}),
  };

  store.userStates.push(created);
  persistStoresToDisk();
  return created;
}

export function upsertDemoRevisionProgress(
  familyId: string,
  childProfileId: string,
  input: UpsertRevisionProgressInput,
): RevisionProgress {
  const parsed = upsertRevisionProgressInputSchema.parse(input);
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  const existing = store.progress.find(
    (entry) => entry.childProfileId === childProfileId && entry.revisionCardId === parsed.revisionCardId,
  );

  if (existing) {
    if (parsed.lastSeenAt !== undefined) {
      existing.lastSeenAt = parsed.lastSeenAt;
    } else {
      existing.lastSeenAt = nowIso;
    }
    if (parsed.completedCount !== undefined) {
      existing.completedCount = parsed.completedCount;
    }
    if (parsed.successStreak !== undefined) {
      existing.successStreak = parsed.successStreak;
    }
    if (parsed.confidenceScore !== undefined) {
      existing.confidenceScore = parsed.confidenceScore;
    }
    if (parsed.status !== undefined) {
      existing.status = parsed.status;
    } else if (existing.status === "not_started") {
      existing.status = "in_progress";
    }

    existing.updatedAt = nowIso;
    persistStoresToDisk();
    return existing;
  }

  const created: RevisionProgress = {
    id: randomUUID(),
    familyId,
    childProfileId,
    revisionCardId: parsed.revisionCardId,
    lastSeenAt: parsed.lastSeenAt ?? nowIso,
    completedCount: parsed.completedCount ?? 0,
    successStreak: parsed.successStreak ?? 0,
    confidenceScore: parsed.confidenceScore ?? null,
    status: parsed.status ?? "in_progress",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.progress.push(created);
  persistStoresToDisk();
  return created;
}
