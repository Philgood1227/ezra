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
  TextArea,
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createCustomAchievementAction,
  toggleAchievementAutoTriggerAction,
} from "@/lib/actions/achievements";
import { extractAchievementConditionHint } from "@/lib/domain/achievements";
import { useFormField } from "@/lib/hooks/useFormField";
import type { AchievementCategorySummary, AchievementSummary } from "@/lib/day-templates/types";

interface ParentAchievementsManagerProps {
  categories: AchievementCategorySummary[];
  achievements: AchievementSummary[];
}

type ConditionType = "daily_points_at_least" | "tasks_completed_in_row" | "pomodoros_completed";

interface CreateDraft {
  categoryId: string;
  icon: string;
  label: string;
  description: string;
  conditionType: ConditionType;
  conditionValue: number;
  autoTrigger: boolean;
}

const DEFAULT_DRAFT: CreateDraft = {
  categoryId: "",
  icon: "🏅",
  label: "",
  description: "",
  conditionType: "daily_points_at_least",
  conditionValue: 20,
  autoTrigger: true,
};

function conditionLabel(value: ConditionType): string {
  if (value === "daily_points_at_least") {
    return "Points dans la journee";
  }
  if (value === "tasks_completed_in_row") {
    return "Jours consecutifs termines";
  }
  return "Pomodoros completes";
}

