import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AchievementCategorySummary,
  AchievementCondition,
  AchievementInstanceSummary,
  AchievementSummary,
} from "@/lib/day-templates/types";
import {
  DEFAULT_ACHIEVEMENT_CATALOG,
  parseAchievementCondition,
} from "@/lib/domain/achievements";

interface DemoAchievementCategoryRecord {
  id: string;
  familyId: string;
  code: string;
  label: string;
  colorKey: string;
  createdAt: string;
}

interface DemoAchievementRecord {
  id: string;
  categoryId: string;
  code: string;
  label: string;
  description: string | null;
  icon: string;
  autoTrigger: boolean;
  condition: AchievementCondition;
  createdAt: string;
}

interface DemoAchievementInstanceRecord {
  id: string;
  achievementId: string;
  childProfileId: string;
  unlockedAt: string;
}

interface DemoAchievementsStore {
  categories: DemoAchievementCategoryRecord[];
  achievements: DemoAchievementRecord[];
  instances: DemoAchievementInstanceRecord[];
}

type StoresByFamily = Record<string, DemoAchievementsStore>;

const stores = new Map<string, DemoAchievementsStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-achievements-store.json");

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
    stores.set(familyId, {
      categories: store.categories,
      achievements: store.achievements.map((achievement) => {
        const condition = parseAchievementCondition(achievement.condition) ?? {
          type: "daily_points_at_least",
          value: 999999,
        };

        return {
          ...achievement,
          condition,
        };
      }),
      instances: store.instances,
    });
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

function getStore(familyId: string): DemoAchievementsStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = {
      categories: [],
      achievements: [],
      instances: [],
    };
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

export function resetDemoAchievementsStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function ensureDemoAchievementsCatalog(familyId: string): void {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  DEFAULT_ACHIEVEMENT_CATALOG.forEach((seedCategory) => {
    let category = store.categories.find((entry) => entry.code === seedCategory.code);
    if (!category) {
      category = {
        id: randomUUID(),
        familyId,
        code: seedCategory.code,
        label: seedCategory.label,
        colorKey: seedCategory.colorKey,
        createdAt: nowIso,
      };
      store.categories.push(category);
    }

    seedCategory.achievements.forEach((seedAchievement) => {
      const existing = store.achievements.find(
        (achievement) =>
          achievement.categoryId === category!.id && achievement.code === seedAchievement.code,
      );

      if (existing) {
        return;
      }

      store.achievements.push({
        id: randomUUID(),
        categoryId: category.id,
        code: seedAchievement.code,
        label: seedAchievement.label,
        description: seedAchievement.description,
        icon: seedAchievement.icon,
        autoTrigger: seedAchievement.autoTrigger,
        condition: seedAchievement.condition,
        createdAt: nowIso,
      });
    });
  });

  persistStoresToDisk();
}

export function listDemoAchievementCategories(familyId: string): AchievementCategorySummary[] {
  ensureDemoAchievementsCatalog(familyId);
  return getStore(familyId).categories
    .map((category) => ({
      id: category.id,
      familyId: category.familyId,
      code: category.code,
      label: category.label,
      colorKey: category.colorKey,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

export function listDemoAchievements(familyId: string): AchievementSummary[] {
  ensureDemoAchievementsCatalog(familyId);
  return getStore(familyId).achievements
    .map((achievement) => ({
      id: achievement.id,
      categoryId: achievement.categoryId,
      code: achievement.code,
      label: achievement.label,
      description: achievement.description,
      icon: achievement.icon,
      autoTrigger: achievement.autoTrigger,
      condition: achievement.condition,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

export function listDemoAchievementInstances(
  familyId: string,
  childProfileId: string,
): AchievementInstanceSummary[] {
  ensureDemoAchievementsCatalog(familyId);

  return getStore(familyId).instances
    .filter((instance) => instance.childProfileId === childProfileId)
    .map((instance) => ({
      id: instance.id,
      achievementId: instance.achievementId,
      childProfileId: instance.childProfileId,
      unlockedAt: instance.unlockedAt,
    }))
    .sort((left, right) => right.unlockedAt.localeCompare(left.unlockedAt));
}

export function setDemoAchievementAutoTrigger(
  familyId: string,
  achievementId: string,
  enabled: boolean,
): boolean {
  const store = getStore(familyId);
  const achievement = store.achievements.find((entry) => entry.id === achievementId);
  if (!achievement) {
    return false;
  }

  achievement.autoTrigger = enabled;
  persistStoresToDisk();
  return true;
}

export function createDemoAchievementInstance(
  familyId: string,
  childProfileId: string,
  achievementId: string,
): AchievementInstanceSummary | null {
  const store = getStore(familyId);
  const achievement = store.achievements.find((entry) => entry.id === achievementId);
  if (!achievement) {
    return null;
  }

  const existing = store.instances.find(
    (instance) =>
      instance.childProfileId === childProfileId && instance.achievementId === achievementId,
  );

  if (existing) {
    return {
      id: existing.id,
      achievementId: existing.achievementId,
      childProfileId: existing.childProfileId,
      unlockedAt: existing.unlockedAt,
    };
  }

  const created: DemoAchievementInstanceRecord = {
    id: randomUUID(),
    achievementId,
    childProfileId,
    unlockedAt: new Date().toISOString(),
  };

  store.instances.push(created);
  persistStoresToDisk();

  return {
    id: created.id,
    achievementId: created.achievementId,
    childProfileId: created.childProfileId,
    unlockedAt: created.unlockedAt,
  };
}

export function createDemoAchievement(
  familyId: string,
  input: {
    categoryId: string;
    code: string;
    label: string;
    description: string | null;
    icon: string;
    autoTrigger: boolean;
    condition: AchievementCondition;
  },
): AchievementSummary | null {
  const store = getStore(familyId);
  const category = store.categories.find((entry) => entry.id === input.categoryId);
  if (!category) {
    return null;
  }

  const created: DemoAchievementRecord = {
    id: randomUUID(),
    categoryId: input.categoryId,
    code: input.code,
    label: input.label,
    description: input.description,
    icon: input.icon,
    autoTrigger: input.autoTrigger,
    condition: input.condition,
    createdAt: new Date().toISOString(),
  };

  store.achievements.push(created);
  persistStoresToDisk();

  return {
    id: created.id,
    categoryId: created.categoryId,
    code: created.code,
    label: created.label,
    description: created.description,
    icon: created.icon,
    autoTrigger: created.autoTrigger,
    condition: created.condition,
  };
}
