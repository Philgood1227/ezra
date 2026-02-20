import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  DayTemplateBlockInput,
  DayTemplateBlockSummary,
  SchoolPeriodInput,
  SchoolPeriodSummary,
  TaskCategorySummary,
  TemplateSummary,
  TemplateTaskSummary,
} from "@/lib/day-templates/types";
import { sortTemplateTasks } from "@/lib/day-templates/timeline";
import { normalizeTimeLabel } from "@/lib/day-templates/time";

interface DemoTaskRecord extends Omit<TemplateTaskSummary, "category"> {
  familyId: string;
}

interface DemoStore {
  categories: TaskCategorySummary[];
  templates: TemplateSummary[];
  tasks: DemoTaskRecord[];
  blocks: DayTemplateBlockSummary[];
  schoolPeriods: SchoolPeriodSummary[];
}

type PartialDemoStore = Partial<DemoStore>;
type StoresByFamily = Record<string, PartialDemoStore>;

const stores = new Map<string, DemoStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-day-templates-store.json");
const SHOULD_PERSIST_TO_DISK = process.env.NODE_ENV !== "test" && process.env.VITEST !== "true" && process.env.VITEST !== "1";

function ensureStoreDir(): void {
  mkdirSync(path.dirname(STORE_FILE_PATH), { recursive: true });
}

function normalizeStore(store: PartialDemoStore | undefined): DemoStore {
  return {
    categories: store?.categories ?? [],
    templates: store?.templates ?? [],
    tasks: store?.tasks ?? [],
    blocks: store?.blocks ?? [],
    schoolPeriods: store?.schoolPeriods ?? [],
  };
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

    const parsed = JSON.parse(raw) as StoresByFamily;
    return parsed;
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
  Object.entries(persisted).forEach(([familyId, rawStore]) => {
    stores.set(familyId, normalizeStore(rawStore));
  });
}

function persistStoresToDisk(): void {
  if (!SHOULD_PERSIST_TO_DISK) {
    return;
  }

  ensureStoreDir();
  const serialized: Record<string, DemoStore> = {};
  stores.forEach((store, familyId) => {
    serialized[familyId] = store;
  });
  writeFileSync(STORE_FILE_PATH, JSON.stringify(serialized), "utf8");
}

function getStore(familyId: string): DemoStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      categories: [],
      templates: [],
      tasks: [],
      blocks: [],
      schoolPeriods: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }
  return store;
}

export function resetDemoDayTemplatesStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

function rebuildTaskSortOrder(store: DemoStore, templateId: string): void {
  const ordered = store.tasks
    .filter((task) => task.templateId === templateId)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  ordered.forEach((task, index) => {
    task.sortOrder = index;
  });
}

function rebuildBlockSortOrder(store: DemoStore, templateId: string): void {
  const ordered = store.blocks
    .filter((block) => block.dayTemplateId === templateId)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }

      return left.sortOrder - right.sortOrder;
    });

  ordered.forEach((block, index) => {
    block.sortOrder = index;
  });
}

function getDemoAssignee(profileId: string | null | undefined): {
  displayName: string | null;
  role: "parent" | "child" | "viewer" | null;
} {
  if (!profileId) {
    return { displayName: null, role: null };
  }

  if (profileId === "dev-child-id") {
    return { displayName: "Ezra", role: "child" };
  }

  if (profileId === "dev-parent-id") {
    return { displayName: "Parent Demo", role: "parent" };
  }

  return { displayName: "Parent", role: "parent" };
}

export function listDemoCategories(familyId: string): TaskCategorySummary[] {
  return [...getStore(familyId).categories].sort((left, right) => left.name.localeCompare(right.name));
}

export function createDemoCategory(
  familyId: string,
  input: Omit<TaskCategorySummary, "id" | "familyId">,
): TaskCategorySummary {
  const store = getStore(familyId);
  const category: TaskCategorySummary = {
    id: randomUUID(),
    familyId,
    name: input.name,
    icon: input.icon,
    colorKey: input.colorKey,
    defaultItemKind: input.defaultItemKind ?? null,
  };
  store.categories.push(category);
  persistStoresToDisk();
  return category;
}

