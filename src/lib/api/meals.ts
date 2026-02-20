import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily, type ChildProfileRef } from "@/lib/api/children";
import { buildWeekDateKeys, getWeekStartKey } from "@/lib/domain/dashboard";
import { computeWeeklyIngredientNeeds, DEFAULT_INGREDIENT_LIBRARY } from "@/lib/domain/meals";
import {
  listDemoIngredients,
  listDemoMealsWithRatings,
  listDemoRecipes,
} from "@/lib/demo/wellbeing-store";
import type {
  IngredientSummary,
  MealIngredientSummary,
  MealSummary,
  MealWithRatingSummary,
  RecipeSummary,
  WeeklyIngredientNeedSummary,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MealRow = Database["public"]["Tables"]["meals"]["Row"];
type MealRatingRow = Database["public"]["Tables"]["meal_ratings"]["Row"];
type IngredientRow = Database["public"]["Tables"]["ingredients"]["Row"];
type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
type RecipeIngredientRow = Database["public"]["Tables"]["recipe_ingredients"]["Row"];
type MealIngredientRow = Database["public"]["Tables"]["meal_ingredients"]["Row"];

function mapMealRow(
  row: MealRow,
  preparedByDisplayNameFromProfile: string | null,
  recipeTitle: string | null,
): MealSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    childProfileId: row.child_profile_id,
    date: row.date,
    mealType: row.meal_type,
    description: row.description,
    preparedByLabel: row.prepared_by_label ?? preparedByDisplayNameFromProfile,
    recipeId: row.recipe_id,
    recipeTitle,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapIngredientRow(row: IngredientRow): IngredientSummary {
  return {
    id: row.id,
    familyId: row.family_id,
    label: row.label,
    emoji: row.emoji,
    defaultUnit: row.default_unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function shouldUseAdminClientForChildPin(context: Awaited<ReturnType<typeof getCurrentProfile>>, childProfileId: string): boolean {
  return (
    context.source === "child-pin" &&
    context.role === "child" &&
    context.profile?.id === childProfileId &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function mapRecipeRows(input: {
  recipeRows: RecipeRow[];
  recipeIngredientRows: RecipeIngredientRow[];
  ingredientById: Map<string, IngredientSummary>;
}): RecipeSummary[] {
  const linesByRecipeId = new Map<string, RecipeIngredientRow[]>();
  for (const line of input.recipeIngredientRows) {
    const bucket = linesByRecipeId.get(line.recipe_id) ?? [];
    bucket.push(line);
    linesByRecipeId.set(line.recipe_id, bucket);
  }

  return input.recipeRows
    .map((row) => {
      const lines = (linesByRecipeId.get(row.id) ?? [])
        .sort((left, right) => left.sort_order - right.sort_order)
        .flatMap((line) => {
          const ingredient = input.ingredientById.get(line.ingredient_id);
          if (!ingredient) {
            return [];
          }

          return {
            id: line.id,
            recipeId: line.recipe_id,
            ingredientId: line.ingredient_id,
            ingredientLabel: ingredient.label,
            ingredientEmoji: ingredient.emoji,
            quantity: line.quantity,
            unit: line.unit,
            sortOrder: line.sort_order,
          };
        });

      return {
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        description: row.description,
        ingredients: lines,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } satisfies RecipeSummary;
    })
    .sort((left, right) => left.title.localeCompare(right.title, "fr"));
}

export async function getMealsForChild(
  childProfileId: string,
  options?: { fromDate?: string; toDate?: string },
): Promise<MealWithRatingSummary[]> {
  const context = await getCurrentProfile();
  if (!context.familyId || !childProfileId) {
    return [];
  }

  if (!isSupabaseEnabled()) {
    return listDemoMealsWithRatings(context.familyId, childProfileId, options);
  }

  const supabase = shouldUseAdminClientForChildPin(context, childProfileId)
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();

  let query = supabase
    .from("meals")
    .select("*")
    .eq("family_id", context.familyId)
    .eq("child_profile_id", childProfileId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.fromDate) {
    query = query.gte("date", options.fromDate);
  }

  if (options?.toDate) {
    query = query.lte("date", options.toDate);
  }

  const { data: mealRows, error: mealError } = await query;
  if (mealError || !mealRows || mealRows.length === 0) {
    return [];
  }

  const mealIds = mealRows.map((meal) => meal.id);
  const recipeIds = [...new Set(mealRows.map((meal) => meal.recipe_id).filter((id): id is string => Boolean(id)))];
  const preparedByProfileIds = [
    ...new Set(mealRows.map((meal) => meal.prepared_by_profile_id).filter((id): id is string => Boolean(id))),
  ];

  const [{ data: ratingRows }, { data: profileRows }, { data: recipeRows }, { data: mealIngredientRows }] = await Promise.all([
    supabase.from("meal_ratings").select("*").in("meal_id", mealIds),
    preparedByProfileIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", preparedByProfileIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }> }),
    recipeIds.length
      ? supabase.from("recipes").select("id, title").in("id", recipeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    supabase.from("meal_ingredients").select("*").in("meal_id", mealIds),
  ]);

  const ingredientIds = [
    ...new Set((mealIngredientRows ?? []).map((line) => line.ingredient_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: ingredientRows } = ingredientIds.length
    ? await supabase.from("ingredients").select("*").in("id", ingredientIds)
    : { data: [] as IngredientRow[] };

  const ingredientById = new Map((ingredientRows ?? []).map((row) => {
    const mapped = mapIngredientRow(row as IngredientRow);
    return [mapped.id, mapped] as const;
  }));

  const ratingByMealId = new Map(
    (ratingRows ?? []).map((row) => [row.meal_id, row as MealRatingRow]),
  );
  const preparedByNameById = new Map((profileRows ?? []).map((profile) => [profile.id, profile.display_name]));
  const recipeTitleById = new Map((recipeRows ?? []).map((recipe) => [recipe.id, recipe.title]));

  const mealIngredientsByMealId = new Map<string, MealIngredientSummary[]>();
  for (const line of (mealIngredientRows ?? []) as MealIngredientRow[]) {
    const ingredient = ingredientById.get(line.ingredient_id);
    if (!ingredient) {
      continue;
    }

    const bucket = mealIngredientsByMealId.get(line.meal_id) ?? [];
    bucket.push({
      id: line.id,
      mealId: line.meal_id,
      ingredientId: line.ingredient_id,
      ingredientLabel: ingredient.label,
      ingredientEmoji: ingredient.emoji,
      quantity: line.quantity,
      unit: line.unit,
      note: line.note,
      sortOrder: line.sort_order,
    });
    mealIngredientsByMealId.set(line.meal_id, bucket);
  }

  mealIngredientsByMealId.forEach((lines, mealId) => {
    lines.sort((left, right) => left.sortOrder - right.sortOrder);
    mealIngredientsByMealId.set(mealId, lines);
  });

  return mealRows.map((row) => {
    const ratingRow = ratingByMealId.get(row.id);
    const mealSummary = mapMealRow(
      row as MealRow,
      row.prepared_by_profile_id ? preparedByNameById.get(row.prepared_by_profile_id) ?? null : null,
      row.recipe_id ? recipeTitleById.get(row.recipe_id) ?? null : null,
    );

    return {
      ...mealSummary,
      ingredients: mealIngredientsByMealId.get(row.id) ?? [],
      rating: ratingRow
        ? {
            id: ratingRow.id,
            mealId: ratingRow.meal_id,
            rating: ratingRow.rating as 1 | 2 | 3,
            comment: ratingRow.comment,
            createdAt: ratingRow.created_at,
            updatedAt: ratingRow.updated_at,
          }
        : null,
      isFavorite: ratingRow?.rating === 3,
    };
  });
}

async function getRecipeCatalogForFamily(familyId: string): Promise<{
  ingredients: IngredientSummary[];
  recipes: RecipeSummary[];
}> {
  if (!isSupabaseEnabled()) {
    return {
      ingredients: listDemoIngredients(familyId),
      recipes: listDemoRecipes(familyId),
    };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: ingredientRowsRaw }, { data: recipeRows }] = await Promise.all([
    supabase.from("ingredients").select("*").eq("family_id", familyId).order("label", { ascending: true }),
    supabase.from("recipes").select("*").eq("family_id", familyId).order("title", { ascending: true }),
  ]);

  let ingredientRows = (ingredientRowsRaw ?? []) as IngredientRow[];

  if (ingredientRows.length === 0) {
    const { data: seededRows } = await supabase
      .from("ingredients")
      .insert(
        DEFAULT_INGREDIENT_LIBRARY.map((ingredient) => ({
          family_id: familyId,
          label: ingredient.label,
          emoji: ingredient.emoji,
          default_unit: ingredient.defaultUnit,
        })),
      )
      .select("*");

    ingredientRows = (seededRows ?? []) as IngredientRow[];

    if (ingredientRows.length === 0) {
      const { data: fallbackRows } = await supabase
        .from("ingredients")
        .select("*")
        .eq("family_id", familyId)
        .order("label", { ascending: true });
      ingredientRows = (fallbackRows ?? []) as IngredientRow[];
    }
  }

  const mappedIngredients = ingredientRows.map((row) => mapIngredientRow(row));
  const ingredientById = new Map(mappedIngredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipeIds = (recipeRows ?? []).map((recipe) => recipe.id);
  const { data: recipeIngredientRows } = recipeIds.length
    ? await supabase
        .from("recipe_ingredients")
        .select("*")
        .in("recipe_id", recipeIds)
        .order("sort_order", { ascending: true })
    : { data: [] as RecipeIngredientRow[] };

  const mappedRecipes = mapRecipeRows({
    recipeRows: (recipeRows ?? []) as RecipeRow[],
    recipeIngredientRows: (recipeIngredientRows ?? []) as RecipeIngredientRow[],
    ingredientById,
  });

  return {
    ingredients: mappedIngredients,
    recipes: mappedRecipes,
  };
}

export interface ParentMealsPageData {
  child: ChildProfileRef | null;
  weekStart: string;
  weekDateKeys: string[];
  meals: MealWithRatingSummary[];
  ingredients: IngredientSummary[];
  recipes: RecipeSummary[];
  weeklyIngredients: WeeklyIngredientNeedSummary[];
}

export async function getParentMealsPageData(weekStartInput?: string): Promise<ParentMealsPageData> {
  const context = await getCurrentProfile();
  const child = await getPrimaryChildProfileForCurrentFamily();

  const weekStart = isDateKey(weekStartInput) ? weekStartInput : getWeekStartKey(new Date());
  const weekDateKeys = buildWeekDateKeys(weekStart);
  const weekEnd = weekDateKeys[weekDateKeys.length - 1] ?? weekStart;

  if (!child || !context.familyId) {
    return {
      child: null,
      weekStart,
      weekDateKeys,
      meals: [],
      ingredients: [],
      recipes: [],
      weeklyIngredients: [],
    };
  }

  const [meals, catalog] = await Promise.all([
    getMealsForChild(child.id, { fromDate: weekStart, toDate: weekEnd }),
    getRecipeCatalogForFamily(context.familyId),
  ]);

  const weeklyIngredients = computeWeeklyIngredientNeeds(
    meals.flatMap((meal) =>
      meal.ingredients.map((line) => ({
        ingredientLabel: line.ingredientLabel,
        ingredientEmoji: line.ingredientEmoji,
        quantity: line.quantity,
        unit: line.unit,
      })),
    ),
  );

  return {
    child,
    weekStart,
    weekDateKeys,
    meals,
    ingredients: catalog.ingredients,
    recipes: catalog.recipes,
    weeklyIngredients,
  };
}
