import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  ChecklistInstanceSummary,
  ChecklistTemplateSummary,
  InAppNotificationSummary,
  NotificationChannel,
  NotificationRuleSummary,
  NotificationRuleType,
  SchoolDiaryEntryInput,
  SchoolDiaryEntrySummary,
} from "@/lib/day-templates/types";

interface DemoChecklistTemplateRecord {
  id: string;
  familyId: string;
  type: ChecklistTemplateSummary["type"];
  label: string;
  description: string | null;
  isDefault: boolean;
  items: ChecklistTemplateSummary["items"];
}

interface DemoChecklistInstanceRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  diaryEntryId: string | null;
  type: string;
  label: string;
  date: string;
  createdAt: string;
  items: ChecklistInstanceSummary["items"];
}

interface DemoNotificationRuleRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  type: NotificationRuleType;
  channel: NotificationChannel;
  timeOfDay: string;
  enabled: boolean;
}

interface DemoInAppNotificationRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  type: InAppNotificationSummary["type"];
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface DemoPushSubscriptionRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  profileId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoSchoolDiaryStore {
  entries: SchoolDiaryEntrySummary[];
  checklistTemplates: DemoChecklistTemplateRecord[];
  checklistInstances: DemoChecklistInstanceRecord[];
  notificationRules: DemoNotificationRuleRecord[];
  notifications: DemoInAppNotificationRecord[];
  pushSubscriptions: DemoPushSubscriptionRecord[];
}

type StoresByFamily = Record<string, DemoSchoolDiaryStore>;

const stores = new Map<string, DemoSchoolDiaryStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-school-diary-store.json");

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

function getStore(familyId: string): DemoSchoolDiaryStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      entries: [],
      checklistTemplates: [],
      checklistInstances: [],
      notificationRules: [],
      notifications: [],
      pushSubscriptions: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

export function resetDemoSchoolDiaryStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function listDemoSchoolDiaryEntries(
  familyId: string,
  childProfileId: string,
): SchoolDiaryEntrySummary[] {
  return getStore(familyId).entries
    .filter((entry) => entry.childProfileId === childProfileId)
    .map((entry) => ({
      ...entry,
      recurrencePattern: entry.recurrencePattern ?? "none",
      recurrenceUntilDate: entry.recurrenceUntilDate ?? null,
      recurrenceGroupId: entry.recurrenceGroupId ?? null,
    }))
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export function upsertDemoSchoolDiaryEntry(
  familyId: string,
  childProfileId: string,
  input: SchoolDiaryEntryInput & {
    recurrencePattern?: SchoolDiaryEntrySummary["recurrencePattern"];
    recurrenceUntilDate?: string | null;
    recurrenceGroupId?: string | null;
  },
  entryId?: string,
): SchoolDiaryEntrySummary {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  const existing = entryId ? store.entries.find((entry) => entry.id === entryId) : undefined;
  if (existing) {
    existing.type = input.type;
    existing.subject = input.subject;
    existing.title = input.title;
    existing.description = input.description;
    existing.date = input.date;
    existing.recurrencePattern = input.recurrencePattern ?? "none";
    existing.recurrenceUntilDate =
      input.recurrencePattern && input.recurrencePattern !== "none"
        ? input.recurrenceUntilDate ?? null
        : null;
    existing.recurrenceGroupId = input.recurrenceGroupId ?? null;
    existing.updatedAt = nowIso;
    persistStoresToDisk();
    return existing;
  }

  const created: SchoolDiaryEntrySummary = {
    id: randomUUID(),
    familyId,
    childProfileId,
    type: input.type,
    subject: input.subject,
    title: input.title,
    description: input.description,
    date: input.date,
    recurrencePattern: input.recurrencePattern ?? "none",
    recurrenceUntilDate:
      input.recurrencePattern && input.recurrencePattern !== "none"
        ? input.recurrenceUntilDate ?? null
        : null,
    recurrenceGroupId: input.recurrenceGroupId ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.entries.push(created);
  persistStoresToDisk();
  return created;
}

export function deleteDemoSchoolDiaryEntry(familyId: string, entryId: string): boolean {
  const store = getStore(familyId);
  const before = store.entries.length;
  store.entries = store.entries.filter((entry) => entry.id !== entryId);
  store.checklistInstances = store.checklistInstances.filter((instance) => instance.diaryEntryId !== entryId);
  if (before === store.entries.length) {
    return false;
  }
  persistStoresToDisk();
  return true;
}

export function listDemoChecklistTemplates(familyId: string): ChecklistTemplateSummary[] {
  return getStore(familyId).checklistTemplates
    .slice()
    .sort((left, right) => left.type.localeCompare(right.type) || left.label.localeCompare(right.label))
    .map((template) => ({
      id: template.id,
      familyId: template.familyId,
      type: template.type,
      label: template.label,
      description: template.description,
      isDefault: template.isDefault,
      items: template.items.slice().sort((left, right) => left.sortOrder - right.sortOrder),
    }));
}

export function upsertDemoChecklistTemplate(
  familyId: string,
  input: {
    type: ChecklistTemplateSummary["type"];
    label: string;
    description: string | null;
    isDefault: boolean;
  },
  templateId?: string,
): ChecklistTemplateSummary {
  const store = getStore(familyId);
  const existing = templateId
    ? store.checklistTemplates.find((template) => template.id === templateId)
    : undefined;

  if (input.isDefault) {
    store.checklistTemplates.forEach((template) => {
      if (template.type === input.type) {
        template.isDefault = false;
      }
    });
  }

  if (existing) {
    existing.type = input.type;
    existing.label = input.label;
    existing.description = input.description;
    existing.isDefault = input.isDefault;
    persistStoresToDisk();
    return {
      id: existing.id,
      familyId: existing.familyId,
      type: existing.type,
      label: existing.label,
      description: existing.description,
      isDefault: existing.isDefault,
      items: existing.items.slice().sort((left, right) => left.sortOrder - right.sortOrder),
    };
  }

  const created: DemoChecklistTemplateRecord = {
    id: randomUUID(),
    familyId,
    type: input.type,
    label: input.label,
    description: input.description,
    isDefault: input.isDefault,
    items: [],
  };

  store.checklistTemplates.push(created);
  persistStoresToDisk();

  return {
    id: created.id,
    familyId: created.familyId,
    type: created.type,
    label: created.label,
    description: created.description,
    isDefault: created.isDefault,
    items: [],
  };
}

export function deleteDemoChecklistTemplate(familyId: string, templateId: string): boolean {
  const store = getStore(familyId);
  const before = store.checklistTemplates.length;
  store.checklistTemplates = store.checklistTemplates.filter((template) => template.id !== templateId);
  if (before === store.checklistTemplates.length) {
    return false;
  }
  persistStoresToDisk();
  return true;
}

export function addDemoChecklistTemplateItem(
  familyId: string,
  templateId: string,
  label: string,
): ChecklistTemplateSummary["items"][number] | null {
  const store = getStore(familyId);
  const template = store.checklistTemplates.find((entry) => entry.id === templateId);
  if (!template) {
    return null;
  }

  const created = {
    id: randomUUID(),
    templateId,
    label,
    sortOrder: template.items.length,
  };

  template.items.push(created);
  persistStoresToDisk();
  return created;
}

export function updateDemoChecklistTemplateItem(
  familyId: string,
  itemId: string,
  label: string,
): ChecklistTemplateSummary["items"][number] | null {
  const store = getStore(familyId);

  for (const template of store.checklistTemplates) {
    const item = template.items.find((entry) => entry.id === itemId);
    if (!item) {
      continue;
    }
    item.label = label;
    persistStoresToDisk();
    return item;
  }

  return null;
}

export function moveDemoChecklistTemplateItem(
  familyId: string,
  itemId: string,
  direction: "up" | "down",
): boolean {
  const store = getStore(familyId);

  for (const template of store.checklistTemplates) {
    const sorted = template.items.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const currentIndex = sorted.findIndex((entry) => entry.id === itemId);
    if (currentIndex < 0) {
      continue;
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) {
      return true;
    }

    const current = sorted[currentIndex];
    const swap = sorted[swapIndex];
    if (!current || !swap) {
      return false;
    }

    const currentOrder = current.sortOrder;
    current.sortOrder = swap.sortOrder;
    swap.sortOrder = currentOrder;

    sorted
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .forEach((item, index) => {
        item.sortOrder = index;
      });

    template.items = sorted;
    persistStoresToDisk();
    return true;
  }

  return false;
}

export function deleteDemoChecklistTemplateItem(familyId: string, itemId: string): boolean {
  const store = getStore(familyId);

  for (const template of store.checklistTemplates) {
    const before = template.items.length;
    template.items = template.items.filter((entry) => entry.id !== itemId);
    if (before !== template.items.length) {
      template.items
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .forEach((item, index) => {
          item.sortOrder = index;
        });
      persistStoresToDisk();
      return true;
    }
  }

  return false;
}

export function upsertDemoChecklistInstanceForDiaryEntry(
  familyId: string,
  childProfileId: string,
  diaryEntryId: string,
  draft: {
    type: string;
    label: string;
    date: string;
    items: Array<{ label: string; sortOrder: number }>;
  },
): ChecklistInstanceSummary {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  const existing = store.checklistInstances.find((instance) => instance.diaryEntryId === diaryEntryId);
  if (existing) {
    const previousCheckedByLabel = new Map(
      existing.items.map((item) => [item.label.toLowerCase(), item.isChecked]),
    );
    existing.type = draft.type;
    existing.label = draft.label;
    existing.date = draft.date;
    existing.items = draft.items.map((item, index) => ({
      id: randomUUID(),
      checklistInstanceId: existing.id,
      label: item.label,
      isChecked: previousCheckedByLabel.get(item.label.toLowerCase()) ?? false,
      sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
    }));
    persistStoresToDisk();
    return {
      id: existing.id,
      familyId: existing.familyId,
      childProfileId: existing.childProfileId,
      diaryEntryId: existing.diaryEntryId,
      type: existing.type,
      label: existing.label,
      date: existing.date,
      createdAt: existing.createdAt,
      items: existing.items.slice().sort((left, right) => left.sortOrder - right.sortOrder),
    };
  }

  const created: DemoChecklistInstanceRecord = {
    id: randomUUID(),
    familyId,
    childProfileId,
    diaryEntryId,
    type: draft.type,
    label: draft.label,
    date: draft.date,
    createdAt: nowIso,
    items: draft.items.map((item, index) => ({
      id: randomUUID(),
      checklistInstanceId: "",
      label: item.label,
      isChecked: false,
      sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
    })),
  };
  created.items = created.items.map((item) => ({ ...item, checklistInstanceId: created.id }));

  store.checklistInstances.push(created);
  persistStoresToDisk();

  return {
    id: created.id,
    familyId: created.familyId,
    childProfileId: created.childProfileId,
    diaryEntryId: created.diaryEntryId,
    type: created.type,
    label: created.label,
    date: created.date,
    createdAt: created.createdAt,
    items: created.items.slice().sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

export function deleteDemoChecklistInstanceByDiaryEntry(familyId: string, diaryEntryId: string): boolean {
  const store = getStore(familyId);
  const before = store.checklistInstances.length;
  store.checklistInstances = store.checklistInstances.filter(
    (instance) => instance.diaryEntryId !== diaryEntryId,
  );
  if (before === store.checklistInstances.length) {
    return false;
  }
  persistStoresToDisk();
  return true;
}

export function listDemoChecklistInstancesByDates(
  familyId: string,
  childProfileId: string,
  dates: string[],
): ChecklistInstanceSummary[] {
  const dateSet = new Set(dates);
  return getStore(familyId).checklistInstances
    .filter((instance) => instance.childProfileId === childProfileId && dateSet.has(instance.date))
    .sort((left, right) => left.date.localeCompare(right.date) || left.label.localeCompare(right.label))
    .map((instance) => ({
      id: instance.id,
      familyId: instance.familyId,
      childProfileId: instance.childProfileId,
      diaryEntryId: instance.diaryEntryId,
      type: instance.type,
      label: instance.label,
      date: instance.date,
      createdAt: instance.createdAt,
      items: instance.items.slice().sort((left, right) => left.sortOrder - right.sortOrder),
    }));
}

export function toggleDemoChecklistItem(
  familyId: string,
  childProfileId: string,
  itemId: string,
  isChecked: boolean,
): ChecklistInstanceSummary | null {
  const store = getStore(familyId);

  for (const instance of store.checklistInstances) {
    if (instance.childProfileId !== childProfileId) {
      continue;
    }

    const item = instance.items.find((entry) => entry.id === itemId);
    if (!item) {
      continue;
    }

    item.isChecked = isChecked;
    persistStoresToDisk();

    return {
      id: instance.id,
      familyId: instance.familyId,
      childProfileId: instance.childProfileId,
      diaryEntryId: instance.diaryEntryId,
      type: instance.type,
      label: instance.label,
      date: instance.date,
      createdAt: instance.createdAt,
      items: instance.items.slice().sort((left, right) => left.sortOrder - right.sortOrder),
    };
  }

  return null;
}

export function ensureDemoNotificationRules(
  familyId: string,
  childProfileId: string,
): NotificationRuleSummary[] {
  const store = getStore(familyId);
  const existing = store.notificationRules.filter((entry) => entry.childProfileId === childProfileId);
  if (existing.length > 0) {
    return existing;
  }

  const defaults: DemoNotificationRuleRecord[] = [
    {
      id: randomUUID(),
      familyId,
      childProfileId,
      type: "rappel_devoir",
      channel: "both",
      timeOfDay: "18:00",
      enabled: true,
    },
    {
      id: randomUUID(),
      familyId,
      childProfileId,
      type: "rappel_checklist",
      channel: "both",
      timeOfDay: "18:30",
      enabled: true,
    },
    {
      id: randomUUID(),
      familyId,
      childProfileId,
      type: "rappel_journee",
      channel: "in_app",
      timeOfDay: "07:00",
      enabled: true,
    },
  ];

  store.notificationRules.push(...defaults);
  persistStoresToDisk();

  return defaults;
}

export function listDemoNotificationRules(
  familyId: string,
  childProfileId: string,
): NotificationRuleSummary[] {
  const rules = ensureDemoNotificationRules(familyId, childProfileId);
  return rules
    .slice()
    .sort((left, right) => left.type.localeCompare(right.type))
    .map((rule) => ({ ...rule }));
}

export function updateDemoNotificationRule(
  familyId: string,
  ruleId: string,
  patch: Partial<Pick<NotificationRuleSummary, "channel" | "timeOfDay" | "enabled">>,
): NotificationRuleSummary | null {
  const store = getStore(familyId);
  const rule = store.notificationRules.find((entry) => entry.id === ruleId);
  if (!rule) {
    return null;
  }

  if (patch.channel) {
    rule.channel = patch.channel;
  }
  if (patch.timeOfDay) {
    rule.timeOfDay = patch.timeOfDay;
  }
  if (typeof patch.enabled === "boolean") {
    rule.enabled = patch.enabled;
  }

  persistStoresToDisk();
  return { ...rule };
}

export function listDemoInAppNotifications(
  familyId: string,
  childProfileId: string,
): InAppNotificationSummary[] {
  return getStore(familyId).notifications
    .filter((entry) => entry.childProfileId === childProfileId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((entry) => ({
      id: entry.id,
      familyId: entry.familyId,
      childProfileId: entry.childProfileId,
      type: entry.type,
      title: entry.title,
      message: entry.message,
      linkUrl: entry.linkUrl,
      isRead: entry.isRead,
      createdAt: entry.createdAt,
    }));
}

export function createDemoInAppNotification(
  familyId: string,
  payload: {
    childProfileId: string;
    type: InAppNotificationSummary["type"];
    title: string;
    message: string;
    linkUrl?: string | null;
  },
): InAppNotificationSummary {
  const store = getStore(familyId);
  const created: DemoInAppNotificationRecord = {
    id: randomUUID(),
    familyId,
    childProfileId: payload.childProfileId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    linkUrl: payload.linkUrl ?? null,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  store.notifications.push(created);
  persistStoresToDisk();

  return {
    id: created.id,
    familyId: created.familyId,
    childProfileId: created.childProfileId,
    type: created.type,
    title: created.title,
    message: created.message,
    linkUrl: created.linkUrl,
    isRead: created.isRead,
    createdAt: created.createdAt,
  };
}

export function markDemoNotificationRead(
  familyId: string,
  notificationId: string,
  childProfileId: string,
): InAppNotificationSummary | null {
  const store = getStore(familyId);
  const notification = store.notifications.find(
    (entry) => entry.id === notificationId && entry.childProfileId === childProfileId,
  );
  if (!notification) {
    return null;
  }

  notification.isRead = true;
  persistStoresToDisk();

  return {
    id: notification.id,
    familyId: notification.familyId,
    childProfileId: notification.childProfileId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    linkUrl: notification.linkUrl,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}

export function getDemoUnreadNotificationsCount(
  familyId: string,
  childProfileId: string,
): number {
  return getStore(familyId).notifications.filter(
    (entry) => entry.childProfileId === childProfileId && !entry.isRead,
  ).length;
}

export function upsertDemoPushSubscription(
  familyId: string,
  payload: {
    childProfileId: string;
    profileId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
  },
): DemoPushSubscriptionRecord {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  const existing = store.pushSubscriptions.find((entry) => entry.endpoint === payload.endpoint);
  if (existing) {
    existing.childProfileId = payload.childProfileId;
    existing.profileId = payload.profileId;
    existing.p256dh = payload.p256dh;
    existing.auth = payload.auth;
    existing.userAgent = payload.userAgent;
    existing.updatedAt = nowIso;
    persistStoresToDisk();
    return existing;
  }

  const created: DemoPushSubscriptionRecord = {
    id: randomUUID(),
    familyId,
    childProfileId: payload.childProfileId,
    profileId: payload.profileId,
    endpoint: payload.endpoint,
    p256dh: payload.p256dh,
    auth: payload.auth,
    userAgent: payload.userAgent,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.pushSubscriptions.push(created);
  persistStoresToDisk();
  return created;
}

export function listDemoPushSubscriptions(
  familyId: string,
  childProfileId: string,
): DemoPushSubscriptionRecord[] {
  return getStore(familyId).pushSubscriptions.filter((entry) => entry.childProfileId === childProfileId);
}