export function updateDemoCategory(
  familyId: string,
  categoryId: string,
  input: Omit<TaskCategorySummary, "id" | "familyId">,
): TaskCategorySummary | null {
  const store = getStore(familyId);
  const category = store.categories.find((entry) => entry.id === categoryId);
  if (!category) {
    return null;
  }

  category.name = input.name;
  category.icon = input.icon;
  category.colorKey = input.colorKey;
  category.defaultItemKind = input.defaultItemKind ?? null;
  persistStoresToDisk();
  return category;
}

export function deleteDemoCategory(
  familyId: string,
  categoryId: string,
): { success: boolean; error?: string } {
  const store = getStore(familyId);
  const isUsed = store.tasks.some((task) => task.categoryId === categoryId);
  if (isUsed) {
    return { success: false, error: "Cette categorie est utilisee dans une journee type." };
  }

  store.categories = store.categories.filter((entry) => entry.id !== categoryId);
  persistStoresToDisk();
  return { success: true };
}

export function listDemoTemplates(familyId: string): TemplateSummary[] {
  return [...getStore(familyId).templates].sort((left, right) => {
    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday;
    }
    return left.name.localeCompare(right.name);
  });
}

export function upsertDemoTemplate(
  familyId: string,
  input: { id?: string; name: string; weekday: number; isDefault: boolean },
): TemplateSummary {
  const store = getStore(familyId);
  const existing = input.id ? store.templates.find((template) => template.id === input.id) : undefined;

  if (input.isDefault) {
    store.templates.forEach((template) => {
      if (template.weekday === input.weekday) {
        template.isDefault = false;
      }
    });
  }

  if (existing) {
    existing.name = input.name;
    existing.weekday = input.weekday;
    existing.isDefault = input.isDefault;
    persistStoresToDisk();
    return existing;
  }

  const created: TemplateSummary = {
    id: randomUUID(),
    familyId,
    name: input.name,
    weekday: input.weekday,
    isDefault: input.isDefault,
  };
  store.templates.push(created);
  persistStoresToDisk();
  return created;
}

export function deleteDemoTemplate(familyId: string, templateId: string): void {
  const store = getStore(familyId);
  store.templates = store.templates.filter((template) => template.id !== templateId);
  store.tasks = store.tasks.filter((task) => task.templateId !== templateId);
  store.blocks = store.blocks.filter((block) => block.dayTemplateId !== templateId);
  persistStoresToDisk();
}

export function listDemoTemplateTasks(familyId: string, templateId: string): TemplateTaskSummary[] {
  const store = getStore(familyId);

  const mapped: TemplateTaskSummary[] = [];

  store.tasks
    .filter((task) => task.familyId === familyId && task.templateId === templateId)
    .forEach((task) => {
      const category = store.categories.find((entry) => entry.id === task.categoryId);
      if (!category) {
        return;
      }
      const assignee = getDemoAssignee(task.assignedProfileId);

      mapped.push({
        id: task.id,
        templateId: task.templateId,
        categoryId: task.categoryId,
        itemKind: task.itemKind ?? category.defaultItemKind ?? "mission",
        itemSubkind: task.itemSubkind ?? null,
        assignedProfileId: task.assignedProfileId ?? null,
        assignedProfileDisplayName: assignee.displayName,
        assignedProfileRole: assignee.role,
        title: task.title,
        description: task.description,
        startTime: task.startTime,
        endTime: task.endTime,
        sortOrder: task.sortOrder,
        pointsBase: task.pointsBase,
        knowledgeCardId: task.knowledgeCardId ?? null,
        knowledgeCardTitle: null,
        category,
      });
    });

  return sortTemplateTasks(mapped) as TemplateTaskSummary[];
}

