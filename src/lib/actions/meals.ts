"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import {
  createDemoRecipe,
  createOrGetDemoIngredient,
  deleteDemoMeal,
  getDemoMealById,
  getDemoRecipeById,
  upsertDemoMeal,
  upsertDemoMealRating,
} from "@/lib/demo/wellbeing-store";
import type {
  ActionResult,
  IngredientInput,
  MealIngredientInput,
  MealInput,
  MealRatingInput,
  RecipeInput,
} from "@/lib/day-templates/types";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mealIngredientSchema = z.object({
  ingredientId: z.string().uuid("Ingredient invalide."),
  quantity: z.union([z.number().positive().max(10000), z.null()]),
  unit: z.string().trim().max(30).nullable(),
  note: z.string().trim().max(160).nullable(),
});

const mealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  mealType: z.enum(["petit_dejeuner", "dejeuner", "diner", "collation"]),
  description: z.string().trim().min(2, "Description requise.").max(240),
  preparedByLabel: z.string().trim().min(1, "Nom du preparateur invalide.").max(120).nullable(),
  recipeId: z.string().uuid().nullable().optional(),
  ingredients: z.array(mealIngredientSchema).max(40).optional(),
  saveAsRecipeTitle: z.string().trim().min(2).max(120).nullable().optional(),
});

const ingredientSchema = z.object({
  label: z.string().trim().min(2, "Nom d'ingredient invalide.").max(120),
  emoji: z.string().trim().min(1, "Emoji requis.").max(16),
  defaultUnit: z.string().trim().max(30).nullable(),
});

const recipeSchema = z.object({
  title: z.string().trim().min(2, "Nom de recette invalide.").max(120),
  description: z.string().trim().max(240).nullable(),
  ingredients: z.array(mealIngredientSchema).min(1, "Ajoute au moins un ingredient.").max(60),
});

const ratingSchema = z.object({
  mealId: z.string().uuid("Repas invalide."),
  rating: z.number().int().min(1).max(3),
  comment: z.string().trim().max(280).nullable(),
});

interface ParentContext {
  familyId: string;
  childProfileId: string;
}

function revalidateMealPaths(): void {
  revalidatePath("/parent/meals");
  revalidatePath("/parent/dashboard");
}

function normalizeMealIngredientLines(input: MealIngredientInput[] | undefined): MealIngredientInput[] {
  if (!input) {
    return [];
  }

  return input
    .map((line) => ({
      ingredientId: line.ingredientId,
      quantity: typeof line.quantity === "number" && Number.isFinite(line.quantity) ? line.quantity : null,
      unit: line.unit?.trim() ? line.unit.trim() : null,
      note: line.note?.trim() ? line.note.trim() : null,
    }))
    .filter((line) => Boolean(line.ingredientId));
}

async function requireParentContext(): Promise<ParentContext | null> {
  const context = await getCurrentProfile();
  if (context.role !== "parent" || !context.familyId) {
    return null;
  }

  const child = await getPrimaryChildProfileForCurrentFamily();
  if (!child) {
    return null;
  }

  return {
    familyId: context.familyId,
    childProfileId: child.id,
  };
}

async function resolveRecipeLinesSupabase(
  recipeId: string,
): Promise<MealIngredientInput[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("recipe_ingredients")
    .select("ingredient_id, quantity, unit, sort_order")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((line) => ({
    ingredientId: line.ingredient_id,
    quantity: line.quantity,
    unit: line.unit,
    note: null,
  }));
}

async function replaceMealIngredientsSupabase(
  mealId: string,
  lines: MealIngredientInput[],
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase.from("meal_ingredients").delete().eq("meal_id", mealId);

  if (deleteError) {
    return false;
  }

  if (lines.length === 0) {
    return true;
  }

  const { error: insertError } = await supabase.from("meal_ingredients").insert(
    lines.map((line, index) => ({
      meal_id: mealId,
      ingredient_id: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
      note: line.note,
      sort_order: index,
    })),
  );

  return !insertError;
}

async function createRecipeSupabase(input: RecipeInput, familyId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      family_id: familyId,
      title: input.title,
      description: input.description,
    })
    .select("id")
    .single();

  if (recipeError || !recipeRow) {
    return null;
  }

  const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(
    input.ingredients.map((line, index) => ({
      recipe_id: recipeRow.id,
      ingredient_id: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
      sort_order: index,
    })),
  );

  if (ingredientsError) {
    return null;
  }

  return recipeRow.id;
}

