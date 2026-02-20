"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createRewardTierAction,
  deleteRewardTierAction,
  updateRewardTierAction,
} from "@/lib/actions/rewards";
import { useFormField } from "@/lib/hooks/useFormField";
import type { RewardTierInput, RewardTierSummary } from "@/lib/day-templates/types";

interface RewardsManagerProps {
  rewardTiers: RewardTierSummary[];
}

const EMPTY_DRAFT: RewardTierInput = {
  label: "",
  description: null,
  pointsRequired: 30,
  sortOrder: 0,
};

export function RewardsManager({ rewardTiers }: RewardsManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RewardTierInput>(EMPTY_DRAFT);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const labelField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Nom requis"),
  });
  const pointsField = useFormField({
    initialValue: String(EMPTY_DRAFT.pointsRequired),
    validate: (value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return "Points requis invalides";
      }
      return null;
    },
  });

  const sortedTiers = useMemo(
    () =>
      [...rewardTiers].sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.pointsRequired - right.pointsRequired;
      }),
    [rewardTiers],
  );

  function resetForm(): void {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    labelField.reset("");
    pointsField.reset(String(EMPTY_DRAFT.pointsRequired));
  }

  function startEdit(tier: RewardTierSummary): void {
    setEditingId(tier.id);
    setDraft({
      label: tier.label,
      description: tier.description,
      pointsRequired: tier.pointsRequired,
      sortOrder: tier.sortOrder,
    });
    labelField.reset(tier.label);
    pointsField.reset(String(tier.pointsRequired));
    setFeedback(null);
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    labelField.markTouched();
    pointsField.markTouched();
    const labelError = labelField.validateNow();
    const pointsError = pointsField.validateNow();
    if (labelError || pointsError) {
      setFeedback({ tone: "error", message: "Veuillez corriger les champs requis." });
      return;
    }

    startTransition(async () => {
      const payload: RewardTierInput = {
        label: draft.label.trim(),
        description: draft.description?.trim() ? draft.description.trim() : null,
        pointsRequired: Math.max(0, Math.trunc(draft.pointsRequired)),
        sortOrder: Math.max(0, Math.trunc(draft.sortOrder)),
      };

      const result = editingId
        ? await updateRewardTierAction(editingId, payload)
        : await createRewardTierAction(payload);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la recompense." });
        return;
      }

      setFeedback({
        tone: "success",
        message: editingId ? "Recompense mise a jour." : "Recompense ajoutee.",
      });
      resetForm();
      router.refresh();
    });
  }

  function deleteTier(id: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteRewardTierAction(id);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer cette recompense." });
        return;
      }
      setFeedback({ tone: "success", message: "Recompense supprimee." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Modifier un palier" : "Ajouter un palier de recompense"}</CardTitle>
          <CardDescription>
            Nom, points et ordre d&apos;affichage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitForm}>
            <div className="space-y-1">
              <label htmlFor="reward-label" className="text-sm font-semibold text-text-secondary">
                Nom du palier
              </label>
              <Input
                id="reward-label"
                value={draft.label}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, label: value }));
                  labelField.setValue(value);
                }}
                onBlur={labelField.markTouched}
                errorMessage={labelField.hasError ? labelField.error ?? undefined : undefined}
                successMessage={labelField.isValid ? "Champ valide" : undefined}
                placeholder="30 min d'ecran"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="reward-points" className="text-sm font-semibold text-text-secondary">
                  Points requis
                </label>
                <Input
                  id="reward-points"
                  type="number"
                  min={0}
                  value={draft.pointsRequired}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, pointsRequired: Number(value || 0) }));
                    pointsField.setValue(value);
                  }}
                  onBlur={pointsField.markTouched}
                  errorMessage={pointsField.hasError ? pointsField.error ?? undefined : undefined}
                  successMessage={pointsField.isValid ? "Champ valide" : undefined}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="reward-sort-order" className="text-sm font-semibold text-text-secondary">
                  Ordre
                </label>
                <Input
                  id="reward-sort-order"
                  type="number"
                  min={0}
                  value={draft.sortOrder}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="reward-description" className="text-sm font-semibold text-text-secondary">
                Description (optionnel)
              </label>
              <Input
                id="reward-description"
                value={draft.description ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Choix du dessert"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isPending}>
                {editingId ? "Enregistrer" : "Ajouter une recompense"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Annuler
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Recompenses</CardTitle>
          <CardDescription>Liste ordonnee des paliers actifs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedTiers.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucun palier configure.</p>
          ) : (
            sortedTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 px-3 py-3"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-text-primary">{tier.label}</p>
                  <p className="text-sm text-text-secondary">{tier.pointsRequired} points</p>
                  {tier.description ? <p className="text-xs text-text-muted">{tier.description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(tier)}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" disabled={isPending} onClick={() => deleteTier(tier.id)}>
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
