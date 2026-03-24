"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  Select,
  TextArea,
} from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createSchoolDiaryEntryAction,
  deleteSchoolDiaryEntryAction,
  updateSchoolDiaryEntryAction,
} from "@/lib/actions/school-diary";
import { useFormField } from "@/lib/hooks/useFormField";
import { useParentFeedback } from "@/lib/hooks/useParentFeedback";
import type {
  SchoolDiaryEntryInput,
  SchoolDiaryEntrySummary,
  SchoolDiaryEntryType,
  SchoolDiaryRecurrencePattern,
} from "@/lib/day-templates/types";

interface SchoolDiaryManagerProps {
  childName: string;
  entries: SchoolDiaryEntrySummary[];
}

const ENTRY_TYPE_OPTIONS: Array<{ value: SchoolDiaryEntryType; label: string }> = [
  { value: "devoir", label: "Devoir" },
  { value: "evaluation", label: "Evaluation" },
  { value: "sortie", label: "Sortie" },
  { value: "piscine", label: "Piscine" },
  { value: "info", label: "Info" },
];

const RECURRENCE_OPTIONS: Array<{ value: SchoolDiaryRecurrencePattern; label: string }> = [
  { value: "none", label: "Aucune recurrence" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly", label: "Chaque mois" },
];

const EMPTY_DRAFT: SchoolDiaryEntryInput = {
  type: "devoir",
  subject: null,
  title: "",
  description: null,
  date: "",
  recurrencePattern: "none",
  recurrenceUntilDate: null,
};

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}/${month}/${year}`;
}

function recurrenceLabel(entry: SchoolDiaryEntrySummary): string | null {
  if (entry.recurrencePattern === "none") {
    return null;
  }
  const value =
    entry.recurrencePattern === "weekly"
      ? "Hebdomadaire"
      : entry.recurrencePattern === "biweekly"
        ? "Toutes les 2 semaines"
        : "Mensuelle";
  if (!entry.recurrenceUntilDate) {
    return value;
  }
  return `${value} jusqu'au ${formatDateLabel(entry.recurrenceUntilDate)}`;
}

