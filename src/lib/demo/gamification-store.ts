import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  DailyPointsSummary,
  RewardTierSummary,
  TaskCategorySummary,
  TaskInstanceStatus,
  TaskInstanceSummary,
  TemplateTaskSummary,
} from "@/lib/day-templates/types";
import { resolveTaskInstructionsHtml } from "@/lib/day-templates/instructions";
import { sortTemplateTasks } from "@/lib/day-templates/timeline";

interface DemoTaskInstanceRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  templateTaskId: string;
  assignedProfileId: string | null;
  itemKind: "activity" | "mission" | "leisure";
  itemSubkind: string | null;
  date: string;
  status: TaskInstanceStatus;
  startTime: string;
  endTime: string;
  pointsBase: number;
  pointsEarned: number;
  title: string;
  description: string | null;
  instructionsHtml?: string | null;
  sortOrder: number;
  categoryId: string;
  knowledgeCardId?: string | null;
  knowledgeCardTitle?: string | null;
}

interface DemoDailyPointsRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  date: string;
  pointsTotal: number;
}

interface DemoRewardTierRecord {
  id: string;
  familyId: string;
  label: string;
  description: string | null;
  pointsRequired: number;
  sortOrder: number;
}

interface DemoRewardClaimRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  rewardTierId: string;
  pointsSpent: number;
  claimDate: string;
  claimedAt: string;
}

interface DemoRewardConsumptionRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  rewardTierId: string;
  quantityUsed: number;
  usedDate: string;
  usedAt: string;
}

interface DemoGamificationStore {
  instances: DemoTaskInstanceRecord[];
  dailyPoints: DemoDailyPointsRecord[];
  rewardTiers: DemoRewardTierRecord[];
  rewardClaims: DemoRewardClaimRecord[];
  rewardConsumptions: DemoRewardConsumptionRecord[];
}

type StoresByFamily = Record<string, DemoGamificationStore>;

const stores = new Map<string, DemoGamificationStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-gamification-store.json");
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
    stores.set(familyId, store);
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

function getStore(familyId: string): DemoGamificationStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      instances: [],
      dailyPoints: [],
      rewardTiers: [],
      rewardClaims: [],
      rewardConsumptions: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  if (!Array.isArray(store.rewardClaims)) {
    store.rewardClaims = [];
    persistStoresToDisk();
  }

  if (!Array.isArray(store.rewardConsumptions)) {
    store.rewardConsumptions = [];
    persistStoresToDisk();
  }

  return store;
}