export function createDemoTemplateTask(
  familyId: string,
  templateId: string,
  input: Omit<TemplateTaskSummary, "id" | "templateId" | "sortOrder" | "category"> & {
    categoryId: string;
  },
): TemplateTaskSummary | null {
  const store = getStore(familyId);
  const category = store.categories.find((entry) => entry.id === input.categoryId);
  if (!category) {
    return null;
  }

  const nextOrder =
    store.tasks
      .filter((task) => task.templateId === templateId)
      .reduce((maxOrder, task) => Math.max(maxOrder, task.sortOrder), -1) + 1;

  const createdTask: DemoTaskRecord = {
    id: randomUUID(),
    familyId,
    templateId,
    categoryId: input.categoryId,
    itemKind: input.itemKind ?? category.defaultItemKind ?? "mission",
    itemSubkind: input.itemSubkind ?? null,
    assignedProfileId: input.assignedProfileId ?? null,
    assignedProfileDisplayName: null,
    assignedProfileRole: null,
    title: input.title,
    description: input.description,
    startTime: normalizeTimeLabel(input.startTime),
    endTime: normalizeTimeLabel(input.endTime),
    sortOrder: nextOrder,
    pointsBase: Math.max(0, Math.trunc(input.pointsBase)),
    knowledgeCardId: input.knowledgeCardId ?? null,
    knowledgeCardTitle: null,
  };

  store.tasks.push(createdTask);
  persistStoresToDisk();

  return {
    ...createdTask,
    category,
  };
}

export function updateDemoTemplateTask(
  familyId: string,
  taskId: string,
  input: Omit<TemplateTaskSummary, "id" | "templateId" | "sortOrder" | "category"> & {
    categoryId: string;
  },
): TemplateTaskSummary | null {
  const store = getStore(familyId);
  const task = store.tasks.find((entry) => entry.id === taskId && entry.familyId === familyId);
  if (!task) {
    return null;
  }

  const category = store.categories.find((entry) => entry.id === input.categoryId);
  if (!category) {
    return null;
  }

  task.categoryId = input.categoryId;
  task.itemKind = input.itemKind ?? category.defaultItemKind ?? task.itemKind ?? "mission";
  task.itemSubkind = input.itemSubkind ?? null;
  task.assignedProfileId = input.assignedProfileId ?? null;
  task.title = input.title;
  task.description = input.description;
  task.startTime = normalizeTimeLabel(input.startTime);
  task.endTime = normalizeTimeLabel(input.endTime);
  task.pointsBase = Math.max(0, Math.trunc(input.pointsBase));
  task.knowledgeCardId = input.knowledgeCardId ?? null;
  persistStoresToDisk();

  return {
    ...task,
    category,
  };
}

export function deleteDemoTemplateTask(familyId: string, taskId: string): void {
  const store = getStore(familyId);
  const task = store.tasks.find((entry) => entry.id === taskId && entry.familyId === familyId);
  if (!task) {
    return;
  }

  const templateId = task.templateId;
  store.tasks = store.tasks.filter((entry) => entry.id !== taskId);
  rebuildTaskSortOrder(store, templateId);
  persistStoresToDisk();
}

export function moveDemoTemplateTask(familyId: string, taskId: string, direction: "up" | "down"): void {
  const store = getStore(familyId);
  const tasks = store.tasks
    .filter((entry) => entry.familyId === familyId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const target = tasks.find((entry) => entry.id === taskId);
  if (!target) {
    return;
  }

  const siblings = store.tasks
    .filter((entry) => entry.templateId === target.templateId)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const currentIndex = siblings.findIndex((entry) => entry.id === taskId);
  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || swapIndex < 0 || swapIndex >= siblings.length) {
    return;
  }

  const current = siblings[currentIndex];
  const swap = siblings[swapIndex];
  if (!current || !swap) {
    return;
  }

  const currentOrder = current.sortOrder;
  current.sortOrder = swap.sortOrder;
  swap.sortOrder = currentOrder;
  rebuildTaskSortOrder(store, target.templateId);
  persistStoresToDisk();
}

