import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CONJUGATION_TIME_KEYS,
  getConjugationTimeDefinition,
  type ConjugationAttemptAnswer,
  type ConjugationChildExerciseListItem,
  type ConjugationExerciseAttemptRecord,
  type ConjugationExerciseContent,
  type ConjugationExerciseDraft,
  type ConjugationExerciseRecord,
  type ConjugationExerciseStatus,
  type ConjugationSheetBlocks,
  type ConjugationSheetRecord,
  type ConjugationTimeKey,
} from "@/lib/conjugation/types";

interface DemoConjugationStore {
  sheets: Record<ConjugationTimeKey, ConjugationSheetRecord>;
  exercises: ConjugationExerciseRecord[];
  attempts: ConjugationExerciseAttemptRecord[];
}

type StoresByFamily = Record<string, DemoConjugationStore>;

const stores = new Map<string, DemoConjugationStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-conjugation-store.json");
const SHOULD_PERSIST_TO_DISK =
  process.env.NODE_ENV !== "test" &&
  process.env.VITEST !== "true" &&
  process.env.VITEST !== "1";

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
    stores.set(familyId, normalizeStoreShape(familyId, store));
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

function createDefaultBlocks(timeKey: ConjugationTimeKey): ConjugationSheetBlocks {
  const definition = getConjugationTimeDefinition(timeKey);

  return {
    aQuoiCaSertHtml: `<p>${definition.explanation}</p>`,
    marquesDuTempsHtml:
      timeKey === "passe-compose"
        ? "<p><strong>Auxiliaire etre/avoir</strong> au present + <strong>participe passe</strong>.</p>"
        : "<p>Observe les terminaisons et les pronoms pour bien conjuguer.</p>",
    exempleConjugaisonCompleteHtml:
      "<p>Exemple avec <strong>chanter</strong> :</p><ul><li>je ...</li><li>tu ...</li><li>il/elle ...</li><li>nous ...</li><li>vous ...</li><li>ils/elles ...</li></ul>",
    verbesAuxiliairesHtml:
      "<p><strong>Etre</strong> et <strong>avoir</strong> aident a conjuguer de nombreux verbes.</p>",
    trucsAstucesHtml:
      "<ul><li>Repere le pronom sujet.</li><li>Identifie le temps demande.</li><li>Vérifie la terminaison.</li></ul>",
  };
}

