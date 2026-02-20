import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AlarmEventStatus,
  AlarmEventSummary,
  AlarmRuleInput,
  AlarmRuleSummary,
} from "@/lib/day-templates/types";
import { getModeDaysMask, sanitizeDaysMask } from "@/lib/domain/alarms";

interface DemoAlarmRuleRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  label: string;
  mode: AlarmRuleSummary["mode"];
  oneShotAt: string | null;
  timeOfDay: string | null;
  daysMask: number;
  soundKey: string;
  message: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DemoAlarmEventRecord {
  id: string;
  alarmRuleId: string;
  familyId: string;
  childProfileId: string;
  dueAt: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  status: AlarmEventStatus;
  createdAt: string;
}

interface DemoAlarmsStore {
  rules: DemoAlarmRuleRecord[];
  events: DemoAlarmEventRecord[];
}

type StoresByFamily = Record<string, DemoAlarmsStore>;

const stores = new Map<string, DemoAlarmsStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-alarms-store.json");

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

function getStore(familyId: string): DemoAlarmsStore {
  syncStoresFromDisk();

  let store = stores.get(familyId);
  if (!store) {
    store = { rules: [], events: [] };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

function mapRule(record: DemoAlarmRuleRecord): AlarmRuleSummary {
  return {
    id: record.id,
    familyId: record.familyId,
    childProfileId: record.childProfileId,
    label: record.label,
    mode: record.mode,
    oneShotAt: record.oneShotAt,
    timeOfDay: record.timeOfDay,
    daysMask: record.daysMask,
    soundKey: record.soundKey,
    message: record.message,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEvent(record: DemoAlarmEventRecord): AlarmEventSummary {
  return {
    id: record.id,
    alarmRuleId: record.alarmRuleId,
    familyId: record.familyId,
    childProfileId: record.childProfileId,
    dueAt: record.dueAt,
    triggeredAt: record.triggeredAt,
    acknowledgedAt: record.acknowledgedAt,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function normalizeRuleInput(input: AlarmRuleInput): AlarmRuleInput {
  return {
    label: input.label.trim(),
    mode: input.mode,
    oneShotAt: input.mode === "ponctuelle" ? input.oneShotAt : null,
    timeOfDay:
      input.mode === "ponctuelle" ? null : (input.timeOfDay?.slice(0, 5) ?? null),
    daysMask: getModeDaysMask(input.mode, sanitizeDaysMask(input.daysMask)),
    soundKey: input.soundKey.trim() || "cloche_douce",
    message: input.message.trim(),
    enabled: input.enabled,
  };
}

export function resetDemoAlarmsStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function listDemoAlarmRules(
  familyId: string,
  childProfileId: string,
): AlarmRuleSummary[] {
  return getStore(familyId).rules
    .filter((rule) => rule.childProfileId === childProfileId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((rule) => mapRule(rule));
}

export function getDemoAlarmRuleById(
  familyId: string,
  childProfileId: string,
  ruleId: string,
): AlarmRuleSummary | null {
  const rule = getStore(familyId).rules.find(
    (entry) => entry.id === ruleId && entry.childProfileId === childProfileId,
  );
  return rule ? mapRule(rule) : null;
}

export function upsertDemoAlarmRule(
  familyId: string,
  childProfileId: string,
  input: AlarmRuleInput,
  ruleId?: string,
): AlarmRuleSummary | null {
  const store = getStore(familyId);
  const normalized = normalizeRuleInput(input);
  const nowIso = new Date().toISOString();

  const existing = ruleId
    ? store.rules.find((entry) => entry.id === ruleId && entry.childProfileId === childProfileId)
    : undefined;

  if (ruleId && !existing) {
    return null;
  }

  if (existing) {
    existing.label = normalized.label;
    existing.mode = normalized.mode;
    existing.oneShotAt = normalized.oneShotAt;
    existing.timeOfDay = normalized.timeOfDay;
    existing.daysMask = normalized.daysMask;
    existing.soundKey = normalized.soundKey;
    existing.message = normalized.message;
    existing.enabled = normalized.enabled;
    existing.updatedAt = nowIso;
    persistStoresToDisk();
    return mapRule(existing);
  }

  const created: DemoAlarmRuleRecord = {
    id: randomUUID(),
    familyId,
    childProfileId,
    label: normalized.label,
    mode: normalized.mode,
    oneShotAt: normalized.oneShotAt,
    timeOfDay: normalized.timeOfDay,
    daysMask: normalized.daysMask,
    soundKey: normalized.soundKey,
    message: normalized.message,
    enabled: normalized.enabled,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.rules.push(created);
  persistStoresToDisk();
  return mapRule(created);
}

export function setDemoAlarmRuleEnabled(
  familyId: string,
  childProfileId: string,
  ruleId: string,
  enabled: boolean,
): AlarmRuleSummary | null {
  const store = getStore(familyId);
  const target = store.rules.find(
    (entry) => entry.id === ruleId && entry.childProfileId === childProfileId,
  );
  if (!target) {
    return null;
  }

  target.enabled = enabled;
  target.updatedAt = new Date().toISOString();
  persistStoresToDisk();
  return mapRule(target);
}

export function deleteDemoAlarmRule(
  familyId: string,
  childProfileId: string,
  ruleId: string,
): boolean {
  const store = getStore(familyId);
  const before = store.rules.length;

  store.rules = store.rules.filter(
    (entry) => !(entry.id === ruleId && entry.childProfileId === childProfileId),
  );
  store.events = store.events.filter((entry) => entry.alarmRuleId !== ruleId);

  if (store.rules.length === before) {
    return false;
  }

  persistStoresToDisk();
  return true;
}

export function listDemoAlarmEvents(
  familyId: string,
  childProfileId: string,
  options?: { includeAcknowledged?: boolean; limit?: number },
): AlarmEventSummary[] {
  const includeAcknowledged = options?.includeAcknowledged ?? true;
  let events = getStore(familyId).events.filter((entry) => entry.childProfileId === childProfileId);

  if (!includeAcknowledged) {
    events = events.filter((entry) => entry.status === "declenchee");
  }

  const sorted = events
    .slice()
    .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt))
    .map((entry) => mapEvent(entry));

  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

export function createDemoAlarmEventIfMissing(
  familyId: string,
  childProfileId: string,
  input: { alarmRuleId: string; dueAt: string },
): AlarmEventSummary | null {
  const store = getStore(familyId);
  const rule = store.rules.find(
    (entry) => entry.id === input.alarmRuleId && entry.childProfileId === childProfileId,
  );
  if (!rule) {
    return null;
  }

  const existing = store.events.find(
    (entry) => entry.alarmRuleId === input.alarmRuleId && entry.dueAt === input.dueAt,
  );
  if (existing) {
    return mapEvent(existing);
  }

  const nowIso = new Date().toISOString();
  const created: DemoAlarmEventRecord = {
    id: randomUUID(),
    alarmRuleId: input.alarmRuleId,
    familyId,
    childProfileId,
    dueAt: input.dueAt,
    triggeredAt: nowIso,
    acknowledgedAt: null,
    status: "declenchee",
    createdAt: nowIso,
  };

  store.events.push(created);
  persistStoresToDisk();
  return mapEvent(created);
}

export function acknowledgeDemoAlarmEvent(
  familyId: string,
  childProfileId: string,
  eventId: string,
): AlarmEventSummary | null {
  const store = getStore(familyId);
  const event = store.events.find(
    (entry) => entry.id === eventId && entry.childProfileId === childProfileId,
  );
  if (!event) {
    return null;
  }

  if (event.status === "acknowledged") {
    return mapEvent(event);
  }

  event.status = "acknowledged";
  event.acknowledgedAt = new Date().toISOString();
  persistStoresToDisk();
  return mapEvent(event);
}