function getDemoRewardAvailableCountForTier(
  store: DemoGamificationStore,
  childProfileId: string,
  rewardTierId: string,
): number {
  const claimedCount = store.rewardClaims.filter(
    (entry) => entry.childProfileId === childProfileId && entry.rewardTierId === rewardTierId,
  ).length;
  const consumedCount = store.rewardConsumptions
    .filter((entry) => entry.childProfileId === childProfileId && entry.rewardTierId === rewardTierId)
    .reduce((total, entry) => total + Math.max(0, Math.trunc(entry.quantityUsed)), 0);

  return Math.max(0, claimedCount - consumedCount);
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

export function resetDemoGamificationStore(familyId?: string): void {
  syncStoresFromDisk();
  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export interface EnsureDemoTaskInstancesInput {
  familyId: string;
  childProfileId: string;
  date: string;
  templateTasks: TemplateTaskSummary[];
}

export function ensureDemoTaskInstancesForDate({
  familyId,
  childProfileId,
  date,
  templateTasks,
}: EnsureDemoTaskInstancesInput): TaskInstanceSummary[] {
  const store = getStore(familyId);
  const existingByTemplateTaskId = new Map(
    store.instances
      .filter(
        (entry) => entry.childProfileId === childProfileId && entry.date === date,
      )
      .map((entry) => [entry.templateTaskId, entry]),
  );

  const sortedTemplateTasks = sortTemplateTasks(templateTasks);
  for (const task of sortedTemplateTasks) {
    if (existingByTemplateTaskId.has(task.id)) {
      continue;
    }

    const record: DemoTaskInstanceRecord = {
      id: randomUUID(),
      familyId,
      childProfileId,
      templateTaskId: task.id,
      assignedProfileId: task.assignedProfileId ?? null,
      itemKind: task.itemKind ?? task.category.defaultItemKind ?? "mission",
      itemSubkind: task.itemSubkind ?? null,
      date,
      status: "a_faire",
      startTime: task.startTime,
      endTime: task.endTime,
      pointsBase: task.pointsBase,
      pointsEarned: 0,
      title: task.title,
      description: task.description,
      instructionsHtml: task.instructionsHtml ?? null,
      sortOrder: task.sortOrder,
      categoryId: task.categoryId,
      knowledgeCardId: task.knowledgeCardId ?? null,
      knowledgeCardTitle: task.knowledgeCardTitle ?? null,
    };

    store.instances.push(record);
  }

  persistStoresToDisk();
  return listDemoTaskInstances(familyId, childProfileId, date, sortedTemplateTasks.map((task) => task.category));
}

export function listDemoTaskInstances(
  familyId: string,
  childProfileId: string,
  date: string,
  categories: TaskCategorySummary[],
): TaskInstanceSummary[] {
  const store = getStore(familyId);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const mapped: Array<TaskInstanceSummary | null> = store.instances
    .filter((entry) => entry.childProfileId === childProfileId && entry.date === date)
    .map((entry) => {
      const category = categoryById.get(entry.categoryId);
      if (!category) {
        return null;
      }
      const assignee = getDemoAssignee(entry.assignedProfileId);

      return {
        id: entry.id,
        familyId: entry.familyId,
        childProfileId: entry.childProfileId,
        templateTaskId: entry.templateTaskId,
        itemKind: entry.itemKind ?? "mission",
        itemSubkind: entry.itemSubkind ?? null,
        assignedProfileId: entry.assignedProfileId ?? null,
        assignedProfileDisplayName: assignee.displayName,
        assignedProfileRole: assignee.role,
        date: entry.date,
        status: entry.status,
        startTime: entry.startTime,
        endTime: entry.endTime,
        pointsBase: entry.pointsBase,
        pointsEarned: entry.pointsEarned,
        title: entry.title,
        description: entry.description,
        instructionsHtml: resolveTaskInstructionsHtml({
          instructionsHtml: entry.instructionsHtml,
          description: entry.description,
        }),
        sortOrder: entry.sortOrder,
        knowledgeCardId: entry.knowledgeCardId ?? null,
        knowledgeCardTitle: entry.knowledgeCardTitle ?? null,
        category,
      };
    });

  return mapped
    .filter((entry): entry is TaskInstanceSummary => entry !== null)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }

      return left.sortOrder - right.sortOrder;
    });
}

export function getDemoTaskInstanceById(
  familyId: string,
  instanceId: string,
  categories: TaskCategorySummary[],
): TaskInstanceSummary | null {
  const store = getStore(familyId);
  const instance = store.instances.find((entry) => entry.id === instanceId);
  if (!instance) {
    return null;
  }

  const category = categories.find((entry) => entry.id === instance.categoryId);
  if (!category) {
    return null;
  }
  const assignee = getDemoAssignee(instance.assignedProfileId);

  return {
    id: instance.id,
    familyId: instance.familyId,
    childProfileId: instance.childProfileId,
    templateTaskId: instance.templateTaskId,
    itemKind: instance.itemKind ?? "mission",
    itemSubkind: instance.itemSubkind ?? null,
    assignedProfileId: instance.assignedProfileId ?? null,
    assignedProfileDisplayName: assignee.displayName,
    assignedProfileRole: assignee.role,
    date: instance.date,
    status: instance.status,
    startTime: instance.startTime,
    endTime: instance.endTime,
    pointsBase: instance.pointsBase,
    pointsEarned: instance.pointsEarned,
    title: instance.title,
    description: instance.description,
    instructionsHtml: resolveTaskInstructionsHtml({
      instructionsHtml: instance.instructionsHtml,
      description: instance.description,
    }),
    sortOrder: instance.sortOrder,
    knowledgeCardId: instance.knowledgeCardId ?? null,
    knowledgeCardTitle: instance.knowledgeCardTitle ?? null,
    category,
  };
}