export async function createIngredientAction(input: IngredientInput): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = ingredientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const payload: IngredientInput = {
    label: parsed.data.label.trim(),
    emoji: parsed.data.emoji.trim(),
    defaultUnit: parsed.data.defaultUnit?.trim() ? parsed.data.defaultUnit.trim() : null,
  };

  if (!isSupabaseEnabled()) {
    const created = createOrGetDemoIngredient(context.familyId, payload);
    revalidateMealPaths();
    return { success: true, data: { id: created.id } };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("ingredients")
    .select("id")
    .eq("family_id", context.familyId)
    .ilike("label", payload.label)
    .maybeSingle();

  if (existing) {
    revalidateMealPaths();
    return { success: true, data: { id: existing.id } };
  }

  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      family_id: context.familyId,
      label: payload.label,
      emoji: payload.emoji,
      default_unit: payload.defaultUnit,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible d'ajouter cet ingredient." };
  }

  revalidateMealPaths();
  return { success: true, data: { id: data.id } };
}

export async function createRecipeAction(input: RecipeInput): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const payload: RecipeInput = {
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
    ingredients: normalizeMealIngredientLines(parsed.data.ingredients),
  };

  if (!isSupabaseEnabled()) {
    const recipe = createDemoRecipe(context.familyId, payload);
    if (!recipe) {
      return { success: false, error: "Impossible de creer cette recette." };
    }

    revalidateMealPaths();
    return { success: true, data: { id: recipe.id } };
  }

  const recipeId = await createRecipeSupabase(payload, context.familyId);
  if (!recipeId) {
    return { success: false, error: "Impossible de creer cette recette." };
  }

  revalidateMealPaths();
  return { success: true, data: { id: recipeId } };
}