export function ParentAchievementsManager({
  categories,
  achievements,
}: ParentAchievementsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(() => categories.map((entry) => entry.id));
  const [draft, setDraft] = useState<CreateDraft>({
    ...DEFAULT_DRAFT,
    categoryId: categories[0]?.id ?? "",
  });

  const labelField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Nom du succes requis"),
  });
  const iconField = useFormField({
    initialValue: DEFAULT_DRAFT.icon,
    validate: (value) => (value.trim().length > 0 ? null : "Icone requise"),
  });

  const grouped = useMemo(
    () =>
      categories.map((category) => ({
        category,
        achievements: achievements
          .filter((achievement) => achievement.categoryId === category.id)
          .sort((left, right) => left.label.localeCompare(right.label, "fr")),
      })),
    [achievements, categories],
  );
  const autoActiveCount = achievements.filter((achievement) => achievement.autoTrigger).length;

  function toggleCategory(categoryId: string): void {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  function toggleAutoTrigger(achievementId: string, enabled: boolean): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleAchievementAutoTriggerAction({ achievementId, enabled });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de modifier le succes." });
        return;
      }
      setFeedback({ tone: "success", message: enabled ? "Succes active." : "Succes desactive." });
      router.refresh();
    });
  }

  function submitCreate(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);
    labelField.markTouched();
    iconField.markTouched();
    const labelError = labelField.validateNow();
    const iconError = iconField.validateNow();
    if (labelError || iconError || !draft.categoryId) {
      setFeedback({ tone: "error", message: "Veuillez corriger les champs requis." });
      return;
    }

    startTransition(async () => {
      const result = await createCustomAchievementAction({
        categoryId: draft.categoryId,
        icon: draft.icon.trim(),
        label: draft.label.trim(),
        description: draft.description.trim() ? draft.description.trim() : null,
        conditionType: draft.conditionType,
        conditionValue: Math.max(1, Math.trunc(draft.conditionValue)),
        autoTrigger: draft.autoTrigger,
      });
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de creer ce succes." });
        return;
      }
      setFeedback({ tone: "success", message: "Succes personnalise cree." });
      setDraft((current) => ({ ...current, label: "", description: "" }));
      labelField.reset("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vue rapide succes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Categories</p>
            <p className="text-xl font-bold text-text-primary">{categories.length}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Succes total</p>
            <p className="text-xl font-bold text-text-primary">{achievements.length}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Auto actifs</p>
            <p className="text-xl font-bold text-text-primary">{autoActiveCount}</p>
          </div>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Creer un succes personnalise</CardTitle>
          <CardDescription>Nom, condition et activation automatique.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="space-y-1">
              <label htmlFor="achievement-category" className="text-sm font-semibold text-text-secondary">
                Categorie
              </label>
              <Select
                id="achievement-category"
                value={draft.categoryId}
                onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="achievement-icon" className="text-sm font-semibold text-text-secondary">
                  Icone
                </label>
                <Input
                  id="achievement-icon"
                  value={draft.icon}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, icon: value }));
                    iconField.setValue(value);
                  }}
                  onBlur={iconField.markTouched}
                  errorMessage={iconField.hasError ? iconField.error ?? undefined : undefined}
                  successMessage={iconField.isValid ? "Champ valide" : undefined}
                  placeholder="🏅"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="achievement-label" className="text-sm font-semibold text-text-secondary">
                  Nom du succes
                </label>
                <Input
                  id="achievement-label"
                  value={draft.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, label: value }));
                    labelField.setValue(value);
                  }}
                  onBlur={labelField.markTouched}
                  errorMessage={labelField.hasError ? labelField.error ?? undefined : undefined}
                  successMessage={labelField.isValid ? "Champ valide" : undefined}
                  placeholder="Routine du matin"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="achievement-description" className="text-sm font-semibold text-text-secondary">
                Description
              </label>
              <TextArea
                id="achievement-description"
                rows={2}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Visible dans la page succes enfant."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="achievement-condition-type" className="text-sm font-semibold text-text-secondary">
                  Condition
                </label>
                <Select
                  id="achievement-condition-type"
                  value={draft.conditionType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      conditionType: event.target.value as ConditionType,
                    }))
                  }
                >
                  <option value="daily_points_at_least">{conditionLabel("daily_points_at_least")}</option>
                  <option value="tasks_completed_in_row">{conditionLabel("tasks_completed_in_row")}</option>
                  <option value="pomodoros_completed">{conditionLabel("pomodoros_completed")}</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="achievement-condition-value" className="text-sm font-semibold text-text-secondary">
                  Seuil
                </label>
                <Input
                  id="achievement-condition-value"
                  type="number"
                  min={1}
                  max={999}
                  value={draft.conditionValue}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, conditionValue: Number(event.target.value || 1) }))
                  }
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.autoTrigger}
                onChange={(event) => setDraft((current) => ({ ...current, autoTrigger: event.target.checked }))}
                className="size-4 rounded border-border-default"
              />
              Deblocage automatique actif
            </label>

            <Button type="submit" loading={isPending}>
              Creer le succes
            </Button>
          </form>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Aucun succes configure.</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => {
          const expanded = expandedCategoryIds.includes(group.category.id);
          return (
            <Card key={group.category.id}>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => toggleCategory(group.category.id)}
                >
                  <CardTitle className="text-lg">{group.category.label}</CardTitle>
                  <Badge variant="neutral">{group.achievements.length}</Badge>
                </button>
                <Button size="sm" variant="ghost" onClick={() => toggleCategory(group.category.id)}>
                  {expanded ? "Replier" : "Deplier"}
                </Button>
              </CardHeader>
              {expanded ? (
                <CardContent className="space-y-3">
                  {group.achievements.length === 0 ? (
                    <p className="text-sm text-text-secondary">Aucun badge dans cette categorie.</p>
                  ) : (
                    group.achievements.map((achievement) => (
                      <article
                        key={achievement.id}
                        className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-text-primary">
                                {achievement.icon} {achievement.label}
                              </p>
                              <Badge variant="neutral">{achievement.autoTrigger ? "Auto" : "Manuel"}</Badge>
                            </div>
                            {achievement.description ? (
                              <p className="text-sm text-text-secondary">{achievement.description}</p>
                            ) : null}
                            <p className="text-xs text-text-muted">
                              {extractAchievementConditionHint(achievement.condition)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={achievement.autoTrigger ? "secondary" : "primary"}
                            disabled={isPending}
                            onClick={() => toggleAutoTrigger(achievement.id, !achievement.autoTrigger)}
                          >
                            {achievement.autoTrigger ? "Desactiver auto" : "Activer auto"}
                          </Button>
                        </div>
                      </article>
                    ))
                  )}
                </CardContent>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}