export function updateDemoTaskInstance(
  familyId: string,
  instanceId: string,
  patch: Partial<Pick<DemoTaskInstanceRecord, "status" | "pointsEarned">>,
): DemoTaskInstanceRecord | null {
  const store = getStore(familyId);
  const instance = store.instances.find((entry) => entry.id === instanceId);
  if (!instance) {
    return null;
  }

  if (patch.status) {
    instance.status = patch.status;
  }

  if (typeof patch.pointsEarned === "number") {
    instance.pointsEarned = patch.pointsEarned;
  }

  persistStoresToDisk();
  return instance;
}

export function getOrCreateDemoDailyPoints(
  familyId: string,
  childProfileId: string,
  date: string,
): DailyPointsSummary {
  const store = getStore(familyId);
  const existing = store.dailyPoints.find(
    (entry) => entry.childProfileId === childProfileId && entry.date === date,
  );
  if (existing) {
    return {
      id: existing.id,
      familyId: existing.familyId,
      childProfileId: existing.childProfileId,
      date: existing.date,
      pointsTotal: existing.pointsTotal,
    };
  }

  const created: DemoDailyPointsRecord = {
    id: randomUUID(),
    familyId,
    childProfileId,
    date,
    pointsTotal: 0,
  };
  store.dailyPoints.push(created);
  persistStoresToDisk();
  return {
    id: created.id,
    familyId: created.familyId,
    childProfileId: created.childProfileId,
    date: created.date,
    pointsTotal: created.pointsTotal,
  };
}

export function incrementDemoDailyPoints(
  familyId: string,
  childProfileId: string,
  date: string,
  delta: number,
): DailyPointsSummary {
  const store = getStore(familyId);
  const current = getOrCreateDemoDailyPoints(familyId, childProfileId, date);
  const existing = store.dailyPoints.find((entry) => entry.id === current.id);
  if (!existing) {
    return current;
  }

  existing.pointsTotal = Math.max(0, existing.pointsTotal + Math.max(0, Math.trunc(delta)));
  persistStoresToDisk();
  return {
    id: existing.id,
    familyId: existing.familyId,
    childProfileId: existing.childProfileId,
    date: existing.date,
    pointsTotal: existing.pointsTotal,
  };
}

export function listDemoRewardTiers(familyId: string): RewardTierSummary[] {
  const store = getStore(familyId);
  return [...store.rewardTiers]
    .sort((left, right) => {
      if (left.pointsRequired !== right.pointsRequired) {
        return left.pointsRequired - right.pointsRequired;
      }
      return left.sortOrder - right.sortOrder;
    })
    .map((entry) => ({
      id: entry.id,
      familyId: entry.familyId,
      label: entry.label,
      description: entry.description,
      pointsRequired: entry.pointsRequired,
      sortOrder: entry.sortOrder,
    }));
}

export function upsertDemoRewardTier(
  familyId: string,
  input: {
    id?: string;
    label: string;
    description: string | null;
    pointsRequired: number;
    sortOrder: number;
  },
): RewardTierSummary {
  const store = getStore(familyId);
  const existing = input.id ? store.rewardTiers.find((entry) => entry.id === input.id) : undefined;
  if (existing) {
    existing.label = input.label;
    existing.description = input.description;
    existing.pointsRequired = Math.max(0, Math.trunc(input.pointsRequired));
    existing.sortOrder = Math.max(0, Math.trunc(input.sortOrder));
    persistStoresToDisk();
    return {
      id: existing.id,
      familyId: existing.familyId,
      label: existing.label,
      description: existing.description,
      pointsRequired: existing.pointsRequired,
      sortOrder: existing.sortOrder,
    };
  }

  const created: DemoRewardTierRecord = {
    id: randomUUID(),
    familyId,
    label: input.label,
    description: input.description,
    pointsRequired: Math.max(0, Math.trunc(input.pointsRequired)),
    sortOrder: Math.max(0, Math.trunc(input.sortOrder)),
  };
  store.rewardTiers.push(created);
  persistStoresToDisk();
  return {
    id: created.id,
    familyId: created.familyId,
    label: created.label,
    description: created.description,
    pointsRequired: created.pointsRequired,
    sortOrder: created.sortOrder,
  };
}