export function SchoolDiaryManager({ childName, entries }: SchoolDiaryManagerProps): React.JSX.Element {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const { feedback, showFeedback, clearFeedback } = useParentFeedback();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"future" | "past" | "all">("future");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<SchoolDiaryEntrySummary | null>(null);
  const [draft, setDraft] = useState<SchoolDiaryEntryInput>(EMPTY_DRAFT);

  const dateField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length > 0 ? null : "Date requise"),
  });
  const titleField = useFormField({
    initialValue: "",
    validate: (value) => (value.trim().length >= 2 ? null : "Titre requis"),
  });

  const todayKey = useMemo(() => getTodayDateKey(), []);
  const futureCount = useMemo(
    () => entries.filter((entry) => entry.date >= todayKey).length,
    [entries, todayKey],
  );
  const pastCount = useMemo(
    () => entries.filter((entry) => entry.date < todayKey).length,
    [entries, todayKey],
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filter === "all") {
        return true;
      }
      if (filter === "future") {
        return entry.date >= todayKey;
      }
      return entry.date < todayKey;
    });
  }, [entries, filter, todayKey]);

  function updateDraft(patch: Partial<SchoolDiaryEntryInput>): void {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function resetForm(): void {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    dateField.reset("");
    titleField.reset("");
  }

  function startEdit(entry: SchoolDiaryEntrySummary): void {
    setEditingId(entry.id);
    setDraft({
      type: entry.type,
      subject: entry.subject,
      title: entry.title,
      description: entry.description,
      date: entry.date,
      recurrencePattern: entry.recurrencePattern,
      recurrenceUntilDate: entry.recurrenceUntilDate,
    });
    dateField.reset(entry.date);
    titleField.reset(entry.title);
    clearFeedback();
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function submitEntry(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    clearFeedback();
    dateField.markTouched();
    titleField.markTouched();
    const dateError = dateField.validateNow();
    const titleError = titleField.validateNow();
    if (dateError || titleError) {
      showFeedback({ tone: "error", message: "Veuillez corriger les champs requis." });
      return;
    }

    startTransition(async () => {
      const payload: SchoolDiaryEntryInput = {
        type: draft.type,
        date: draft.date,
        title: draft.title.trim(),
        subject: draft.subject?.trim() ? draft.subject.trim() : null,
        description: draft.description?.trim() ? draft.description.trim() : null,
        recurrencePattern: draft.recurrencePattern ?? "none",
        recurrenceUntilDate:
          draft.recurrencePattern && draft.recurrencePattern !== "none"
            ? draft.recurrenceUntilDate ?? null
            : null,
      };

      const result = editingId
        ? await updateSchoolDiaryEntryAction(editingId, payload)
        : await createSchoolDiaryEntryAction(payload);
      if (!result.success) {
        showFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer l'entree." });
        return;
      }

      showFeedback({
        tone: "success",
        message: editingId ? "Entree mise a jour." : "Entree ajoutee et checklist generee.",
      });
      resetForm();
      router.refresh();
    });
  }

  function requestDeleteEntry(entry: SchoolDiaryEntrySummary): void {
    if (isPending) {
      return;
    }
    setEntryToDelete(entry);
  }

  function cancelDeleteEntry(): void {
    if (isPending) {
      return;
    }
    setEntryToDelete(null);
  }

  function confirmDeleteEntry(): void {
    if (!entryToDelete) {
      return;
    }

    clearFeedback();
    startTransition(async () => {
      const result = await deleteSchoolDiaryEntryAction(entryToDelete.id);
      if (!result.success) {
        showFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer l'entree." });
        return;
      }

      if (editingId === entryToDelete.id) {
        resetForm();
      }
      showFeedback({ tone: "success", message: "Entree supprimee." });
      setEntryToDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card surface="child">
        <CardHeader>
          <CardTitle>Carnet de {childName}</CardTitle>
          <CardDescription>Vue rapide des elements a venir et historiques.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">A venir</p>
            <p className="text-xl font-bold text-text-primary">{futureCount}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Passe</p>
            <p className="text-xl font-bold text-text-primary">{pastCount}</p>
          </div>
          <div className="rounded-radius-button bg-bg-surface-hover/70 px-3 py-2">
            <p className="text-xs text-text-secondary">Total</p>
            <p className="text-xl font-bold text-text-primary">{entries.length}</p>
          </div>
        </CardContent>
      </Card>

      <div ref={formRef}>
        <Card surface="glass">
          <CardHeader>
            <CardTitle>{editingId ? "Modifier une entree" : "Ajouter une entree"}</CardTitle>
            <CardDescription>Formulaire parent en une colonne, avec validations inline.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitEntry}>
              <div className="space-y-1">
                <label htmlFor="diary-type" className="text-sm font-semibold text-text-secondary">
                  Type
                </label>
                <Select
                  id="diary-type"
                  value={draft.type}
                  onChange={(event) => updateDraft({ type: event.target.value as SchoolDiaryEntryType })}
                >
                  {ENTRY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label htmlFor="diary-date" className="text-sm font-semibold text-text-secondary">
                  Date
                </label>
                <Input
                  id="diary-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateDraft({ date: value });
                    dateField.setValue(value);
                  }}
                  onBlur={dateField.markTouched}
                  errorMessage={dateField.hasError ? dateField.error ?? undefined : undefined}
                  successMessage={dateField.isValid ? "Champ valide" : undefined}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="diary-recurrence-pattern" className="text-sm font-semibold text-text-secondary">
                  Recurrence
                </label>
                <Select
                  id="diary-recurrence-pattern"
                  value={draft.recurrencePattern ?? "none"}
                  onChange={(event) =>
                    updateDraft({
                      recurrencePattern: event.target.value as SchoolDiaryRecurrencePattern,
                      recurrenceUntilDate:
                        event.target.value === "none"
                          ? null
                          : draft.recurrenceUntilDate ?? draft.date,
                    })
                  }
                >
                  {RECURRENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {(draft.recurrencePattern ?? "none") !== "none" ? (
                <div className="space-y-1">
                  <label htmlFor="diary-recurrence-until" className="text-sm font-semibold text-text-secondary">
                    Fin de recurrence
                  </label>
                  <Input
                    id="diary-recurrence-until"
                    type="date"
                    value={draft.recurrenceUntilDate ?? draft.date}
                    onChange={(event) => updateDraft({ recurrenceUntilDate: event.target.value || null })}
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-1">
                <label htmlFor="diary-subject" className="text-sm font-semibold text-text-secondary">
                  Matiere (optionnel)
                </label>
                <Input
                  id="diary-subject"
                  value={draft.subject ?? ""}
                  onChange={(event) => updateDraft({ subject: event.target.value })}
                  placeholder="Maths"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="diary-title" className="text-sm font-semibold text-text-secondary">
                  Titre
                </label>
                <Input
                  id="diary-title"
                  value={draft.title}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateDraft({ title: value });
                    titleField.setValue(value);
                  }}
                  onBlur={titleField.markTouched}
                  errorMessage={titleField.hasError ? titleField.error ?? undefined : undefined}
                  successMessage={titleField.isValid ? "Champ valide" : undefined}
                  placeholder="Exercices page 12"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="diary-description" className="text-sm font-semibold text-text-secondary">
                  Description (optionnel)
                </label>
                <TextArea
                  id="diary-description"
                  rows={3}
                  value={draft.description ?? ""}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="Consignes complementaires"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="premium" loading={isPending}>
                  {editingId ? "Enregistrer" : "Ajouter"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="glass" onClick={resetForm}>
                    Annuler
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {feedback ? <ParentFeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <Card surface="glass">
        <CardHeader className="space-y-3">
          <CardTitle>Entrees du carnet</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={filter === "future" ? "premium" : "glass"} onClick={() => setFilter("future")}>
              A venir
            </Button>
            <Button size="sm" variant={filter === "past" ? "premium" : "glass"} onClick={() => setFilter("past")}>
              Passe
            </Button>
            <Button size="sm" variant={filter === "all" ? "premium" : "glass"} onClick={() => setFilter("all")}>
              Tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucune entree pour ce filtre.</p>
          ) : (
            filteredEntries.map((entry) => {
              const expanded = expandedEntryId === entry.id;
              const recurrence = recurrenceLabel(entry);
              return (
                <article key={entry.id} className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="neutral">{entry.type}</Badge>
                        <p className="text-xs text-text-secondary">{formatDateLabel(entry.date)}</p>
                        {recurrence ? <Badge variant="neutral">{recurrence}</Badge> : null}
                      </div>
                      <p className="font-semibold text-text-primary">{entry.title}</p>
                      {entry.subject ? <p className="text-sm text-text-secondary">{entry.subject}</p> : null}
                      {expanded && entry.description ? (
                        <p className="rounded-radius-button bg-bg-surface px-3 py-2 text-sm text-text-secondary">
                          {entry.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.description ? (
                        <Button
                          size="sm"
                          variant="glass"
                          onClick={() => setExpandedEntryId(expanded ? null : entry.id)}
                        >
                          {expanded ? "Replier" : "Details"}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="glass" onClick={() => startEdit(entry)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="danger" disabled={isPending} onClick={() => requestDeleteEntry(entry)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={entryToDelete !== null}
        title="Supprimer cette entree ?"
        {...(entryToDelete
          ? {
              description: `L'entree "${entryToDelete.title}" sera supprimee.`,
            }
          : {})}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={isPending}
        onCancel={cancelDeleteEntry}
        onConfirm={confirmDeleteEntry}
      />
    </div>
  );
}