export function listDemoTemplateBlocks(familyId: string, templateId: string): DayTemplateBlockSummary[] {
  const store = getStore(familyId);
  const hasTemplate = store.templates.some((template) => template.id === templateId);
  if (!hasTemplate) {
    return [];
  }

  return [...store.blocks]
    .filter((block) => block.dayTemplateId === templateId)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }

      return left.sortOrder - right.sortOrder;
    });
}

export function createDemoTemplateBlock(
  familyId: string,
  templateId: string,
  input: DayTemplateBlockInput,
): DayTemplateBlockSummary | null {
  const store = getStore(familyId);
  const hasTemplate = store.templates.some((template) => template.id === templateId);
  if (!hasTemplate) {
    return null;
  }

  const nextOrder =
    store.blocks
      .filter((block) => block.dayTemplateId === templateId)
      .reduce((maxOrder, block) => Math.max(maxOrder, block.sortOrder), -1) + 1;

  const block: DayTemplateBlockSummary = {
    id: randomUUID(),
    dayTemplateId: templateId,
    blockType: input.blockType,
    label: input.label,
    startTime: normalizeTimeLabel(input.startTime),
    endTime: normalizeTimeLabel(input.endTime),
    sortOrder: nextOrder,
  };

  store.blocks.push(block);
  rebuildBlockSortOrder(store, templateId);
  persistStoresToDisk();
  return block;
}

export function updateDemoTemplateBlock(
  familyId: string,
  blockId: string,
  input: DayTemplateBlockInput,
): DayTemplateBlockSummary | null {
  const store = getStore(familyId);
  const block = store.blocks.find((entry) => entry.id === blockId);
  if (!block) {
    return null;
  }

  const hasTemplate = store.templates.some((template) => template.id === block.dayTemplateId);
  if (!hasTemplate) {
    return null;
  }

  block.blockType = input.blockType;
  block.label = input.label;
  block.startTime = normalizeTimeLabel(input.startTime);
  block.endTime = normalizeTimeLabel(input.endTime);
  rebuildBlockSortOrder(store, block.dayTemplateId);
  persistStoresToDisk();
  return block;
}

export function deleteDemoTemplateBlock(familyId: string, blockId: string): void {
  const store = getStore(familyId);
  const block = store.blocks.find((entry) => entry.id === blockId);
  if (!block) {
    return;
  }

  const hasTemplate = store.templates.some((template) => template.id === block.dayTemplateId);
  if (!hasTemplate) {
    return;
  }

  const templateId = block.dayTemplateId;
  store.blocks = store.blocks.filter((entry) => entry.id !== blockId);
  rebuildBlockSortOrder(store, templateId);
  persistStoresToDisk();
}

export function listDemoSchoolPeriods(familyId: string): SchoolPeriodSummary[] {
  const store = getStore(familyId);
  return [...store.schoolPeriods].sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export function upsertDemoSchoolPeriod(
  familyId: string,
  input: SchoolPeriodInput & { id?: string },
): SchoolPeriodSummary {
  const store = getStore(familyId);
  const existing = input.id ? store.schoolPeriods.find((period) => period.id === input.id) : undefined;

  if (existing) {
    existing.periodType = input.periodType;
    existing.startDate = input.startDate;
    existing.endDate = input.endDate;
    existing.label = input.label;
    persistStoresToDisk();
    return existing;
  }

  const created: SchoolPeriodSummary = {
    id: randomUUID(),
    familyId,
    periodType: input.periodType,
    startDate: input.startDate,
    endDate: input.endDate,
    label: input.label,
  };

  store.schoolPeriods.push(created);
  persistStoresToDisk();
  return created;
}

export function deleteDemoSchoolPeriod(familyId: string, periodId: string): void {
  const store = getStore(familyId);
  store.schoolPeriods = store.schoolPeriods.filter((period) => period.id !== periodId);
  persistStoresToDisk();
}