export function deleteDemoRewardTier(familyId: string, rewardTierId: string): boolean {
  const store = getStore(familyId);
  const countBefore = store.rewardTiers.length;
  store.rewardTiers = store.rewardTiers.filter((entry) => entry.id !== rewardTierId);
  if (store.rewardTiers.length === countBefore) {
    return false;
  }
  persistStoresToDisk();
  return true;
}

export interface DemoRewardClaimsSnapshot {
  spentToday: number;
  historyByRewardTier: Record<
    string,
    {
      count: number;
      lastClaimedAt: string;
    }
  >;
}

export interface DemoRewardStarsBalance {
  earnedStarsTotal: number;
  spentStarsTotal: number;
  availableStars: number;
}

export function getDemoRewardStarsBalance(
  familyId: string,
  childProfileId: string,
): DemoRewardStarsBalance {
  const store = getStore(familyId);
  const earnedStarsTotal = store.dailyPoints
    .filter((entry) => entry.childProfileId === childProfileId)
    .reduce((total, entry) => total + Math.max(0, Math.trunc(entry.pointsTotal)), 0);
  const spentStarsTotal = store.rewardClaims
    .filter((entry) => entry.childProfileId === childProfileId)
    .reduce((total, entry) => total + Math.max(0, Math.trunc(entry.pointsSpent)), 0);

  return {
    earnedStarsTotal,
    spentStarsTotal,
    availableStars: Math.max(0, earnedStarsTotal - spentStarsTotal),
  };
}

export function creditDemoRewardStars(
  familyId: string,
  childProfileId: string,
  date: string,
  starsToAdd: number,
): DemoRewardStarsBalance {
  incrementDemoDailyPoints(familyId, childProfileId, date, starsToAdd);
  return getDemoRewardStarsBalance(familyId, childProfileId);
}

export function getDemoRewardClaimsSnapshot(
  familyId: string,
  childProfileId: string,
  date: string,
): DemoRewardClaimsSnapshot {
  const store = getStore(familyId);
  const historyByRewardTier: DemoRewardClaimsSnapshot["historyByRewardTier"] = {};
  let spentToday = 0;

  const claims = [...store.rewardClaims]
    .filter((entry) => entry.childProfileId === childProfileId)
    .sort((left, right) => right.claimedAt.localeCompare(left.claimedAt));
  const consumedByRewardTier = new Map<string, number>();
  for (const consumption of store.rewardConsumptions) {
    if (consumption.childProfileId !== childProfileId) {
      continue;
    }
    consumedByRewardTier.set(
      consumption.rewardTierId,
      (consumedByRewardTier.get(consumption.rewardTierId) ?? 0) +
        Math.max(0, Math.trunc(consumption.quantityUsed)),
    );
  }

  for (const claim of claims) {
    if (claim.claimDate === date) {
      spentToday += claim.pointsSpent;
    }

    const existing = historyByRewardTier[claim.rewardTierId];
    if (!existing) {
      historyByRewardTier[claim.rewardTierId] = {
        count: 1,
        lastClaimedAt: claim.claimedAt,
      };
      continue;
    }

    historyByRewardTier[claim.rewardTierId] = {
      count: existing.count + 1,
      lastClaimedAt: existing.lastClaimedAt,
    };
  }

  for (const [rewardTierId, consumedCount] of consumedByRewardTier.entries()) {
    const existing = historyByRewardTier[rewardTierId];
    if (!existing) {
      continue;
    }
    historyByRewardTier[rewardTierId] = {
      count: Math.max(0, existing.count - consumedCount),
      lastClaimedAt: existing.lastClaimedAt,
    };
  }

  return {
    spentToday: Math.max(0, Math.trunc(spentToday)),
    historyByRewardTier,
  };
}

