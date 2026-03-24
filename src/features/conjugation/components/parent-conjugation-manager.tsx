"use client";

import * as React from "react";
import {
  deleteConjugationExerciseAction,
  duplicateConjugationExerciseAction,
  generateConjugationExerciseWithAIAction,
  importConjugationExerciseWithAIAction,
  saveConjugationSheetAction,
  setConjugationExercisePublishedAction,
  upsertConjugationExerciseAction,
} from "@/lib/actions/conjugation";
import {
  type ConjugationExerciseContent,
  type ConjugationExerciseDraft,
  type ConjugationExerciseParentStats,
  type ConjugationExerciseRecord,
  type ConjugationExerciseType,
  type ConjugationParentPageData,
  type ConjugationTimeKey,
} from "@/lib/conjugation/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  RichTextEditor,
  Select,
  TextArea,
} from "@/components/ds";

type ExerciseCreationMode = "manual" | "ai" | "import";

const EXERCISE_TYPE_OPTIONS: Array<{
  value: ConjugationExerciseType;
  label: string;
}> = [
  { value: "qcm", label: "QCM" },
  { value: "fill_blank", label: "Phrases a trous" },
  { value: "match", label: "Associer pronom et forme" },
  { value: "transform", label: "Transformer au temps demande" },
];

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createUid(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function createContentForType(type: ConjugationExerciseType): ConjugationExerciseContent {
  if (type === "qcm") {
    return {
      type,
      questions: [
        {
          id: createUid("qcm"),
          prompt: "Choisis la bonne conjugaison.",
          choices: ["", "", ""],
          answer: "",
        },
      ],
    };
  }

  if (type === "fill_blank") {
    return {
      type,
      questions: [
        {
          id: createUid("fill"),
          prompt: "Complete la phrase avec la bonne forme.",
          answer: "",
        },
      ],
    };
  }

  if (type === "transform") {
    return {
      type,
      questions: [
        {
          id: createUid("transform"),
          prompt: "Je joue dans la cour.",
          instruction: "Mets la phrase au passe compose.",
          answer: "",
        },
      ],
    };
  }

  return {
    type,
    questions: [
      {
        id: createUid("match"),
        instruction: "Associe chaque pronom avec la bonne forme.",
        pairs: [
          { id: createUid("pair"), left: "je", right: "" },
          { id: createUid("pair"), left: "tu", right: "" },
          { id: createUid("pair"), left: "il/elle", right: "" },
        ],
      },
    ],
  };
}

function createEmptyDraft(timeKey: ConjugationTimeKey): ConjugationExerciseDraft {
  return {
    title: "Nouvel exercice de conjugaison",
    timeKey,
    status: "draft",
    content: createContentForType("qcm"),
  };
}

function cloneContent(content: ConjugationExerciseContent): ConjugationExerciseContent {
  return JSON.parse(JSON.stringify(content)) as ConjugationExerciseContent;
}

function cloneDraft(draft: ConjugationExerciseDraft): ConjugationExerciseDraft {
  return {
    ...draft,
    content: cloneContent(draft.content),
  };
}

function toDraftFromExercise(exercise: ConjugationExerciseRecord): ConjugationExerciseDraft {
  return {
    title: exercise.title,
    timeKey: exercise.timeKey,
    status: exercise.status,
    content: cloneContent(exercise.content),
  };
}

interface ParentConjugationManagerProps {
  initialData: ConjugationParentPageData;
}

export function ParentConjugationManager({
  initialData,
}: ParentConjugationManagerProps): React.JSX.Element {
  const [activeTimeKey, setActiveTimeKey] = React.useState<ConjugationTimeKey>(
    initialData.timeDefinitions[0]?.key ?? "present-indicatif",
  );
  const [sheetsByTime, setSheetsByTime] = React.useState(initialData.sheetsByTime);
  const [exercises, setExercises] = React.useState(initialData.exercises);
  const [statsByExerciseId, setStatsByExerciseId] = React.useState(initialData.statsByExerciseId);
  const [message, setMessage] = React.useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [creationMode, setCreationMode] = React.useState<ExerciseCreationMode>("manual");
  const [editingExerciseId, setEditingExerciseId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ConjugationExerciseDraft>(() =>
    createEmptyDraft(activeTimeKey),
  );
  const [aiQuestionCount, setAiQuestionCount] = React.useState(6);
  const [importSourceText, setImportSourceText] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [expandedResultExerciseId, setExpandedResultExerciseId] = React.useState<string | null>(
    null,
  );

  const activeTimeDefinition = React.useMemo(
    () => initialData.timeDefinitions.find((entry) => entry.key === activeTimeKey),
    [activeTimeKey, initialData.timeDefinitions],
  );

  const activeSheet = sheetsByTime[activeTimeKey];

  const exercisesForActiveTime = React.useMemo(
    () =>
      exercises
        .filter((exercise) => exercise.timeKey === activeTimeKey)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [activeTimeKey, exercises],
  );

  function openCreateExerciseModal(mode: ExerciseCreationMode): void {
    setCreationMode(mode);
    setEditingExerciseId(null);
    setDraft(createEmptyDraft(activeTimeKey));
    setAiQuestionCount(6);
    setImportSourceText("");
    setMessage(null);
    setIsModalOpen(true);
  }

  function openEditExerciseModal(exercise: ConjugationExerciseRecord): void {
    setCreationMode("manual");
    setEditingExerciseId(exercise.id);
    setDraft(toDraftFromExercise(exercise));
    setAiQuestionCount(6);
    setImportSourceText("");
    setMessage(null);
    setIsModalOpen(true);
  }

  function updateSheetBlock(
    key: keyof (typeof activeSheet)["blocks"],
    valueHtml: string,
  ): void {
    setSheetsByTime((current) => ({
      ...current,
      [activeTimeKey]: {
        ...current[activeTimeKey],
        blocks: {
          ...current[activeTimeKey].blocks,
          [key]: valueHtml,
        },
      },
    }));
  }

  function saveActiveSheet(): void {
    const payload = {
      timeKey: activeTimeKey,
      blocks: sheetsByTime[activeTimeKey].blocks,
    };

    startTransition(async () => {
      const result = await saveConjugationSheetAction(payload);
      if (!result.success) {
        setMessage({
          tone: "error",
          text: result.error ?? "Impossible d'enregistrer la fiche.",
        });
        return;
      }
      setMessage({
        tone: "success",
        text: "Fiche enregistree.",
      });
    });
  }

  function changeDraftType(type: ConjugationExerciseType): void {
    setDraft((current) => ({
      ...current,
      content: createContentForType(type),
    }));
  }

  function addDraftQuestion(): void {
    setDraft((current) => {
      if (current.content.type === "qcm") {
        return {
          ...current,
          content: {
            ...current.content,
            questions: [
              ...current.content.questions,
              {
                id: createUid("qcm"),
                prompt: "Nouvelle question QCM",
                choices: ["", "", ""],
                answer: "",
              },
            ],
          },
        };
      }

      if (current.content.type === "fill_blank") {
        return {
          ...current,
          content: {
            ...current.content,
            questions: [
              ...current.content.questions,
              {
                id: createUid("fill"),
                prompt: "Nouvelle phrase a completer",
                answer: "",
              },
            ],
          },
        };
      }

      if (current.content.type === "transform") {
        return {
          ...current,
          content: {
            ...current.content,
            questions: [
              ...current.content.questions,
              {
                id: createUid("transform"),
                prompt: "Nouvelle phrase",
                instruction: "Mets la phrase au temps demande.",
                answer: "",
              },
            ],
          },
        };
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: [
            ...current.content.questions,
            {
              id: createUid("match"),
              instruction: "Associe pronom et forme.",
              pairs: [
                { id: createUid("pair"), left: "je", right: "" },
                { id: createUid("pair"), left: "tu", right: "" },
                { id: createUid("pair"), left: "il/elle", right: "" },
              ],
            },
          ],
        },
      };
    });
  }

  function removeDraftQuestion(questionId: string): void {
    setDraft((current) => {
      if (current.content.questions.length <= 1) {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.filter((question) => question.id !== questionId),
        } as ConjugationExerciseContent,
      };
    });
  }

  function updateQcmPrompt(questionId: string, value: string): void {
    setDraft((current) => {
      if (current.content.type !== "qcm") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  prompt: value,
                }
              : question,
          ),
        },
      };
    });
  }

  function updateQcmChoice(questionId: string, choiceIndex: number, value: string): void {
    setDraft((current) => {
      if (current.content.type !== "qcm") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) => {
            if (question.id !== questionId) {
              return question;
            }
            const nextChoices = [...question.choices];
            nextChoices[choiceIndex] = value;
            return {
              ...question,
              choices: nextChoices,
              answer:
                question.answer && !nextChoices.includes(question.answer) ? "" : question.answer,
            };
          }),
        },
      };
    });
  }

  function addQcmChoice(questionId: string): void {
    setDraft((current) => {
      if (current.content.type !== "qcm") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId && question.choices.length < 6
              ? {
                  ...question,
                  choices: [...question.choices, ""],
                }
              : question,
          ),
        },
      };
    });
  }

  function removeQcmChoice(questionId: string, choiceIndex: number): void {
    setDraft((current) => {
      if (current.content.type !== "qcm") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) => {
            if (question.id !== questionId || question.choices.length <= 3) {
              return question;
            }

            const nextChoices = question.choices.filter((_, index) => index !== choiceIndex);
            return {
              ...question,
              choices: nextChoices,
              answer:
                question.answer && !nextChoices.includes(question.answer) ? "" : question.answer,
            };
          }),
        },
      };
    });
  }

  function updateQcmAnswer(questionId: string, value: string): void {
    setDraft((current) => {
      if (current.content.type !== "qcm") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  answer: value,
                }
              : question,
          ),
        },
      };
    });
  }

  function updateFillQuestion(questionId: string, key: "prompt" | "answer", value: string): void {
    setDraft((current) => {
      if (current.content.type !== "fill_blank") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  [key]: value,
                }
              : question,
          ),
        },
      };
    });
  }

  function updateTransformQuestion(
    questionId: string,
    key: "prompt" | "instruction" | "answer",
    value: string,
  ): void {
    setDraft((current) => {
      if (current.content.type !== "transform") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  [key]: value,
                }
              : question,
          ),
        },
      };
    });
  }

  function updateMatchInstruction(questionId: string, value: string): void {
    setDraft((current) => {
      if (current.content.type !== "match") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  instruction: value,
                }
              : question,
          ),
        },
      };
    });
  }

  function updateMatchPair(
    questionId: string,
    pairId: string,
    key: "left" | "right",
    value: string,
  ): void {
    setDraft((current) => {
      if (current.content.type !== "match") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) => {
            if (question.id !== questionId) {
              return question;
            }
            return {
              ...question,
              pairs: question.pairs.map((pair) =>
                pair.id === pairId
                  ? {
                      ...pair,
                      [key]: value,
                    }
                  : pair,
              ),
            };
          }),
        },
      };
    });
  }

  function addMatchPair(questionId: string): void {
    setDraft((current) => {
      if (current.content.type !== "match") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  pairs: [...question.pairs, { id: createUid("pair"), left: "", right: "" }],
                }
              : question,
          ),
        },
      };
    });
  }

  function removeMatchPair(questionId: string, pairId: string): void {
    setDraft((current) => {
      if (current.content.type !== "match") {
        return current;
      }

      return {
        ...current,
        content: {
          ...current.content,
          questions: current.content.questions.map((question) => {
            if (question.id !== questionId || question.pairs.length <= 2) {
              return question;
            }
            return {
              ...question,
              pairs: question.pairs.filter((pair) => pair.id !== pairId),
            };
          }),
        },
      };
    });
  }

  async function generateDraftWithAI(): Promise<void> {
    setIsGenerating(true);
    setMessage(null);

    const payload = {
      timeKey: activeTimeKey,
      type: draft.content.type,
      questionCount: aiQuestionCount,
    };

    const result = await generateConjugationExerciseWithAIAction(payload);
    setIsGenerating(false);

    if (!result.success || !result.data) {
      setMessage({
        tone: "error",
        text: result.error ?? "Impossible de generer un exercice IA.",
      });
      return;
    }

    setDraft(cloneDraft(result.data.draft));
    setMessage({
      tone: "success",
      text: "Proposition IA prete. Tu peux la modifier avant publication.",
    });
  }

  async function importDraftWithAI(): Promise<void> {
    setIsGenerating(true);
    setMessage(null);

    const result = await importConjugationExerciseWithAIAction({
      timeKey: activeTimeKey,
      type: draft.content.type,
      questionCount: aiQuestionCount,
      sourceText: importSourceText,
    });
    setIsGenerating(false);

    if (!result.success || !result.data) {
      setMessage({
        tone: "error",
        text: result.error ?? "Impossible d'importer cet exercice avec l'IA.",
      });
      return;
    }

    setDraft(cloneDraft(result.data.draft));
    setMessage({
      tone: "success",
      text: "Exercice importe. Tu peux corriger avant publication.",
    });
  }

  function deleteExercise(exerciseId: string): void {
    if (!window.confirm("Supprimer cet exercice ?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteConjugationExerciseAction({ exerciseId });
      if (!result.success) {
        setMessage({
          tone: "error",
          text: result.error ?? "Suppression impossible.",
        });
        return;
      }

      setExercises((current) => current.filter((exercise) => exercise.id !== exerciseId));
      setStatsByExerciseId((current) => {
        const next = { ...current };
        delete next[exerciseId];
        return next;
      });
      setMessage({
        tone: "success",
        text: "Exercice supprime.",
      });
    });
  }

  function duplicateExercise(exercise: ConjugationExerciseRecord): void {
    startTransition(async () => {
      const result = await duplicateConjugationExerciseAction({ exerciseId: exercise.id });
      if (!result.success || !result.data) {
        setMessage({
          tone: "error",
          text: result.error ?? "Duplication impossible.",
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const duplicate: ConjugationExerciseRecord = {
        ...exercise,
        id: result.data.exerciseId,
        title: `${exercise.title} (copie)`,
        status: "draft",
        content: cloneContent(exercise.content),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setExercises((current) => [duplicate, ...current]);
      setStatsByExerciseId((current) => ({
        ...current,
        [duplicate.id]: {
          exerciseId: duplicate.id,
          attemptsCount: 0,
          latestAttempt: null,
          averageScore: null,
        },
      }));
      setMessage({
        tone: "success",
        text: "Exercice duplique.",
      });
    });
  }

  function togglePublishExercise(exercise: ConjugationExerciseRecord): void {
    const published = exercise.status !== "published";

    startTransition(async () => {
      const result = await setConjugationExercisePublishedAction({
        exerciseId: exercise.id,
        published,
      });
      if (!result.success) {
        setMessage({
          tone: "error",
          text: result.error ?? "Impossible de modifier la publication.",
        });
        return;
      }

      setExercises((current) =>
        current.map((entry) =>
          entry.id === exercise.id
            ? {
                ...entry,
                status: published ? "published" : "draft",
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      );

      setMessage({
        tone: "success",
        text: published ? "Exercice publie pour Ezra." : "Exercice retire du front enfant.",
      });
    });
  }

  function saveExerciseDraftFromModal(): void {
    const payload = {
      ...(editingExerciseId ? { id: editingExerciseId } : {}),
      draft,
    };

    startTransition(async () => {
      const result = await upsertConjugationExerciseAction(payload);
      if (!result.success || !result.data) {
        setMessage({
          tone: "error",
          text: result.error ?? "Impossible d'enregistrer l'exercice.",
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const nextExercise: ConjugationExerciseRecord = {
        id: result.data.exerciseId,
        familyId: "local",
        timeKey: draft.timeKey,
        title: draft.title,
        status: draft.status,
        content: cloneContent(draft.content),
        createdAt: editingExerciseId
          ? exercises.find((entry) => entry.id === editingExerciseId)?.createdAt ?? nowIso
          : nowIso,
        updatedAt: nowIso,
      };

      setExercises((current) => {
        if (editingExerciseId) {
          return current.map((exercise) => (exercise.id === editingExerciseId ? nextExercise : exercise));
        }
        return [nextExercise, ...current];
      });

      setStatsByExerciseId((current) => ({
        ...current,
        [nextExercise.id]: current[nextExercise.id] ?? {
          exerciseId: nextExercise.id,
          attemptsCount: 0,
          latestAttempt: null,
          averageScore: null,
        },
      }));

      setIsModalOpen(false);
      setEditingExerciseId(null);
      setMessage({
        tone: "success",
        text: "Exercice enregistre.",
      });
    });
  }

  function renderResultSummary(stats: ConjugationExerciseParentStats | undefined): React.JSX.Element {
    if (!stats || stats.attemptsCount === 0 || !stats.latestAttempt) {
      return <p className="text-xs text-text-secondary">Aucun resultat pour l'instant.</p>;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs text-text-secondary">
          Dernier score:{" "}
          <span className="font-semibold text-text-primary">{stats.latestAttempt.score}%</span> -
          tentatives: {stats.attemptsCount}
          {stats.averageScore !== null ? ` - moyenne: ${stats.averageScore}%` : ""}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            setExpandedResultExerciseId((current) =>
              current === stats.exerciseId ? null : stats.exerciseId,
            )
          }
        >
          {expandedResultExerciseId === stats.exerciseId ? "Masquer details" : "Voir details"}
        </Button>
        {expandedResultExerciseId === stats.exerciseId ? (
          <div className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3">
            {stats.latestAttempt.answers.map((answer) => (
              <div key={answer.questionId} className="text-xs">
                <p className="font-semibold text-text-primary">{answer.prompt}</p>
                <p className={answer.isCorrect ? "text-status-success" : "text-status-error"}>
                  Ezra: {answer.userAnswer || "(vide)"} / Attendu: {answer.correctAnswer}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Dashboard parent
          </p>
          <h1 className="text-2xl font-black text-text-primary sm:text-3xl">Conjugaison</h1>
          <p className="text-sm text-text-secondary">
            Gere les fiches de temps, cree des exercices et suis les resultats d'Ezra.
          </p>
        </header>

        {message ? (
          <Card className="border-border-subtle bg-bg-surface/90">
            <CardContent className="p-3">
              <p
                className={
                  message.tone === "success"
                    ? "text-sm font-semibold text-status-success"
                    : "text-sm font-semibold text-status-error"
                }
              >
                {message.text}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1.35fr)_minmax(0,1fr)]">
          <Card className="border-border-subtle bg-bg-surface/92">
            <CardContent className="space-y-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Temps
              </p>
              {initialData.timeDefinitions.map((timeDefinition) => {
                const isActive = timeDefinition.key === activeTimeKey;
                return (
                  <button
                    key={timeDefinition.key}
                    type="button"
                    onClick={() => setActiveTimeKey(timeDefinition.key)}
                    className={`w-full rounded-radius-button border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "border-brand-primary bg-brand-50 text-brand-primary"
                        : "border-border-subtle bg-bg-surface text-text-primary hover:bg-bg-surface-hover"
                    }`}
                  >
                    <p className="text-sm font-semibold">{timeDefinition.title}</p>
                    <p className="text-xs opacity-80">{timeDefinition.subtitle}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border-subtle bg-bg-surface/92">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Fiche du temps
                  </p>
                  <h2 className="text-lg font-bold text-text-primary">
                    {activeTimeDefinition?.title ?? "Fiche"}
                  </h2>
                </div>
                <Button type="button" variant="primary" onClick={saveActiveSheet} loading={isPending}>
                  Enregistrer la fiche
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">A quoi ca sert</p>
                  <RichTextEditor
                    valueHtml={activeSheet.blocks.aQuoiCaSertHtml}
                    onChangeHtml={(html) => updateSheetBlock("aQuoiCaSertHtml", html)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">Marques du temps</p>
                  <RichTextEditor
                    valueHtml={activeSheet.blocks.marquesDuTempsHtml}
                    onChangeHtml={(html) => updateSheetBlock("marquesDuTempsHtml", html)}
                    enableUnderline
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">
                    Exemple conjugaison complete
                  </p>
                  <RichTextEditor
                    valueHtml={activeSheet.blocks.exempleConjugaisonCompleteHtml}
                    onChangeHtml={(html) => updateSheetBlock("exempleConjugaisonCompleteHtml", html)}
                    enableCallout
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">Verbes auxiliaires</p>
                  <RichTextEditor
                    valueHtml={activeSheet.blocks.verbesAuxiliairesHtml}
                    onChangeHtml={(html) => updateSheetBlock("verbesAuxiliairesHtml", html)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">Trucs et astuces</p>
                  <RichTextEditor
                    valueHtml={activeSheet.blocks.trucsAstucesHtml}
                    onChangeHtml={(html) => updateSheetBlock("trucsAstucesHtml", html)}
                    enableHighlights
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border-subtle bg-bg-surface/92">
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Exercices
                </p>
                <h2 className="text-lg font-bold text-text-primary">
                  {activeTimeDefinition?.title ?? "Temps selectionne"}
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button type="button" variant="secondary" onClick={() => openCreateExerciseModal("manual")}>
                    + Manuel
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => openCreateExerciseModal("ai")}>
                    + IA aleatoire
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => openCreateExerciseModal("import")}>
                    + Import IA
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {exercisesForActiveTime.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    Aucun exercice pour ce temps. Cree le premier exercice.
                  </p>
                ) : null}

                {exercisesForActiveTime.map((exercise) => {
                  const stats = statsByExerciseId[exercise.id];
                  const typeLabel =
                    EXERCISE_TYPE_OPTIONS.find((entry) => entry.value === exercise.content.type)?.label ??
                    exercise.content.type;
                  return (
                    <Card key={exercise.id} className="border-border-subtle bg-bg-surface-hover/55">
                      <CardContent className="space-y-3 p-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-text-primary">{exercise.title}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="info">{typeLabel}</Badge>
                            <Badge variant={exercise.status === "published" ? "success" : "warning"}>
                              {exercise.status === "published" ? "Publie" : "Brouillon"}
                            </Badge>
                            <Badge variant="glass">
                              {exercise.content.questions.length} question(s)
                            </Badge>
                          </div>
                          <p className="text-xs text-text-secondary">
                            Mise a jour: {formatDate(exercise.updatedAt)}
                          </p>
                        </div>

                        {renderResultSummary(stats)}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditExerciseModal(exercise)}
                          >
                            Editer
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => duplicateExercise(exercise)}
                          >
                            Dupliquer
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => togglePublishExercise(exercise)}
                          >
                            {exercise.status === "published" ? "Retirer" : "Publier"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteExercise(exercise.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExerciseId ? "Editer l'exercice" : "Nouvel exercice"}
        className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant={creationMode === "manual" ? "primary" : "secondary"}
              onClick={() => setCreationMode("manual")}
            >
              Mode manuel
            </Button>
            <Button
              type="button"
              variant={creationMode === "ai" ? "primary" : "secondary"}
              onClick={() => setCreationMode("ai")}
            >
              Mode IA aleatoire
            </Button>
            <Button
              type="button"
              variant={creationMode === "import" ? "primary" : "secondary"}
              onClick={() => setCreationMode("import")}
            >
              Mode import
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">Titre de l'exercice</p>
              <Input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">Type</p>
              <Select
                value={draft.content.type}
                onChange={(event) => changeDraftType(event.target.value as ConjugationExerciseType)}
              >
                {EXERCISE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {creationMode === "ai" ? (
            <Card className="border-border-subtle bg-bg-surface-hover/55">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-text-secondary">
                  Generation automatique selon le temps selectionne et le niveau d'Ezra.
                </p>
                <div className="grid gap-3 sm:grid-cols-[180px_auto] sm:items-end">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">Nombre de questions</p>
                    <Input
                      type="number"
                      min={3}
                      max={12}
                      value={aiQuestionCount}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value || 6);
                        setAiQuestionCount(Math.max(3, Math.min(12, Math.trunc(nextValue))));
                      }}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void generateDraftWithAI()} loading={isGenerating}>
                    Generer avec l'IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {creationMode === "import" ? (
            <Card className="border-border-subtle bg-bg-surface-hover/55">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-text-secondary">
                  Colle un exercice source puis genere une version compatible.
                </p>
                <TextArea
                  value={importSourceText}
                  onChange={(event) => setImportSourceText(event.target.value)}
                  rows={6}
                  placeholder="Colle ici l'exercice source..."
                />
                <div className="grid gap-3 sm:grid-cols-[180px_auto] sm:items-end">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">Nombre de questions</p>
                    <Input
                      type="number"
                      min={3}
                      max={12}
                      value={aiQuestionCount}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value || 6);
                        setAiQuestionCount(Math.max(3, Math.min(12, Math.trunc(nextValue))));
                      }}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => void importDraftWithAI()} loading={isGenerating}>
                    Importer avec l'IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border-subtle bg-bg-surface/92">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Questions ({draft.content.type})</p>
                <Select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value === "published" ? "published" : "draft",
                    }))
                  }
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publie</option>
                </Select>
              </div>

              <div className="space-y-3">
                {draft.content.type === "qcm"
                  ? draft.content.questions.map((question, questionIndex) => (
                      <div
                        key={question.id}
                        className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/55 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            Question {questionIndex + 1}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDraftQuestion(question.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                        <Input
                          value={question.prompt}
                          onChange={(event) => updateQcmPrompt(question.id, event.target.value)}
                          placeholder="Question"
                        />
                        <div className="space-y-2">
                          {question.choices.map((choice, choiceIndex) => (
                            <div
                              key={`${question.id}-choice-${choiceIndex}`}
                              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                            >
                              <Input
                                value={choice}
                                onChange={(event) =>
                                  updateQcmChoice(question.id, choiceIndex, event.target.value)
                                }
                                placeholder={`Choix ${choiceIndex + 1}`}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeQcmChoice(question.id, choiceIndex)}
                              >
                                Retirer
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => addQcmChoice(question.id)}
                          >
                            + Choix
                          </Button>
                          <Select
                            value={question.answer}
                            onChange={(event) => updateQcmAnswer(question.id, event.target.value)}
                          >
                            <option value="">Bonne reponse</option>
                            {question.choices
                              .filter((choice) => choice.trim().length > 0)
                              .map((choice) => (
                                <option key={`${question.id}-answer-${choice}`} value={choice}>
                                  {choice}
                                </option>
                              ))}
                          </Select>
                        </div>
                      </div>
                    ))
                  : null}

                {draft.content.type === "fill_blank"
                  ? draft.content.questions.map((question, questionIndex) => (
                      <div
                        key={question.id}
                        className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/55 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            Question {questionIndex + 1}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDraftQuestion(question.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                        <Input
                          value={question.prompt}
                          onChange={(event) =>
                            updateFillQuestion(question.id, "prompt", event.target.value)
                          }
                          placeholder="Phrase avec trou"
                        />
                        <Input
                          value={question.answer}
                          onChange={(event) =>
                            updateFillQuestion(question.id, "answer", event.target.value)
                          }
                          placeholder="Bonne reponse"
                        />
                      </div>
                    ))
                  : null}

                {draft.content.type === "transform"
                  ? draft.content.questions.map((question, questionIndex) => (
                      <div
                        key={question.id}
                        className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/55 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            Question {questionIndex + 1}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDraftQuestion(question.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                        <Input
                          value={question.prompt}
                          onChange={(event) =>
                            updateTransformQuestion(question.id, "prompt", event.target.value)
                          }
                          placeholder="Phrase de depart"
                        />
                        <Input
                          value={question.instruction}
                          onChange={(event) =>
                            updateTransformQuestion(question.id, "instruction", event.target.value)
                          }
                          placeholder="Instruction"
                        />
                        <Input
                          value={question.answer}
                          onChange={(event) =>
                            updateTransformQuestion(question.id, "answer", event.target.value)
                          }
                          placeholder="Phrase attendue"
                        />
                      </div>
                    ))
                  : null}

                {draft.content.type === "match"
                  ? draft.content.questions.map((question, questionIndex) => (
                      <div
                        key={question.id}
                        className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/55 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            Question {questionIndex + 1}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDraftQuestion(question.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                        <Input
                          value={question.instruction}
                          onChange={(event) =>
                            updateMatchInstruction(question.id, event.target.value)
                          }
                          placeholder="Instruction"
                        />
                        <div className="space-y-2">
                          {question.pairs.map((pair) => (
                            <div
                              key={pair.id}
                              className="grid gap-2 rounded-radius-button border border-border-subtle bg-bg-surface p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                            >
                              <Input
                                value={pair.left}
                                onChange={(event) =>
                                  updateMatchPair(question.id, pair.id, "left", event.target.value)
                                }
                                placeholder="Pronom"
                              />
                              <Input
                                value={pair.right}
                                onChange={(event) =>
                                  updateMatchPair(question.id, pair.id, "right", event.target.value)
                                }
                                placeholder="Forme conjuguee"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMatchPair(question.id, pair.id)}
                              >
                                Retirer
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => addMatchPair(question.id)}
                        >
                          + Paire
                        </Button>
                      </div>
                    ))
                  : null}
              </div>

              <Button type="button" variant="secondary" onClick={addDraftQuestion}>
                + Ajouter une question
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="tertiary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="primary" onClick={saveExerciseDraftFromModal} loading={isPending}>
              Enregistrer l'exercice
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
