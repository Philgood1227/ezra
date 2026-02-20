"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createIngredientAction,
  createMealAction,
  deleteMealAction,
  updateMealAction,
} from "@/lib/actions/meals";
import { shiftWeekStartKey } from "@/lib/domain/dashboard";
import { getMealRatingEmoji, getMealTypeLabel } from "@/lib/domain/meals";
import { useFormField } from "@/lib/hooks/useFormField";
import type {
  IngredientInput,
  IngredientSummary,
  MealIngredientInput,
  MealType,
  MealWithRatingSummary,
  RecipeSummary,
  WeeklyIngredientNeedSummary,
} from "@/lib/day-templates/types";

interface ParentMealsManagerProps {
  childName: string;
  weekStart: string;
  weekDateKeys: string[];
  meals: MealWithRatingSummary[];
  ingredients: IngredientSummary[];
  recipes: RecipeSummary[];
  weeklyIngredients: WeeklyIngredientNeedSummary[];
}

interface MealIngredientDraft {
  rowId: string;
  ingredientId: string;
  quantity: string;
  unit: string;
}

interface MealFormDraft {
  date: string;
  mealType: MealType;
  description: string;
  preparedByLabel: string | null;
  recipeId: string | null;
  ingredients: MealIngredientDraft[];
}

const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: "petit_dejeuner", label: "Petit-dejeuner" },
  { value: "dejeuner", label: "Dejeuner" },
  { value: "diner", label: "Diner" },
  { value: "collation", label: "Collation" },
];

function createRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
}

