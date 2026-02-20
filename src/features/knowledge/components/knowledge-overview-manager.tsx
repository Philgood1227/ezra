"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ds";
import { ParentFeedbackBanner } from "@/components/feedback/parent-feedback-banner";
import {
  createKnowledgeSubjectAction,
  deleteKnowledgeSubjectAction,
  updateKnowledgeSubjectAction,
} from "@/lib/actions/knowledge";
import type { KnowledgeSubjectSummary } from "@/lib/day-templates/types";

interface KnowledgeOverviewManagerProps {
  subjects: KnowledgeSubjectSummary[];
}

interface SubjectDraft {
  code: string;
  label: string;
}

const EMPTY_DRAFT: SubjectDraft = {
  code: "",
  label: "",
};

export function KnowledgeOverviewManager({ subjects }: KnowledgeOverviewManagerProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SubjectDraft>(EMPTY_DRAFT);

  function resetForm(): void {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(subject: KnowledgeSubjectSummary): void {
    setEditingId(subject.id);
    setDraft({
      code: subject.code,
      label: subject.label,
    });
    setFeedback(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const payload = {
        code: draft.code.trim() || draft.label.trim(),
        label: draft.label.trim(),
      };

      const result = editingId
        ? await updateKnowledgeSubjectAction(editingId, payload)
        : await createKnowledgeSubjectAction(payload);

      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible d'enregistrer la matiere." });
        return;
      }

      setFeedback({ tone: "success", message: editingId ? "Matiere mise a jour." : "Matiere ajoutee." });
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(subjectId: string): void {
    if (!window.confirm("Supprimer cette matiere et ses fiches ?")) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await deleteKnowledgeSubjectAction(subjectId);
      if (!result.success) {
        setFeedback({ tone: "error", message: result.error ?? "Impossible de supprimer cette matiere." });
        return;
      }

      if (editingId === subjectId) {
        resetForm();
      }

      setFeedback({ tone: "success", message: "Matiere supprimee." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-brand-200 bg-brand-50">
        <CardHeader>
          <CardTitle>Vue rapide connaissances</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Matieres: <span className="font-semibold text-ink-strong">{subjects.length}</span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Categories:{" "}
            <span className="font-semibold text-ink-strong">
              {subjects.reduce((sum, subject) => sum + subject.categoryCount, 0)}
            </span>
          </p>
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-ink-muted">
            Fiches:{" "}
            <span className="font-semibold text-ink-strong">
              {subjects.reduce((sum, subject) => sum + subject.cardCount, 0)}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Modifier une matiere" : "Ajouter une matiere"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 rounded-xl bg-surface-elevated px-3 py-2 text-sm text-ink-muted">
            Pattern parent: une matiere claire, un code stable, puis gestion detaillee des fiches.
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="knowledge-subject-label" className="text-sm font-semibold text-ink-muted">
                  Nom de la matiere
                </label>
                <Input
                  id="knowledge-subject-label"
                  value={draft.label}
                  onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Maths"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="knowledge-subject-code" className="text-sm font-semibold text-ink-muted">
                  Code
                </label>
                <Input
                  id="knowledge-subject-code"
                  value={draft.code}
                  onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                  placeholder="maths"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isPending}>
                {editingId ? "Enregistrer" : "Ajouter"}
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

      {feedback ? <ParentFeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {subjects.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-ink-muted">Aucune matiere pour le moment.</p>
            </CardContent>
          </Card>
        ) : null}

        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">{subject.label}</CardTitle>
              <p className="text-sm text-ink-muted">
                {subject.categoryCount} categories - {subject.cardCount} fiches
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href={`/parent/knowledge/${subject.id}`}
                className="inline-flex h-9 items-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white"
              >
                Gerer les fiches
              </Link>
              <Button size="sm" variant="secondary" onClick={() => startEdit(subject)}>
                Modifier
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(subject.id)} disabled={isPending}>
                Supprimer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