export interface ClaimDemoRewardInput {
  familyId: string;
  childProfileId: string;
  rewardTierId: string;
  date: string;
}

export interface ClaimDemoRewardResult {
  rewardTierId: string;
  rewardLabel: string;
  pointsSpent: number;
  claimedAt: string;
  usageCount: number;
  spentToday: number;
  dailyPointsTotal: number;
  remainingStars: number;
}

export interface ConsumeDemoRewardInput {
  familyId: string;
  childProfileId: string;
  rewardTierId: string;
  quantity: number;
  date: string;
}

export interface ConsumeDemoRewardResult {
  rewardTierId: string;
  quantityUsed: number;
  remainingQuantity: number;
  usedAt: string;
}

export function claimDemoReward(input: ClaimDemoRewardInput): ClaimDemoRewardResult | null {
  const store = getStore(input.familyId);
  const rewardTier = store.rewardTiers.find((entry) => entry.id === input.rewardTierId);
  if (!rewardTier) {
    return null;
  }

  getOrCreateDemoDailyPoints(input.familyId, input.childProfileId, input.date);
  const snapshot = getDemoRewardClaimsSnapshot(input.familyId, input.childProfileId, input.date);
  const balance = getDemoRewardStarsBalance(input.familyId, input.childProfileId);
  const availableStars = balance.availableStars;

  if (rewardTier.pointsRequired > availableStars) {
    return null;
  }

  const claimedAt = new Date().toISOString();
  const pointsSpent = Math.max(0, Math.trunc(rewardTier.pointsRequired));
  const claim: DemoRewardClaimRecord = {
    id: randomUUID(),
    familyId: input.familyId,
    childProfileId: input.childProfileId,
    rewardTierId: rewardTier.id,
    pointsSpent,
    claimDate: input.date,
    claimedAt,
  };

  store.rewardClaims.push(claim);
  persistStoresToDisk();

  const usageCount = store.rewardClaims.filter(
    (entry) => entry.childProfileId === input.childProfileId && entry.rewardTierId === input.rewardTierId,
  ).length;
  const consumedCount = store.rewardConsumptions
    .filter((entry) => entry.childProfileId === input.childProfileId && entry.rewardTierId === input.rewardTierId)
    .reduce((total, entry) => total + Math.max(0, Math.trunc(entry.quantityUsed)), 0);
  const availableCount = Math.max(0, usageCount - consumedCount);

  return {
    rewardTierId: rewardTier.id,
    rewardLabel: rewardTier.label,
    pointsSpent,
    claimedAt,
    usageCount: availableCount,
    spentToday: snapshot.spentToday + pointsSpent,
    dailyPointsTotal: balance.earnedStarsTotal,
    remainingStars: Math.max(0, availableStars - pointsSpent),
  };
}

export function consumeDemoReward(input: ConsumeDemoRewardInput): ConsumeDemoRewardResult | null {
  const store = getStore(input.familyId);
  const rewardTier = store.rewardTiers.find((entry) => entry.id === input.rewardTierId);
  if (!rewardTier) {
    return null;
  }

  const quantity = Math.max(1, Math.trunc(input.quantity));
  const availableBefore = getDemoRewardAvailableCountForTier(
    store,
    input.childProfileId,
    input.rewardTierId,
  );
  if (quantity > availableBefore) {
    return null;
  }

  const usedAt = new Date().toISOString();
  store.rewardConsumptions.push({
    id: randomUUID(),
    familyId: input.familyId,
    childProfileId: input.childProfileId,
    rewardTierId: input.rewardTierId,
    quantityUsed: quantity,
    usedDate: input.date,
    usedAt,
  });
  persistStoresToDisk();

  return {
    rewardTierId: input.rewardTierId,
    quantityUsed: quantity,
    remainingQuantity: Math.max(0, availableBefore - quantity),
    usedAt,
  };
}