function createDefaultSheetRecord(
  familyId: string,
  timeKey: ConjugationTimeKey,
): ConjugationSheetRecord {
  return {
    id: randomUUID(),
    familyId,
    timeKey,
    blocks: createDefaultBlocks(timeKey),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStoreShape(
  familyId: string,
  store: Partial<DemoConjugationStore> | undefined,
): DemoConjugationStore {
  const sheets = {} as Record<ConjugationTimeKey, ConjugationSheetRecord>;
  CONJUGATION_TIME_KEYS.forEach((timeKey) => {
    const maybeExisting = store?.sheets?.[timeKey];
    sheets[timeKey] =
      maybeExisting && maybeExisting.timeKey === timeKey
        ? maybeExisting
        : createDefaultSheetRecord(familyId, timeKey);
  });

  return {
    sheets,
    exercises: Array.isArray(store?.exercises) ? store.exercises : [],
    attempts: Array.isArray(store?.attempts) ? store.attempts : [],
  };
}

function getStore(familyId: string): DemoConjugationStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = normalizeStoreShape(familyId, undefined);
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

function cloneContent(content: ConjugationExerciseContent): ConjugationExerciseContent {
  return JSON.parse(JSON.stringify(content)) as ConjugationExerciseContent;
}

function cloneAnswers(answers: ConjugationAttemptAnswer[]): ConjugationAttemptAnswer[] {
  return JSON.parse(JSON.stringify(answers)) as ConjugationAttemptAnswer[];
}

export function resetDemoConjugationStore(familyId?: string): void {
  syncStoresFromDisk();
  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function getDemoConjugationSheets(
  familyId: string,
): Record<ConjugationTimeKey, ConjugationSheetRecord> {
  const store = getStore(familyId);
  return JSON.parse(JSON.stringify(store.sheets)) as Record<
    ConjugationTimeKey,
    ConjugationSheetRecord
  >;
}

export function upsertDemoConjugationSheet(
  familyId: string,
  timeKey: ConjugationTimeKey,
  blocks: ConjugationSheetBlocks,
): ConjugationSheetRecord {
  const store = getStore(familyId);
  const existing = store.sheets[timeKey] ?? createDefaultSheetRecord(familyId, timeKey);

  const updated: ConjugationSheetRecord = {
    ...existing,
    familyId,
    timeKey,
    blocks,
    updatedAt: new Date().toISOString(),
  };

  store.sheets[timeKey] = updated;
  persistStoresToDisk();

  return JSON.parse(JSON.stringify(updated)) as ConjugationSheetRecord;
}

export function listDemoConjugationExercises(
  familyId: string,
  options?: {
    timeKey?: ConjugationTimeKey;
    status?: ConjugationExerciseStatus;
  },
): ConjugationExerciseRecord[] {
  const store = getStore(familyId);
  return store.exercises
    .filter((exercise) => (options?.timeKey ? exercise.timeKey === options.timeKey : true))
    .filter((exercise) => (options?.status ? exercise.status === options.status : true))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((exercise) => ({
      ...exercise,
      content: cloneContent(exercise.content),
    }));
}

export function getDemoConjugationExerciseById(
  familyId: string,
  exerciseId: string,
): ConjugationExerciseRecord | null {
  const store = getStore(familyId);
  const found = store.exercises.find((exercise) => exercise.id === exerciseId);
  if (!found) {
    return null;
  }

  return {
    ...found,
    content: cloneContent(found.content),
  };
}

export function upsertDemoConjugationExercise(
  familyId: string,
  draft: ConjugationExerciseDraft,
  exerciseId?: string,
): ConjugationExerciseRecord {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  if (exerciseId) {
    const existing = store.exercises.find((exercise) => exercise.id === exerciseId);
    if (existing) {
      existing.timeKey = draft.timeKey;
      existing.title = draft.title;
      existing.status = draft.status;
      existing.content = cloneContent(draft.content);
      existing.updatedAt = nowIso;
      persistStoresToDisk();
      return {
        ...existing,
        content: cloneContent(existing.content),
      };
    }
  }

  const created: ConjugationExerciseRecord = {
    id: randomUUID(),
    familyId,
    timeKey: draft.timeKey,
    title: draft.title,
    status: draft.status,
    content: cloneContent(draft.content),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.exercises.push(created);
  persistStoresToDisk();

  return {
    ...created,
    content: cloneContent(created.content),
  };
}

export function deleteDemoConjugationExercise(
  familyId: string,
  exerciseId: string,
): boolean {
  const store = getStore(familyId);
  const initialLength = store.exercises.length;
  store.exercises = store.exercises.filter((exercise) => exercise.id !== exerciseId);
  store.attempts = store.attempts.filter((attempt) => attempt.exerciseId !== exerciseId);

  if (store.exercises.length === initialLength) {
    return false;
  }

  persistStoresToDisk();
  return true;
}

export function duplicateDemoConjugationExercise(
  familyId: string,
  exerciseId: string,
): ConjugationExerciseRecord | null {
  const existing = getDemoConjugationExerciseById(familyId, exerciseId);
  if (!existing) {
    return null;
  }

  return upsertDemoConjugationExercise(familyId, {
    title: `${existing.title} (copie)`,
    timeKey: existing.timeKey,
    status: "draft",
    content: cloneContent(existing.content),
  });
}

export function setDemoConjugationExerciseStatus(
  familyId: string,
  exerciseId: string,
  status: ConjugationExerciseStatus,
): ConjugationExerciseRecord | null {
  const store = getStore(familyId);
  const existing = store.exercises.find((exercise) => exercise.id === exerciseId);
  if (!existing) {
    return null;
  }

  existing.status = status;
  existing.updatedAt = new Date().toISOString();
  persistStoresToDisk();
  return {
    ...existing,
    content: cloneContent(existing.content),
  };
}

export function listDemoConjugationAttempts(
  familyId: string,
  options?: {
    exerciseId?: string;
    childProfileId?: string;
  },
): ConjugationExerciseAttemptRecord[] {
  const store = getStore(familyId);
  return store.attempts
    .filter((attempt) => (options?.exerciseId ? attempt.exerciseId === options.exerciseId : true))
    .filter((attempt) =>
      options?.childProfileId ? attempt.childProfileId === options.childProfileId : true,
    )
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .map((attempt) => ({
      ...attempt,
      answers: cloneAnswers(attempt.answers),
    }));
}

export function addDemoConjugationAttempt(
  familyId: string,
  input: Omit<ConjugationExerciseAttemptRecord, "id" | "familyId" | "submittedAt">,
): ConjugationExerciseAttemptRecord {
  const store = getStore(familyId);
  const created: ConjugationExerciseAttemptRecord = {
    id: randomUUID(),
    familyId,
    submittedAt: new Date().toISOString(),
    ...input,
    answers: cloneAnswers(input.answers),
  };

  store.attempts.push(created);
  persistStoresToDisk();

  return {
    ...created,
    answers: cloneAnswers(created.answers),
  };
}

export function listDemoChildConjugationExercises(
  familyId: string,
  childProfileId: string,
  options?: { timeKey?: ConjugationTimeKey },
): ConjugationChildExerciseListItem[] {
  const exercises = listDemoConjugationExercises(familyId, {
    status: "published",
    ...(options?.timeKey ? { timeKey: options.timeKey } : {}),
  });
  const attempts = listDemoConjugationAttempts(familyId, { childProfileId });
  const latestAttemptByExerciseId = new Map<string, ConjugationExerciseAttemptRecord>();

  attempts.forEach((attempt) => {
    if (!latestAttemptByExerciseId.has(attempt.exerciseId)) {
      latestAttemptByExerciseId.set(attempt.exerciseId, attempt);
    }
  });

  return exercises.map((exercise) => {
    const latestAttempt = latestAttemptByExerciseId.get(exercise.id) ?? null;
    return {
      exercise,
      latestAttempt,
      isCompleted: latestAttempt !== null,
    };
  });
}

