"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createCategoryAction,
  deleteCategoryAction,
  seedEzraCategoryPackAction,
  updateCategoryAction,
} from "@/lib/actions/day-templates";
import {
  CATEGORY_COLOR_OPTIONS,
  getCategoryColorOption,
  getPlanActionableKindLabel,
  PLAN_ACTIONABLE_KIND_OPTIONS,
} from "@/lib/day-templates/constants";
import { useFormField } from "@/lib/hooks/useFormField";
import { cn } from "@/lib/utils";
import type { PlanActionableKind, TaskCategorySummary } from "@/lib/day-templates/types";

interface CategoriesManagerProps {
  categories: TaskCategorySummary[];
}

interface CategoryDraft {
  name: string;
  icon: string;
  colorKey: string;
  defaultItemKind: PlanActionableKind;
}

const DEFAULT_COLOR_KEY = CATEGORY_COLOR_OPTIONS[0]?.key ?? "category-routine";
const DEFAULT_ICON = "🧩";
const DEFAULT_ITEM_KIND: PlanActionableKind = "mission";

const EMPTY_DRAFT: CategoryDraft = {
  name: "",
  icon: DEFAULT_ICON,
  colorKey: DEFAULT_COLOR_KEY,
  defaultItemKind: DEFAULT_ITEM_KIND,
};

interface EmojiOption {
  emoji: string;
  label: string;
}

const EMOJI_OPTIONS: EmojiOption[] = [
  { emoji: "🧩", label: "Routine" },
  { emoji: "📚", label: "Ecole" },
  { emoji: "🍽️", label: "Repas" },
  { emoji: "⚽", label: "Sport" },
  { emoji: "🛏️", label: "Sommeil" },
  { emoji: "🧘", label: "Calme" },
  { emoji: "🚌", label: "Transport" },
  { emoji: "🎨", label: "Creatif" },
];

function parseRequired(value: string, label: string): string | null {
  return value.trim().length > 0 ? null : `${label} requis`;
}

function categoryKind(value: PlanActionableKind | null | undefined): PlanActionableKind {
  return value ?? DEFAULT_ITEM_KIND;
}

