import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  MovieOptionSummary,
  MovieSessionInput,
  MovieSessionSummary,
  MovieVoteSummary,
} from "@/lib/day-templates/types";

interface DemoMovieSessionRecord {
  id: string;
  familyId: string;
  date: string;
  time: string | null;
  status: "planifiee" | "choisie" | "terminee";
  proposerProfileId: string | null;
  pickerProfileId: string | null;
  chosenOptionId: string | null;
  createdAt: string;
}

interface DemoMovieOptionRecord {
  id: string;
  sessionId: string;
  title: string;
  platform: string | null;
  durationMinutes: number | null;
  description: string | null;
  createdAt: string;
}

interface DemoMovieVoteRecord {
  id: string;
  sessionId: string;
  profileId: string;
  movieOptionId: string;
  createdAt: string;
}

interface DemoCinemaStore {
  sessions: DemoMovieSessionRecord[];
  options: DemoMovieOptionRecord[];
  votes: DemoMovieVoteRecord[];
}

type StoresByFamily = Record<string, DemoCinemaStore>;

const stores = new Map<string, DemoCinemaStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-cinema-store.json");

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

function getStore(familyId: string): DemoCinemaStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      sessions: [],
      options: [],
      votes: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

export function resetDemoCinemaStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function listDemoMovieSessions(familyId: string): MovieSessionSummary[] {
  return getStore(familyId).sessions
    .map((session) => ({
      id: session.id,
      familyId: session.familyId,
      date: session.date,
      time: session.time,
      status: session.status,
      proposerProfileId: session.proposerProfileId,
      pickerProfileId: session.pickerProfileId,
      chosenOptionId: session.chosenOptionId,
      createdAt: session.createdAt,
    }))
    .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt));
}

export function getDemoMovieSessionById(
  familyId: string,
  sessionId: string,
): MovieSessionSummary | null {
  const session = getStore(familyId).sessions.find((entry) => entry.id === sessionId);
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    familyId: session.familyId,
    date: session.date,
    time: session.time,
    status: session.status,
    proposerProfileId: session.proposerProfileId,
    pickerProfileId: session.pickerProfileId,
    chosenOptionId: session.chosenOptionId,
    createdAt: session.createdAt,
  };
}

export function listDemoMovieOptionsForSession(
  familyId: string,
  sessionId: string,
): MovieOptionSummary[] {
  return getStore(familyId).options
    .filter((option) => option.sessionId === sessionId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((option) => ({
      id: option.id,
      sessionId: option.sessionId,
      title: option.title,
      platform: option.platform,
      durationMinutes: option.durationMinutes,
      description: option.description,
    }));
}

export function listDemoMovieVotesForSession(
  familyId: string,
  sessionId: string,
): MovieVoteSummary[] {
  return getStore(familyId).votes
    .filter((vote) => vote.sessionId === sessionId)
    .map((vote) => ({
      id: vote.id,
      sessionId: vote.sessionId,
      profileId: vote.profileId,
      movieOptionId: vote.movieOptionId,
      createdAt: vote.createdAt,
    }))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createDemoMovieSession(
  familyId: string,
  input: MovieSessionInput,
): { session: MovieSessionSummary; options: MovieOptionSummary[] } {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  const session: DemoMovieSessionRecord = {
    id: randomUUID(),
    familyId,
    date: input.date,
    time: input.time,
    status: "planifiee",
    proposerProfileId: input.proposerProfileId,
    pickerProfileId: input.pickerProfileId,
    chosenOptionId: null,
    createdAt: nowIso,
  };

  store.sessions.push(session);

  const createdOptions = input.options.slice(0, 3).map((option) => ({
    id: randomUUID(),
    sessionId: session.id,
    title: option.title,
    platform: option.platform,
    durationMinutes: option.durationMinutes,
    description: option.description,
    createdAt: nowIso,
  }));

  store.options.push(...createdOptions);
  persistStoresToDisk();

  return {
    session: {
      id: session.id,
      familyId: session.familyId,
      date: session.date,
      time: session.time,
      status: session.status,
      proposerProfileId: session.proposerProfileId,
      pickerProfileId: session.pickerProfileId,
      chosenOptionId: session.chosenOptionId,
      createdAt: session.createdAt,
    },
    options: createdOptions.map((option) => ({
      id: option.id,
      sessionId: option.sessionId,
      title: option.title,
      platform: option.platform,
      durationMinutes: option.durationMinutes,
      description: option.description,
    })),
  };
}

export function upsertDemoMovieVote(
  familyId: string,
  input: { sessionId: string; profileId: string; movieOptionId: string },
): MovieVoteSummary {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  let vote = store.votes.find(
    (entry) => entry.sessionId === input.sessionId && entry.profileId === input.profileId,
  );

  if (!vote) {
    vote = {
      id: randomUUID(),
      sessionId: input.sessionId,
      profileId: input.profileId,
      movieOptionId: input.movieOptionId,
      createdAt: nowIso,
    };
    store.votes.push(vote);
  } else {
    vote.movieOptionId = input.movieOptionId;
    vote.createdAt = nowIso;
  }

  persistStoresToDisk();

  return {
    id: vote.id,
    sessionId: vote.sessionId,
    profileId: vote.profileId,
    movieOptionId: vote.movieOptionId,
    createdAt: vote.createdAt,
  };
}

export function setDemoMovieSessionChoice(
  familyId: string,
  sessionId: string,
  chosenOptionId: string,
): MovieSessionSummary | null {
  const store = getStore(familyId);
  const session = store.sessions.find((entry) => entry.id === sessionId);
  if (!session) {
    return null;
  }

  session.chosenOptionId = chosenOptionId;
  session.status = "choisie";
  persistStoresToDisk();

  return {
    id: session.id,
    familyId: session.familyId,
    date: session.date,
    time: session.time,
    status: session.status,
    proposerProfileId: session.proposerProfileId,
    pickerProfileId: session.pickerProfileId,
    chosenOptionId: session.chosenOptionId,
    createdAt: session.createdAt,
  };
}

export function getDemoMovieOptionById(familyId: string, optionId: string): MovieOptionSummary | null {
  const option = getStore(familyId).options.find((entry) => entry.id === optionId);
  if (!option) {
    return null;
  }

  return {
    id: option.id,
    sessionId: option.sessionId,
    title: option.title,
    platform: option.platform,
    durationMinutes: option.durationMinutes,
    description: option.description,
  };
}