function emptyDraft(date: string): MealFormDraft {
  return {
    date,
    mealType: "dejeuner",
    description: "",
    preparedByLabel: null,
    recipeId: null,
    ingredients: [],
  };
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}/${month}`;
}

function parseIngredientPayload(rows: MealIngredientDraft[]): MealIngredientInput[] {
  return rows
    .filter((line) => line.ingredientId)
    .map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity.trim() ? Number(line.quantity.replace(",", ".")) : null,
      unit: line.unit.trim() ? line.unit.trim() : null,
      note: null,
    }))
    .map((line) => ({
      ...line,
      quantity:
        typeof line.quantity === "number" && Number.isFinite(line.quantity) && line.quantity > 0
          ? Number(line.quantity.toFixed(2))
          : null,
    }));
}

function getRatingLabel(rating: number): string {
  if (rating === 1) {
    return "Bof";
  }
  if (rating === 2) {
    return "Bon";
  }
  return "J'adore";
}

export function ParentMealsManager({
  childName,
  weekStart,
  weekDateKeys,
  meals,
  ingredients,
  recipes,
  weeklyIngredients,
}: ParentMealsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(weekDateKeys[0] ?? weekStart);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [ingredientFormOpen, setIngredientFormOpen] = useState(false);
  const [draft, setDraft] = useState<MealFormDraft>(() => emptyDraft(weekDateKeys[0] ?? weekStart));
  const [ingredientDraft, setIngredientDraft] = useState<IngredientInput>({
    label: "",
    emoji: "🥕",
    defaultUnit: null,
  });

  const descriptionField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Description requise"),
  });
  const dateField = useFormField({
    initialValue: selectedDate,
    validate: (value) => (value.trim() ? null : "Date requise"),
  });

  const mealsByDate = useMemo(
    () =>
      new Map(
        weekDateKeys.map((date) => [
          date,
          meals.filter((meal) => meal.date === date),
        ]),
      ),
    [meals, weekDateKeys],
  );
  const mealsForSelectedDate = mealsByDate.get(selectedDate) ?? [];
  const ratedCount = meals.filter((meal) => Boolean(meal.rating)).length;
  const favoriteCount = meals.filter((meal) => meal.rating?.rating === 3).length;

  const preparedBySuggestions = useMemo(() => {
    const values = meals
      .map((meal) => meal.preparedByLabel)
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim());
    return [...new Set(["Papa", "Maman", "Famille", ...values])];
  }, [meals]);

  function setDraftPatch(patch: Partial<MealFormDraft>): void {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function resetForm(nextDate = selectedDate): void {
    setEditingMealId(null);
    setDraft(emptyDraft(nextDate));
    descriptionField.reset("");
    dateField.reset(nextDate);
  }

  function startEditMeal(meal: MealWithRatingSummary): void {
    setEditingMealId(meal.id);
    setDraft({
      date: meal.date,
      mealType: meal.mealType,
      description: meal.description,
      preparedByLabel: meal.preparedByLabel,
      recipeId: meal.recipeId,
      ingredients: meal.ingredients.map((line) => ({
        rowId: createRowId(),
        ingredientId: line.ingredientId,
        quantity: line.quantity === null ? "" : String(line.quantity),
        unit: line.unit ?? "",
      })),
    });
    setSelectedDate(meal.date);
    descriptionField.reset(meal.description);
    dateField.reset(meal.date);
    setFeedback(null);
  }

  function submitMeal(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);
    descriptionField.markTouched();
    dateField.markTouched();
    const descriptionError = descriptionField.validateNow();
    const dateError = dateField.validateNow();
    if (descriptionError || dateError) {
      setFeedback({ tone: "error", message: "Veuillez corriger les champs requis." });
      return;
    }

    startTransition(async () => {
      const payload = {
        date: draft.date,
        mealType: draft.mealType,
        description: draft.description.trim(),
        preparedByLabel: draft.preparedByLabel?.trim() ? draft.preparedByLabel.trim() : null,
        recipeId: draft.recipeId,
        ingredients: parseIngredientPayload(draft.ingredients),
      };
      const result = editingMealId
        ? await updateMealAction(editingMealId, payload)
        : await createMealAction(payload);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer ce repas." });
        return;
      }

      setFeedback({
        tone: "success",
        message: editingMealId ? "Repas modifie." : "Repas ajoute.",
      });
      setSelectedDate(draft.date);
      resetForm(draft.date);
      router.refresh();
    });
  }

  function removeMeal(mealId: string): void {
    const confirmed = window.confirm("Supprimer ce repas ?");
    if (!confirmed) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteMealAction(mealId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer ce repas." });
        return;
      }
      if (editingMealId === mealId) {
        resetForm();
      }
      setFeedback({ tone: "success", message: "Repas supprime." });
      router.refresh();
    });
  }

  function addIngredientRow(): void {
    setDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          rowId: createRowId(),
          ingredientId: ingredients[0]?.id ?? "",
          quantity: "",
          unit: "",
        },
      ],
    }));
  }

  function updateIngredientRow(rowId: string, patch: Partial<MealIngredientDraft>): void {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((line) => (line.rowId === rowId ? { ...line, ...patch } : line)),
    }));
  }

  function removeIngredientRow(rowId: string): void {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((line) => line.rowId !== rowId),
    }));
  }

  function applyRecipeIngredients(recipeId: string | null): void {
    if (!recipeId) {
      return;
    }
    const recipe = recipes.find((entry) => entry.id === recipeId);
    if (!recipe) {
      return;
    }
    setDraft((current) => ({
      ...current,
      ingredients: recipe.ingredients.map((line) => ({
        rowId: createRowId(),
        ingredientId: line.ingredientId,
        quantity: line.quantity === null ? "" : String(line.quantity),
        unit: line.unit ?? "",
      })),
    }));
  }

  function addIngredientToCatalog(): void {
    if (!ingredientDraft.label.trim()) {
      setFeedback({ tone: "error", message: "Le nom de l'ingredient est requis." });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await createIngredientAction({
        label: ingredientDraft.label.trim(),
        emoji: ingredientDraft.emoji.trim() || "🥕",
        defaultUnit: ingredientDraft.defaultUnit?.trim() ? ingredientDraft.defaultUnit.trim() : null,
      });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'ajouter l'ingredient." });
        return;
      }
      setFeedback({ tone: "success", message: "Ingredient ajoute a la base." });
      setIngredientDraft({ label: "", emoji: "🥕", defaultUnit: null });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Semaine des repas de {childName}</CardTitle>
            <CardDescription>Planification, suivi des avis et favoris.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push(`/parent/meals?weekStart=${shiftWeekStartKey(weekStart, -1)}`)}>
              Semaine precedente
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/parent/meals?weekStart=${shiftWeekStartKey(weekStart, 1)}`)}>
              Semaine suivante
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Repas planifies</p>
            <p className="text-xl font-bold text-text-primary">{meals.length}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Avis recus</p>
            <p className="text-xl font-bold text-text-primary">{ratedCount}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Favoris</p>
            <p className="text-xl font-bold text-text-primary">{favoriteCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDateKeys.map((dateKey) => {
              const active = dateKey === selectedDate;
              const count = (mealsByDate.get(dateKey) ?? []).length;
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateKey);
                    setDraft((current) => ({ ...current, date: dateKey }));
                    dateField.setValue(dateKey);
                  }}
                  className={`min-w-24 rounded-radius-button border px-3 py-2 text-left transition-all ${
                    active
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-border-default bg-bg-surface-hover/60 text-text-secondary"
                  }`}
                >
                  <p className="text-xs font-semibold">{formatDateLabel(dateKey)}</p>
                  <p className="text-[11px]">{count} repas</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Repas du {formatDateLabel(selectedDate)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mealsForSelectedDate.length === 0 ? (
              <p className="text-sm text-text-secondary">Aucun repas planifie ce jour.</p>
            ) : (
              mealsForSelectedDate.map((meal) => (
                <article
                  key={meal.id}
                  className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-text-primary">
                        {getMealTypeLabel(meal.mealType)} - {meal.description}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Prepare par : {meal.preparedByLabel ?? "Non precise"}
                      </p>
                      {meal.rating ? (
                        <p className="text-xs text-text-secondary">
                          Avis enfant : {getMealRatingEmoji(meal.rating.rating)} {getRatingLabel(meal.rating.rating)}
                        </p>
                      ) : (
                        <p className="text-xs text-text-muted">Avis enfant : pas encore note.</p>
                      )}
                      {meal.ingredients.length > 0 ? (
                        <p className="text-xs text-text-muted">
                          Ingredients :{" "}
                          {meal.ingredients.map((line) => `${line.ingredientEmoji} ${line.ingredientLabel}`).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEditMeal(meal)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => removeMeal(meal.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingMealId ? "Modifier un repas" : "Ajouter un repas"}</CardTitle>
            <CardDescription>Formulaire parent principal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitMeal}>
              <div className="space-y-1">
                <label htmlFor="meal-date" className="text-sm font-semibold text-text-secondary">
                  Date
                </label>
                <Input
                  id="meal-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraftPatch({ date: value });
                    setSelectedDate(value);
                    dateField.setValue(value);
                  }}
                  onBlur={dateField.markTouched}
                  errorMessage={dateField.hasError ? dateField.error ?? undefined : undefined}
                  successMessage={dateField.isValid ? "Champ valide" : undefined}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="meal-type" className="text-sm font-semibold text-text-secondary">
                  Type de repas
                </label>
                <Select
                  id="meal-type"
                  value={draft.mealType}
                  onChange={(event) =>
                    setDraftPatch({ mealType: event.target.value as MealType })
                  }
                >
                  {MEAL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label htmlFor="meal-description" className="text-sm font-semibold text-text-secondary">
                  Description
                </label>
                <Input
                  id="meal-description"
                  value={draft.description}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraftPatch({ description: value });
                    descriptionField.setValue(value);
                  }}
                  onBlur={descriptionField.markTouched}
                  errorMessage={descriptionField.hasError ? descriptionField.error ?? undefined : undefined}
                  successMessage={descriptionField.isValid ? "Champ valide" : undefined}
                  placeholder="Pates bolognaise"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="meal-prepared-by-label" className="text-sm font-semibold text-text-secondary">
                  Prepare par
                </label>
                <Input
                  id="meal-prepared-by-label"
                  list="meal-prepared-by-suggestions"
                  value={draft.preparedByLabel ?? ""}
                  onChange={(event) =>
                    setDraftPatch({ preparedByLabel: event.target.value || null })
                  }
                  placeholder="Papa, Maman..."
                />
                <datalist id="meal-prepared-by-suggestions">
                  {preparedBySuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label htmlFor="meal-recipe" className="text-sm font-semibold text-text-secondary">
                  Recette (optionnel)
                </label>
                <div className="flex flex-wrap gap-2">
                  <Select
                    id="meal-recipe"
                    value={draft.recipeId ?? ""}
                    onChange={(event) => setDraftPatch({ recipeId: event.target.value || null })}
                    className="min-w-[220px] flex-1"
                  >
                    <option value="">Aucune recette</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => applyRecipeIngredients(draft.recipeId)}
                    disabled={!draft.recipeId || isPending}
                  >
                    Charger la recette
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">Ingredients du repas</p>
                  <Button type="button" size="sm" variant="secondary" onClick={addIngredientRow}>
                    Ajouter un ingredient
                  </Button>
                </div>
                {draft.ingredients.length === 0 ? (
                  <p className="text-sm text-text-secondary">Aucun ingredient ajoute.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.ingredients.map((line) => (
                      <div key={line.rowId} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                        <Select
                          value={line.ingredientId}
                          onChange={(event) =>
                            updateIngredientRow(line.rowId, { ingredientId: event.target.value })
                          }
                        >
                          <option value="">Ingredient</option>
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.emoji} {ingredient.label}
                            </option>
                          ))}
                        </Select>
                        <Input
                          value={line.quantity}
                          onChange={(event) =>
                            updateIngredientRow(line.rowId, { quantity: event.target.value })
                          }
                          placeholder="Quantite"
                          inputMode="decimal"
                        />
                        <Input
                          value={line.unit}
                          onChange={(event) =>
                            updateIngredientRow(line.rowId, { unit: event.target.value })
                          }
                          placeholder="Unite"
                        />
                        <Button type="button" variant="ghost" onClick={() => removeIngredientRow(line.rowId)}>
                          Retirer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-primary underline-offset-2 hover:underline"
                  onClick={() => setIngredientFormOpen((current) => !current)}
                >
                  {ingredientFormOpen ? "Masquer" : "Ajouter un ingredient au catalogue"}
                </button>
                {ingredientFormOpen ? (
                  <div className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/40 p-3">
                    <div className="grid gap-2 md:grid-cols-[auto_2fr_1fr_auto]">
                      <Input
                        value={ingredientDraft.emoji}
                        onChange={(event) =>
                          setIngredientDraft((current) => ({ ...current, emoji: event.target.value }))
                        }
                        placeholder="🥕"
                      />
                      <Input
                        value={ingredientDraft.label}
                        onChange={(event) =>
                          setIngredientDraft((current) => ({ ...current, label: event.target.value }))
                        }
                        placeholder="Nom de l'ingredient"
                      />
                      <Input
                        value={ingredientDraft.defaultUnit ?? ""}
                        onChange={(event) =>
                          setIngredientDraft((current) => ({
                            ...current,
                            defaultUnit: event.target.value || null,
                          }))
                        }
                        placeholder="Unite"
                      />
                      <Button type="button" variant="secondary" onClick={addIngredientToCatalog} disabled={isPending}>
                        Ajouter
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={isPending}>
                  {editingMealId ? "Enregistrer" : "Ajouter"}
                </Button>
                {editingMealId ? (
                  <Button type="button" variant="ghost" onClick={() => resetForm()}>
                    Annuler
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste d&apos;ingredients de la semaine</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyIngredients.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucun ingredient consolide cette semaine.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-text-secondary">
                    <th className="px-2 py-2 font-semibold">Ingredient</th>
                    <th className="px-2 py-2 font-semibold">Quantite</th>
                    <th className="px-2 py-2 font-semibold">Repas</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyIngredients.map((line) => (
                    <tr key={line.key} className="border-b border-border-subtle/60">
                      <td className="px-2 py-2 font-medium text-text-primary">
                        {line.ingredientEmoji} {line.ingredientLabel}
                      </td>
                      <td className="px-2 py-2 text-text-secondary">
                        {line.totalQuantity === null ? "—" : `${line.totalQuantity} ${line.unit ?? ""}`}
                      </td>
                      <td className="px-2 py-2 text-text-secondary">{line.mealsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recettes disponibles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {recipes.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucune recette sauvegardee.</p>
          ) : (
            recipes.map((recipe) => (
              <Badge key={recipe.id} variant="neutral">
                {recipe.title}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
