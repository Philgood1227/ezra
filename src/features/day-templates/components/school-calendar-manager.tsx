"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createSchoolPeriodAction,
  deleteSchoolPeriodAction,
  updateSchoolPeriodAction,
} from "@/lib/actions/day-templates";
import type { SchoolPeriodSummary } from "@/lib/day-templates/types";

interface SchoolCalendarManagerProps {
  periods: SchoolPeriodSummary[];
}

interface PeriodDraft {
  periodType: "vacances" | "jour_special";
  label: string;
  startDate: string;
  endDate: string;
}

const DEFAULT_DRAFT: PeriodDraft = {
  periodType: "vacances",
  label: "",
  startDate: "",
  endDate: "",
};

export function SchoolCalendarManager({ periods }: SchoolCalendarManagerProps): React.JSX.Element {
  const [draft, setDraft] = useState<PeriodDraft>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedPeriods = [...periods].sort((left, right) => left.startDate.localeCompare(right.startDate));

  function resetDraft(): void {
    setDraft(DEFAULT_DRAFT);
    setEditingId(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    if (!draft.label.trim() || !draft.startDate || !draft.endDate) {
      setFeedback({ tone: "error", message: "Complete les champs obligatoires." });
      return;
    }

    startTransition(async () => {
      const action = editingId
        ? updateSchoolPeriodAction(editingId, {
            periodType: draft.periodType,
            label: draft.label,
            startDate: draft.startDate,
            endDate: draft.endDate,
          })
        : createSchoolPeriodAction({
            periodType: draft.periodType,
            label: draft.label,
            startDate: draft.startDate,
            endDate: draft.endDate,
          });

      const result = await action;
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la periode." });
        return;
      }

      setFeedback({ tone: "success", message: editingId ? "Periode mise a jour." : "Periode ajoutee." });
      resetDraft();
    });
  }

  function handleDelete(periodId: string): void {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteSchoolPeriodAction(periodId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer la periode." });
        return;
      }

      if (editingId === periodId) {
        resetDraft();
      }
      setFeedback({ tone: "success", message: "Periode supprimee." });
    });
  }

  function handleEdit(period: SchoolPeriodSummary): void {
    setEditingId(period.id);
    setDraft({
      periodType: period.periodType,
      label: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendrier scolaire</CardTitle>
        <CardDescription>
          Vacances et jours speciaux (base Geneve), personnalisables pour la famille.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
          <div className="space-y-1 xl:col-span-1">
            <label htmlFor="period-type" className="text-sm font-semibold text-text-secondary">
              Type
            </label>
            <Select
              id="period-type"
              value={draft.periodType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  periodType: event.target.value as "vacances" | "jour_special",
                }))
              }
            >
              <option value="vacances">Vacances</option>
              <option value="jour_special">Jour special</option>
            </Select>
          </div>

          <div className="space-y-1 xl:col-span-2">
            <label htmlFor="period-label" className="text-sm font-semibold text-text-secondary">
              Libelle
            </label>
            <Input
              id="period-label"
              value={draft.label}
              onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="Vacances d'hiver"
              required
            />
          </div>

          <div className="space-y-1 xl:col-span-1">
            <label htmlFor="period-start" className="text-sm font-semibold text-text-secondary">
              Debut
            </label>
            <Input
              id="period-start"
              type="date"
              value={draft.startDate}
              onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1 xl:col-span-1">
            <label htmlFor="period-end" className="text-sm font-semibold text-text-secondary">
              Fin
            </label>
            <Input
              id="period-end"
              type="date"
              value={draft.endDate}
              onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
              required
            />
          </div>

          <div className="xl:col-span-5 flex flex-wrap gap-2">
            <Button type="submit" loading={isPending}>
              {editingId ? "Mettre a jour" : "Ajouter la periode"}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetDraft}>
                Annuler
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-2">
          {sortedPeriods.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucune periode configuree pour le moment.</p>
          ) : (
            sortedPeriods.map((period) => (
              <article
                key={period.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3"
              >
                <div>
                  <p className="font-semibold text-text-primary">{period.label}</p>
                  <p className="text-sm text-text-secondary">
                    {period.periodType === "vacances" ? "Vacances" : "Jour special"} · {period.startDate} → {period.endDate}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(period)}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(period.id)}>
                    Supprimer
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