export function CategoriesManager({ categories }: CategoriesManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<CategoryDraft>(EMPTY_DRAFT);

  const nameField = useFormField({
    initialValue: draft.name,
    validate: (value) => parseRequired(value, "Nom"),
  });
  const iconField = useFormField({
    initialValue: draft.icon,
    validate: (value) => parseRequired(value, "Icone"),
  });

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.name.localeCompare(right.name, "fr")),
    [categories],
  );

  function updateDraft(patch: Partial<CategoryDraft>): void {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function submitCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    const nameError = nameField.validateNow();
    const iconError = iconField.validateNow();
    nameField.markTouched();
    iconField.markTouched();

    if (nameError || iconError || !draft.colorKey) {
      setFeedback({ tone: "error", message: "Veuillez corriger les champs requis." });
      return;
    }

    startTransition(async () => {
      const result = await createCategoryAction({
        name: draft.name.trim(),
        icon: draft.icon.trim(),
        colorKey: draft.colorKey,
        defaultItemKind: draft.defaultItemKind,
      });

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de creer la categorie." });
        return;
      }

      setFeedback({ tone: "success", message: "Categorie ajoutee." });
      setDraft(EMPTY_DRAFT);
      nameField.reset("");
      iconField.reset(DEFAULT_ICON);
      router.refresh();
    });
  }

  function installPack(): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await seedEzraCategoryPackAction();
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'installer le pack Ezra." });
        return;
      }

      const count = result.data?.createdCount ?? 0;
      setFeedback({
        tone: "success",
        message: count > 0 ? `Pack Ezra installe (${count} categories).` : "Le pack Ezra est deja installe.",
      });
      router.refresh();
    });
  }

  function startEdit(category: TaskCategorySummary): void {
    setEditingId(category.id);
    setEditingDraft({
      name: category.name,
      icon: category.icon,
      colorKey: category.colorKey,
      defaultItemKind: categoryKind(category.defaultItemKind),
    });
    setFeedback(null);
  }

  function saveEdit(): void {
    if (!editingId) {
      return;
    }

    if (!editingDraft.name.trim() || !editingDraft.icon.trim() || !editingDraft.colorKey) {
      setFeedback({ tone: "error", message: "Nom, icone et couleur sont requis." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await updateCategoryAction(editingId, {
        name: editingDraft.name.trim(),
        icon: editingDraft.icon.trim(),
        colorKey: editingDraft.colorKey,
        defaultItemKind: editingDraft.defaultItemKind,
      });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de modifier la categorie." });
        return;
      }

      setEditingId(null);
      setFeedback({ tone: "success", message: "Categorie mise a jour." });
      router.refresh();
    });
  }

  function deleteCategory(categoryId: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer la categorie." });
        return;
      }

      setFeedback({ tone: "success", message: "Categorie supprimee." });
      if (editingId === categoryId) {
        setEditingId(null);
      }
      router.refresh();
    });
  }

  const previewColor = getCategoryColorOption(draft.colorKey);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Ajouter une categorie</CardTitle>
            <p className="text-sm text-text-secondary">Nom, icone, couleur et type facilitent les reperes visuels.</p>
          </div>
          <Button type="button" variant="secondary" loading={isPending} onClick={installPack}>
            Installer le pack Ezra
          </Button>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="category-name" className="text-sm font-semibold text-text-secondary">
                  Nom
                </label>
                <Input
                  id="category-name"
                  value={draft.name}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateDraft({ name: value });
                    nameField.setValue(value);
                  }}
                  onBlur={nameField.markTouched}
                  errorMessage={nameField.hasError ? nameField.error ?? undefined : undefined}
                  successMessage={nameField.isValid ? "Champ valide" : undefined}
                  placeholder="Routine du soir"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="category-icon" className="text-sm font-semibold text-text-secondary">
                  Icone
                </label>
                <Input
                  id="category-icon"
                  value={draft.icon}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateDraft({ icon: value });
                    iconField.setValue(value);
                  }}
                  onBlur={iconField.markTouched}
                  errorMessage={iconField.hasError ? iconField.error ?? undefined : undefined}
                  successMessage={iconField.isValid ? "Champ valide" : undefined}
                  placeholder={DEFAULT_ICON}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Suggestions d&apos;icones</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {EMOJI_OPTIONS.map((option) => {
                  const active = draft.icon === option.emoji;
                  return (
                    <button
                      key={option.emoji}
                      type="button"
                      onClick={() => {
                        updateDraft({ icon: option.emoji });
                        iconField.setValue(option.emoji);
                      }}
                      className={cn(
                        "h-touch-sm rounded-radius-button border text-xl transition-all",
                        active
                          ? "border-brand-primary bg-brand-primary/15 text-brand-primary"
                          : "border-border-default bg-bg-surface-hover/60 text-text-secondary hover:bg-bg-surface-hover",
                      )}
                      aria-label={`Choisir ${option.label}`}
                    >
                      {option.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Couleur</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORY_COLOR_OPTIONS.map((option) => {
                  const active = option.key === draft.colorKey;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => updateDraft({ colorKey: option.key })}
                      className={cn(
                        "rounded-radius-button border px-3 py-2 text-left text-sm font-semibold transition-all",
                        option.badgeClass,
                        active ? "ring-2 ring-brand-primary" : "opacity-90 hover:opacity-100",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Type par defaut</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {PLAN_ACTIONABLE_KIND_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateDraft({ defaultItemKind: option.value })}
                    className={cn(
                      "rounded-radius-button border px-3 py-2 text-left text-sm transition-all",
                      option.badgeClass,
                      draft.defaultItemKind === option.value
                        ? "ring-2 ring-brand-primary"
                        : "opacity-90 hover:opacity-100",
                    )}
                  >
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs text-text-secondary">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={isPending}>
                Ajouter
              </Button>
              <Badge className={previewColor.badgeClass}>
                {draft.icon || "*"} {draft.name || "Nouvelle categorie"}
              </Badge>
              <Badge className={PLAN_ACTIONABLE_KIND_OPTIONS.find((option) => option.value === draft.defaultItemKind)?.badgeClass}>
                {getPlanActionableKindLabel(draft.defaultItemKind)}
              </Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      {sortedCategories.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Aucune categorie configuree pour le moment.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sortedCategories.map((category) => {
          const color = getCategoryColorOption(category.colorKey);
          const categoryDefaultKind = categoryKind(category.defaultItemKind);
          const isEditing = editingId === category.id;

          return (
            <Card key={category.id} className="h-full">
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Nom</label>
                      <Input
                        value={editingDraft.name}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">Icone</label>
                      <Input
                        value={editingDraft.icon}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, icon: event.target.value }))
                        }
                        maxLength={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORY_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() =>
                            setEditingDraft((current) => ({ ...current, colorKey: option.key }))
                          }
                          className={cn(
                            "rounded-radius-button border px-2 py-1.5 text-xs font-semibold",
                            option.badgeClass,
                            editingDraft.colorKey === option.key ? "ring-2 ring-brand-primary" : "",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Type par defaut</p>
                      <div className="grid gap-2">
                        {PLAN_ACTIONABLE_KIND_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setEditingDraft((current) => ({ ...current, defaultItemKind: option.value }))
                            }
                            className={cn(
                              "rounded-radius-button border px-2 py-1.5 text-left text-xs font-semibold",
                              option.badgeClass,
                              editingDraft.defaultItemKind === option.value ? "ring-2 ring-brand-primary" : "",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" loading={isPending} onClick={saveEdit}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={color.badgeClass}>
                        {category.icon} {category.name}
                      </Badge>
                      <div
                        className="size-4 rounded-radius-pill border border-border-default bg-bg-surface-hover"
                        style={{ backgroundColor: `rgb(var(--${category.colorKey.replace("category-", "color-cat-")}))` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={PLAN_ACTIONABLE_KIND_OPTIONS.find((option) => option.value === categoryDefaultKind)?.badgeClass}>
                        {getPlanActionableKindLabel(categoryDefaultKind)}
                      </Badge>
                      <p className="text-xs text-text-muted">Type par defaut</p>
                    </div>
                    <p className="text-xs text-text-muted">Cle couleur : {category.colorKey}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(category)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => deleteCategory(category.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