export async function createMealAction(input: MealInput): Promise<ActionResult<{ id: string }>> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  let ingredientLines = normalizeMealIngredientLines(parsed.data.ingredients);
  let recipeId = parsed.data.recipeId ?? null;
  const saveAsRecipeTitle = parsed.data.saveAsRecipeTitle?.trim() ? parsed.data.saveAsRecipeTitle.trim() : null;

  if (!isSupabaseEnabled()) {
    if (recipeId && ingredientLines.length === 0) {
      const recipe = getDemoRecipeById(context.familyId, recipeId);
      ingredientLines = (recipe?.ingredients ?? []).map((line) => ({
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit,
        note: null,
      }));
    }

    if (saveAsRecipeTitle && ingredientLines.length > 0) {
      const recipe = createDemoRecipe(context.familyId, {
        title: saveAsRecipeTitle,
        description: parsed.data.description,
        ingredients: ingredientLines,
      });
      recipeId = recipe?.id ?? recipeId;
    }

    const created = upsertDemoMeal(context.familyId, context.childProfileId, {
      ...parsed.data,
      preparedByLabel: parsed.data.preparedByLabel?.trim() ? parsed.data.preparedByLabel.trim() : null,
      recipeId,
      ingredients: ingredientLines,
      saveAsRecipeTitle: null,
    });

    revalidateMealPaths();
    return { success: true, data: { id: created.id } };
  }

  if (recipeId && ingredientLines.length === 0) {
    ingredientLines = await resolveRecipeLinesSupabase(recipeId);
  }

  if (saveAsRecipeTitle && ingredientLines.length > 0) {
    const createdRecipeId = await createRecipeSupabase(
      {
        title: saveAsRecipeTitle,
        description: parsed.data.description,
        ingredients: ingredientLines,
      },
      context.familyId,
    );
    if (createdRecipeId) {
      recipeId = createdRecipeId;
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meals")
    .insert({
      family_id: context.familyId,
      child_profile_id: context.childProfileId,
      date: parsed.data.date,
      meal_type: parsed.data.mealType,
      description: parsed.data.description,
      prepared_by_profile_id: null,
      prepared_by_label: parsed.data.preparedByLabel?.trim() ? parsed.data.preparedByLabel.trim() : null,
      recipe_id: recipeId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: "Impossible d'ajouter ce repas." };
  }

  const ingredientsSaved = await replaceMealIngredientsSupabase(data.id, ingredientLines);
  if (!ingredientsSaved) {
    return { success: false, error: "Repas ajoute, mais impossible d'ajouter les ingredients." };
  }

  revalidateMealPaths();
  return { success: true, data: { id: data.id } };
}

export async function updateMealAction(mealId: string, input: MealInput): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  let ingredientLines = normalizeMealIngredientLines(parsed.data.ingredients);
  let recipeId = parsed.data.recipeId ?? null;
  const saveAsRecipeTitle = parsed.data.saveAsRecipeTitle?.trim() ? parsed.data.saveAsRecipeTitle.trim() : null;

  if (!isSupabaseEnabled()) {
    const existing = getDemoMealById(context.familyId, mealId);
    if (!existing) {
      return { success: false, error: "Repas introuvable." };
    }

    if (recipeId && ingredientLines.length === 0) {
      const recipe = getDemoRecipeById(context.familyId, recipeId);
      ingredientLines = (recipe?.ingredients ?? []).map((line) => ({
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit,
        note: null,
      }));
    }

    if (saveAsRecipeTitle && ingredientLines.length > 0) {
      const recipe = createDemoRecipe(context.familyId, {
        title: saveAsRecipeTitle,
        description: parsed.data.description,
        ingredients: ingredientLines,
      });
      recipeId = recipe?.id ?? recipeId;
    }

    upsertDemoMeal(
      context.familyId,
      context.childProfileId,
      {
        ...parsed.data,
        preparedByLabel: parsed.data.preparedByLabel?.trim() ? parsed.data.preparedByLabel.trim() : null,
        recipeId,
        ingredients: ingredientLines,
        saveAsRecipeTitle: null,
      },
      mealId,
    );
    revalidateMealPaths();
    return { success: true };
  }

  if (recipeId && ingredientLines.length === 0) {
    ingredientLines = await resolveRecipeLinesSupabase(recipeId);
  }

  if (saveAsRecipeTitle && ingredientLines.length > 0) {
    const createdRecipeId = await createRecipeSupabase(
      {
        title: saveAsRecipeTitle,
        description: parsed.data.description,
        ingredients: ingredientLines,
      },
      context.familyId,
    );
    if (createdRecipeId) {
      recipeId = createdRecipeId;
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("meals")
    .select("id")
    .eq("id", mealId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Repas introuvable." };
  }

  const { error } = await supabase
    .from("meals")
    .update({
      date: parsed.data.date,
      meal_type: parsed.data.mealType,
      description: parsed.data.description,
      prepared_by_profile_id: null,
      prepared_by_label: parsed.data.preparedByLabel?.trim() ? parsed.data.preparedByLabel.trim() : null,
      recipe_id: recipeId,
    })
    .eq("id", mealId)
    .eq("family_id", context.familyId);

  if (error) {
    return { success: false, error: "Impossible de modifier ce repas." };
  }

  const ingredientsSaved = await replaceMealIngredientsSupabase(mealId, ingredientLines);
  if (!ingredientsSaved) {
    return { success: false, error: "Repas modifie, mais ingredients non sauvegardes." };
  }

  revalidateMealPaths();
  return { success: true };
}

export async function deleteMealAction(mealId: string): Promise<ActionResult> {
  const context = await requireParentContext();
  if (!context) {
    return { success: false, error: "Action reservee au parent." };
  }

  if (!isSupabaseEnabled()) {
    const deleted = deleteDemoMeal(context.familyId, mealId);
    if (!deleted) {
      return { success: false, error: "Repas introuvable." };
    }
    revalidateMealPaths();
    return { success: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", mealId)
    .eq("family_id", context.familyId)
    .eq("child_profile_id", context.childProfileId);

  if (error) {
    return { success: false, error: "Impossible de supprimer ce repas." };
  }

  revalidateMealPaths();
  return { success: true };
}

export async function rateMealAction(payload: unknown): Promise<ActionResult<{ mealId: string }>> {
  const parsed = ratingSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return { success: false, error: "Session invalide." };
  }

  if (context.role !== "child" && context.role !== "parent") {
    return { success: false, error: "Action non autorisee." };
  }

  const normalizedInput: MealRatingInput = {
    mealId: parsed.data.mealId,
    rating: parsed.data.rating as 1 | 2 | 3,
    comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : null,
  };

  if (!isSupabaseEnabled()) {
    const rating = upsertDemoMealRating(context.familyId, normalizedInput);
    if (!rating) {
      return { success: false, error: "Repas introuvable." };
    }

    revalidateMealPaths();
    return { success: true, data: { mealId: normalizedInput.mealId } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: meal } = await supabase
    .from("meals")
    .select("id, family_id, child_profile_id")
    .eq("id", normalizedInput.mealId)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (!meal) {
    return { success: false, error: "Repas introuvable." };
  }

  if (context.role === "child" && meal.child_profile_id !== context.profile.id) {
    return { success: false, error: "Action non autorisee." };
  }

  const { error } = await supabase.from("meal_ratings").upsert(
    {
      meal_id: normalizedInput.mealId,
      rating: normalizedInput.rating,
      comment: normalizedInput.comment,
    },
    { onConflict: "meal_id" },
  );

  if (error) {
    return { success: false, error: "Impossible d'enregistrer cette note." };
  }

  revalidateMealPaths();
  return { success: true, data: { mealId: normalizedInput.mealId } };
}
