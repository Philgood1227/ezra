import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  EmotionLogInput,
  EmotionLogSummary,
  IngredientInput,
  IngredientSummary,
  MealIngredientInput,
  MealIngredientSummary,
  MealInput,
  MealRatingInput,
  MealRatingSummary,
  MealSummary,
  MealWithRatingSummary,
  RecipeInput,
  RecipeIngredientSummary,
  RecipeSummary,
} from "@/lib/day-templates/types";
import { DEFAULT_INGREDIENT_LIBRARY } from "@/lib/domain/meals";

interface DemoMealRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  date: string;
  mealType: MealSummary["mealType"];
  description: string;
  preparedByLabel: string | null;
  recipeId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoMealRatingRecord {
  id: string;
  mealId: string;
  rating: MealRatingSummary["rating"];
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoEmotionLogRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  date: string;
  moment: EmotionLogSummary["moment"];
  emotion: EmotionLogSummary["emotion"];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoIngredientRecord {
  id: string;
  familyId: string;
  label: string;
  emoji: string;
  defaultUnit: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoRecipeRecord {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoRecipeIngredientRecord {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  sortOrder: number;
  createdAt: string;
}

interface DemoMealIngredientRecord {
  id: string;
  mealId: string;
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  sortOrder: number;
  createdAt: string;
}

interface DemoWellbeingStore {
  meals: DemoMealRecord[];
  mealRatings: DemoMealRatingRecord[];
  emotionLogs: DemoEmotionLogRecord[];
  ingredients: DemoIngredientRecord[];
  recipes: DemoRecipeRecord[];
  recipeIngredients: DemoRecipeIngredientRecord[];
  mealIngredients: DemoMealIngredientRecord[];
}

type StoresByFamily = Record<string, DemoWellbeingStore>;

const stores = new Map<string, DemoWellbeingStore>();
const STORE_FILE_PATH = path.join(process.cwd(), ".tmp", "demo-wellbeing-store.json");
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
    stores.set(familyId, withStoreDefaults(familyId, store));
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

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function ingredientLabelKey(value: string): string {
  return normalizeLabel(value).toLocaleLowerCase("fr");
}

function withStoreDefaults(familyId: string, store: Partial<DemoWellbeingStore>): DemoWellbeingStore {
  const normalized: DemoWellbeingStore = {
    meals: store.meals ?? [],
    mealRatings: store.mealRatings ?? [],
    emotionLogs: store.emotionLogs ?? [],
    ingredients: store.ingredients ?? [],
    recipes: store.recipes ?? [],
    recipeIngredients: store.recipeIngredients ?? [],
    mealIngredients: store.mealIngredients ?? [],
  };

  if (normalized.ingredients.length === 0) {
    const nowIso = new Date().toISOString();
    normalized.ingredients = DEFAULT_INGREDIENT_LIBRARY.map((ingredient) => ({
      id: randomUUID(),
      familyId,
      label: ingredient.label,
      emoji: ingredient.emoji,
      defaultUnit: ingredient.defaultUnit,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
  }

  return normalized;
}

function getStore(familyId: string): DemoWellbeingStore {
  syncStoresFromDisk();
  let store = stores.get(familyId);
  if (!store) {
    store = withStoreDefaults(familyId, {});
    stores.set(familyId, store);
    persistStoresToDisk();
  }

  return store;
}

function mapIngredient(record: DemoIngredientRecord): IngredientSummary {
  return {
    id: record.id,
    familyId: record.familyId,
    label: record.label,
    emoji: record.emoji,
    defaultUnit: record.defaultUnit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapMeal(record: DemoMealRecord, recipeTitle: string | null): MealSummary {
  return {
    id: record.id,
    familyId: record.familyId,
    childProfileId: record.childProfileId,
    date: record.date,
    mealType: record.mealType,
    description: record.description,
    preparedByLabel: record.preparedByLabel ?? null,
    recipeId: record.recipeId,
    recipeTitle,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapMealRating(record: DemoMealRatingRecord): MealRatingSummary {
  return {
    id: record.id,
    mealId: record.mealId,
    rating: record.rating,
    comment: record.comment,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEmotionLog(record: DemoEmotionLogRecord): EmotionLogSummary {
  return {
    id: record.id,
    familyId: record.familyId,
    childProfileId: record.childProfileId,
    date: record.date,
    moment: record.moment,
    emotion: record.emotion,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapMealIngredients(store: DemoWellbeingStore, mealId: string): MealIngredientSummary[] {
  const ingredientById = new Map(store.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  return store.mealIngredients
    .filter((line) => line.mealId === mealId)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .flatMap((line) => {
      const ingredient = ingredientById.get(line.ingredientId);
      if (!ingredient) {
        return [];
      }

      return {
        id: line.id,
        mealId: line.mealId,
        ingredientId: line.ingredientId,
        ingredientLabel: ingredient.label,
        ingredientEmoji: ingredient.emoji,
        quantity: line.quantity,
        unit: line.unit,
        note: line.note,
        sortOrder: line.sortOrder,
      } satisfies MealIngredientSummary;
    });
}

function mapRecipeIngredients(store: DemoWellbeingStore, recipeId: string): RecipeIngredientSummary[] {
  const ingredientById = new Map(store.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  return store.recipeIngredients
    .filter((line) => line.recipeId === recipeId)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .flatMap((line) => {
      const ingredient = ingredientById.get(line.ingredientId);
      if (!ingredient) {
        return [];
      }

      return {
        id: line.id,
        recipeId: line.recipeId,
        ingredientId: line.ingredientId,
        ingredientLabel: ingredient.label,
        ingredientEmoji: ingredient.emoji,
        quantity: line.quantity,
        unit: line.unit,
        sortOrder: line.sortOrder,
      } satisfies RecipeIngredientSummary;
    });
}

function mapRecipe(store: DemoWellbeingStore, recipe: DemoRecipeRecord): RecipeSummary {
  return {
    id: recipe.id,
    familyId: recipe.familyId,
    title: recipe.title,
    description: recipe.description,
    ingredients: mapRecipeIngredients(store, recipe.id),
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

export function resetDemoWellbeingStore(familyId?: string): void {
  syncStoresFromDisk();

  if (familyId) {
    stores.delete(familyId);
    persistStoresToDisk();
    return;
  }

  stores.clear();
  persistStoresToDisk();
}

export function listDemoIngredients(familyId: string): IngredientSummary[] {
  return getStore(familyId).ingredients
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label, "fr"))
    .map((ingredient) => mapIngredient(ingredient));
}

export function createOrGetDemoIngredient(
  familyId: string,
  input: IngredientInput,
): IngredientSummary {
  const store = getStore(familyId);
  const normalizedLabel = normalizeLabel(input.label);
  const key = ingredientLabelKey(normalizedLabel);
  const existing = store.ingredients.find((ingredient) => ingredientLabelKey(ingredient.label) === key);

  if (existing) {
    if (!existing.defaultUnit && input.defaultUnit?.trim()) {
      existing.defaultUnit = input.defaultUnit.trim();
      existing.updatedAt = new Date().toISOString();
      persistStoresToDisk();
    }
    return mapIngredient(existing);
  }

  const nowIso = new Date().toISOString();
  const created: DemoIngredientRecord = {
    id: randomUUID(),
    familyId,
    label: normalizedLabel,
    emoji: input.emoji.trim() || "\u{1F963}",
    defaultUnit: input.defaultUnit?.trim() ? input.defaultUnit.trim() : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.ingredients.push(created);
  persistStoresToDisk();
  return mapIngredient(created);
}

export function getDemoIngredientById(familyId: string, ingredientId: string): IngredientSummary | null {
  const ingredient = getStore(familyId).ingredients.find((entry) => entry.id === ingredientId);
  return ingredient ? mapIngredient(ingredient) : null;
}

export function listDemoRecipes(familyId: string): RecipeSummary[] {
  const store = getStore(familyId);

  return store.recipes
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title, "fr"))
    .map((recipe) => mapRecipe(store, recipe));
}

export function getDemoRecipeById(familyId: string, recipeId: string): RecipeSummary | null {
  const store = getStore(familyId);
  const recipe = store.recipes.find((entry) => entry.id === recipeId);
  return recipe ? mapRecipe(store, recipe) : null;
}

export function createDemoRecipe(
  familyId: string,
  input: RecipeInput,
): RecipeSummary | null {
  const store = getStore(familyId);
  const title = normalizeLabel(input.title);
  if (!title) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const recipe: DemoRecipeRecord = {
    id: randomUUID(),
    familyId,
    title,
    description: input.description?.trim() ? input.description.trim() : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.recipes.push(recipe);

  const lines = input.ingredients.filter((line) => {
    return store.ingredients.some((ingredient) => ingredient.id === line.ingredientId);
  });

  lines.forEach((line, index) => {
    store.recipeIngredients.push({
      id: randomUUID(),
      recipeId: recipe.id,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit?.trim() ? line.unit.trim() : null,
      sortOrder: index,
      createdAt: nowIso,
    });
  });

  persistStoresToDisk();
  return mapRecipe(store, recipe);
}

function normalizeIngredientLines(
  store: DemoWellbeingStore,
  input: MealIngredientInput[] | undefined,
): Array<{ ingredientId: string; quantity: number | null; unit: string | null; note: string | null }> {
  if (!input) {
    return [];
  }

  const validIngredientIds = new Set(store.ingredients.map((ingredient) => ingredient.id));

  return input
    .filter((line) => validIngredientIds.has(line.ingredientId))
    .map((line) => ({
      ingredientId: line.ingredientId,
      quantity: typeof line.quantity === "number" && Number.isFinite(line.quantity) ? line.quantity : null,
      unit: line.unit?.trim() ? line.unit.trim() : null,
      note: line.note?.trim() ? line.note.trim() : null,
    }));
}

function recipeExists(store: DemoWellbeingStore, recipeId: string | null | undefined): recipeId is string {
  if (!recipeId) {
    return false;
  }

  return store.recipes.some((recipe) => recipe.id === recipeId);
}

export function listDemoMeals(
  familyId: string,
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): MealSummary[] {
  const store = getStore(familyId);
  const recipeById = new Map(store.recipes.map((recipe) => [recipe.id, recipe.title]));

  return store.meals
    .filter((meal) => meal.childProfileId === childProfileId)
    .filter((meal) => {
      if (options?.fromDate && meal.date < options.fromDate) {
        return false;
      }
      if (options?.toDate && meal.date > options.toDate) {
        return false;
      }
      return true;
    })
    .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt))
    .map((meal) => mapMeal(meal, meal.recipeId ? recipeById.get(meal.recipeId) ?? null : null));
}

export function getDemoMealById(familyId: string, mealId: string): MealSummary | null {
  const store = getStore(familyId);
  const meal = store.meals.find((entry) => entry.id === mealId);
  if (!meal) {
    return null;
  }

  const recipeTitle = meal.recipeId ? store.recipes.find((recipe) => recipe.id === meal.recipeId)?.title ?? null : null;
  return mapMeal(meal, recipeTitle);
}

export function upsertDemoMeal(
  familyId: string,
  childProfileId: string,
  input: MealInput,
  mealId?: string,
): MealSummary {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();
  const normalizedLines = normalizeIngredientLines(store, input.ingredients);
  const resolvedRecipeId = recipeExists(store, input.recipeId) ? input.recipeId : null;

  const existing = mealId ? store.meals.find((meal) => meal.id === mealId) : undefined;
  if (existing) {
    existing.date = input.date;
    existing.mealType = input.mealType;
    existing.description = input.description;
    existing.preparedByLabel = input.preparedByLabel;
    existing.recipeId = resolvedRecipeId;
    existing.updatedAt = nowIso;

    store.mealIngredients = store.mealIngredients.filter((line) => line.mealId !== existing.id);
    normalizedLines.forEach((line, index) => {
      store.mealIngredients.push({
        id: randomUUID(),
        mealId: existing.id,
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit,
        note: line.note,
        sortOrder: index,
        createdAt: nowIso,
      });
    });

    persistStoresToDisk();
    const recipeTitle = existing.recipeId
      ? store.recipes.find((recipe) => recipe.id === existing.recipeId)?.title ?? null
      : null;
    return mapMeal(existing, recipeTitle);
  }

  const created: DemoMealRecord = {
    id: randomUUID(),
    familyId,
    childProfileId,
    date: input.date,
    mealType: input.mealType,
    description: input.description,
    preparedByLabel: input.preparedByLabel,
    recipeId: resolvedRecipeId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.meals.push(created);

  normalizedLines.forEach((line, index) => {
    store.mealIngredients.push({
      id: randomUUID(),
      mealId: created.id,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
      note: line.note,
      sortOrder: index,
      createdAt: nowIso,
    });
  });

  persistStoresToDisk();
  const recipeTitle = created.recipeId
    ? store.recipes.find((recipe) => recipe.id === created.recipeId)?.title ?? null
    : null;
  return mapMeal(created, recipeTitle);
}

export function deleteDemoMeal(familyId: string, mealId: string): boolean {
  const store = getStore(familyId);
  const before = store.meals.length;
  store.meals = store.meals.filter((meal) => meal.id !== mealId);
  store.mealRatings = store.mealRatings.filter((rating) => rating.mealId !== mealId);
  store.mealIngredients = store.mealIngredients.filter((line) => line.mealId !== mealId);
  if (before === store.meals.length) {
    return false;
  }
  persistStoresToDisk();
  return true;
}

export function getDemoMealRatingByMealId(familyId: string, mealId: string): MealRatingSummary | null {
  const rating = getStore(familyId).mealRatings.find((entry) => entry.mealId === mealId);
  return rating ? mapMealRating(rating) : null;
}

export function upsertDemoMealRating(
  familyId: string,
  input: MealRatingInput,
): MealRatingSummary | null {
  const store = getStore(familyId);
  const linkedMeal = store.meals.find((meal) => meal.id === input.mealId);
  if (!linkedMeal) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const existing = store.mealRatings.find((rating) => rating.mealId === input.mealId);
  if (existing) {
    existing.rating = input.rating;
    existing.comment = input.comment;
    existing.updatedAt = nowIso;
    persistStoresToDisk();
    return mapMealRating(existing);
  }

  const created: DemoMealRatingRecord = {
    id: randomUUID(),
    mealId: input.mealId,
    rating: input.rating,
    comment: input.comment,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.mealRatings.push(created);
  persistStoresToDisk();
  return mapMealRating(created);
}

export function listDemoMealsWithRatings(
  familyId: string,
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): MealWithRatingSummary[] {
  const store = getStore(familyId);
  const meals = listDemoMeals(familyId, childProfileId, options);
  const ratingByMealId = new Map(
    store.mealRatings.map((rating) => [rating.mealId, mapMealRating(rating)]),
  );

  return meals.map((meal) => {
    const rating = ratingByMealId.get(meal.id) ?? null;
    return {
      ...meal,
      ingredients: mapMealIngredients(store, meal.id),
      rating,
      isFavorite: rating?.rating === 3,
    };
  });
}

export function listDemoFavoriteMeals(
  familyId: string,
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): Array<{ label: string; count: number }> {
  const favorites = listDemoMealsWithRatings(familyId, childProfileId, options).filter(
    (meal) => meal.rating?.rating === 3,
  );
  const countByDescription = new Map<string, number>();
  favorites.forEach((meal) => {
    countByDescription.set(meal.description, (countByDescription.get(meal.description) ?? 0) + 1);
  });

  return [...countByDescription.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"));
}

export function listDemoEmotionLogs(
  familyId: string,
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): EmotionLogSummary[] {
  return getStore(familyId).emotionLogs
    .filter((log) => log.childProfileId === childProfileId)
    .filter((log) => {
      if (options?.fromDate && log.date < options.fromDate) {
        return false;
      }
      if (options?.toDate && log.date > options.toDate) {
        return false;
      }
      return true;
    })
    .sort((left, right) => right.date.localeCompare(left.date) || left.moment.localeCompare(right.moment))
    .map((log) => mapEmotionLog(log));
}

export function upsertDemoEmotionLog(
  familyId: string,
  childProfileId: string,
  input: EmotionLogInput,
): EmotionLogSummary {
  const store = getStore(familyId);
  const nowIso = new Date().toISOString();

  const existing = store.emotionLogs.find(
    (log) => log.childProfileId === childProfileId && log.date === input.date && log.moment === input.moment,
  );

  if (existing) {
    existing.emotion = input.emotion;
    existing.note = input.note;
    existing.updatedAt = nowIso;
    persistStoresToDisk();
    return mapEmotionLog(existing);
  }

  const created: DemoEmotionLogRecord = {
    id: randomUUID(),
    familyId,
    childProfileId,
    date: input.date,
    moment: input.moment,
    emotion: input.emotion,
    note: input.note,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.emotionLogs.push(created);
  persistStoresToDisk();
  return mapEmotionLog(created);
}
