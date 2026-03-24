"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RevisionCardView } from "@/components/child/revisions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HighlightChip,
  Input,
  Modal,
  Select,
  TextArea,
  useToast,
} from "@/components/ds";
import {
  mapRevisionQuizToStoredChoicesQuiz,
  mapStoredCardToStructuredRevisionContent,
  mapStoredQuizToRevisionQuizQuestions,
  plainTextToRichTextLine,
  richTextLineToPlainText,
} from "@/lib/revisions/mappers";
import type {
  HighlightTag,
  RevisionCardContent,
  RevisionQuizQuestion,
  RichTextLine,
  StoredRevisionCard,
  StoredRevisionCardViewModel,
  StructuredExample,
  StructuredRevisionContent,
  VisualAid,
  VisualAidKind,
} from "@/lib/revisions/types";

export interface SaveRevisionCardInput {
  id: string;
  title: string;
  content: RevisionCardContent;
}

export interface SaveRevisionCardResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof SaveRevisionCardInput, string>>;
}

interface ParentRevisionEditPageProps {
  initialCard: StoredRevisionCard;
  onSaveAction: (input: SaveRevisionCardInput) => Promise<SaveRevisionCardResult>;
}

type FieldErrors = Partial<Record<keyof SaveRevisionCardInput, string>>;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const cleaned = normalizeText(value);
    if (!cleaned) {
      return;
    }
    const key = cleaned.toLocaleLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(cleaned);
  });
  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createEmptyStructuredContent(): StructuredRevisionContent {
  return {
    definition: [],
    jeRetiens: {
      items: [],
    },
    jeVois: {
      examples: [],
    },
    monTruc: {
      bullets: [],
    },
    conjugation: [],
    visualAids: [],
  };
}

function ensureStructuredContent(value: StructuredRevisionContent | null | undefined): StructuredRevisionContent {
  return {
    ...createEmptyStructuredContent(),
    ...(value ?? {}),
    jeRetiens: {
      items: value?.jeRetiens?.items ?? [],
      ...(value?.jeRetiens?.title ? { title: value.jeRetiens.title } : {}),
    },
    jeVois: {
      examples: value?.jeVois?.examples ?? [],
    },
    monTruc: {
      bullets: value?.monTruc?.bullets ?? [],
      ...(value?.monTruc?.example ? { example: value.monTruc.example } : {}),
    },
    conjugation: value?.conjugation ?? [],
    visualAids: value?.visualAids ?? [],
  };
}

const VISUAL_AID_KIND_OPTIONS: Array<{
  value: VisualAidKind;
  label: string;
}> = [
  { value: "step_sequence", label: "Sequence d'etapes" },
  { value: "column_operation", label: "Calcul en colonnes" },
  { value: "term_result_map", label: "Termes -> resultat" },
  { value: "worked_example", label: "Exemple guide" },
  { value: "marked_shape", label: "Figure reperee" },
  { value: "compare_table", label: "Tableau compare" },
  { value: "number_line", label: "Droite numerique" },
  { value: "classification_grid", label: "Grille de tri" },
  { value: "vocab_cards", label: "Cartes vocabulaire" },
  { value: "conjugation_grid", label: "Grille de conjugaison" },
];

function buildVisualAidTemplate(kind: VisualAidKind, index: number): VisualAid {
  const id = `visual-aid-${index + 1}`;
  const title = VISUAL_AID_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Aide visuelle";

  if (kind === "step_sequence") {
    return {
      id,
      kind,
      title,
      steps: [{ text: "Etape 1" }],
    };
  }

  if (kind === "column_operation") {
    return {
      id,
      kind,
      title,
      operation: "addition",
      placeHeaders: ["C", "D", "U"],
      top: "684",
      bottom: "79",
      result: "",
      hint: "",
    };
  }

  if (kind === "term_result_map") {
    return {
      id,
      kind,
      title,
      expression: "87 + 18 = 105",
      termLabel: "les termes",
      resultLabel: "la somme",
    };
  }

  if (kind === "worked_example") {
    return {
      id,
      kind,
      title,
      problem: "Probleme",
      steps: ["Etape 1", "Etape 2"],
      answer: "Reponse",
    };
  }

  if (kind === "marked_shape") {
    return {
      id,
      kind,
      title,
      statement: "Repere ce qui correspond a la regle.",
      items: [{ label: "Element 1", hasMarker: true }],
    };
  }

  if (kind === "compare_table") {
    return {
      id,
      kind,
      title,
      columns: ["Colonne A", "Colonne B"],
      rows: [{ left: "A1", right: "B1" }],
    };
  }

  if (kind === "number_line") {
    return {
      id,
      kind,
      title,
      start: 0,
      end: 10,
      marks: [0, 2, 4, 6, 8, 10],
      highlight: 6,
    };
  }

  if (kind === "classification_grid") {
    return {
      id,
      kind,
      title,
      categories: [
        { label: "Categorie 1", items: ["Item A"] },
        { label: "Categorie 2", items: ["Item B"] },
      ],
    };
  }

  if (kind === "vocab_cards") {
    return {
      id,
      kind,
      title,
      cards: [{ term: "terme", meaning: "definition", example: "exemple" }],
    };
  }

  return {
    id,
    kind: "conjugation_grid",
    title,
    tense: "present",
    verb: "chanter",
    rows: [{ pronoun: "je", stem: "chant", ending: "e" }],
  };
}

function renderRichTextPreview(line: RichTextLine): React.ReactNode {
  return line.map((fragment, index) => {
    const prefix = index > 0 ? " " : "";
    if (fragment.type === "highlight") {
      return (
        <React.Fragment key={`${fragment.tag}-${index}`}>
          {prefix}
          <HighlightChip tag={fragment.tag}>{fragment.text}</HighlightChip>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={`text-${index}`}>
        {prefix}
        {fragment.text}
      </React.Fragment>
    );
  });
}

interface StyledWord {
  text: string;
  tag: HighlightTag | null;
  start: number;
  end: number;
}

function toWords(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ");
}

function buildStyledWords(line: RichTextLine): StyledWord[] {
  const plain = richTextLineToPlainText(line);
  if (!plain) {
    return [];
  }

  const fragmentWords: Array<{ text: string; tag: HighlightTag | null }> = [];
  line.forEach((fragment) => {
    const words = toWords(fragment.text);
    words.forEach((word) => {
      fragmentWords.push({
        text: word,
        tag: fragment.type === "highlight" ? fragment.tag : null,
      });
    });
  });

  const plainWords = toWords(plain);
  const styledWords = plainWords.map((word, index) => ({
    text: word,
    tag: fragmentWords[index]?.tag ?? null,
  }));

  const positionedWords: StyledWord[] = [];
  let cursor = 0;
  styledWords.forEach((word) => {
    const start = cursor;
    const end = start + word.text.length;
    positionedWords.push({
      ...word,
      start,
      end,
    });
    cursor = end + 1;
  });

  return positionedWords;
}

function getSelectedWordIndexes(words: StyledWord[], start: number, end: number): number[] {
  if (words.length === 0) {
    return [];
  }

  const maxEnd = words[words.length - 1]?.end ?? 0;
  const from = Math.max(0, Math.min(start, maxEnd));
  const to = Math.max(0, Math.min(end, maxEnd));
  if (from === to) {
    return [];
  }

  return words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => from < word.end && to > word.start)
    .map(({ index }) => index);
}

function serializeStyledWords(words: StyledWord[]): RichTextLine {
  if (words.length === 0) {
    return [];
  }

  const next: RichTextLine = [];
  let current = words[0];
  if (!current) {
    return [];
  }

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    if (!word) {
      continue;
    }
    if (word.tag === current.tag) {
      current = {
        ...current,
        text: `${current.text} ${word.text}`,
        end: word.end,
      };
      continue;
    }

    if (current.tag) {
      next.push({
        type: "highlight",
        tag: current.tag,
        text: current.text,
      });
    } else {
      next.push({
        type: "text",
        text: current.text,
      });
    }
    current = word;
  }

  if (current.tag) {
    next.push({
      type: "highlight",
      tag: current.tag,
      text: current.text,
    });
  } else {
    next.push({
      type: "text",
      text: current.text,
    });
  }

  return next;
}

function getTagInSelection(line: RichTextLine, start: number, end: number): HighlightTag | null {
  const words = buildStyledWords(line);
  const selectedIndexes = getSelectedWordIndexes(words, start, end);
  if (selectedIndexes.length === 0) {
    return null;
  }

  const firstTag = words[selectedIndexes[0] ?? 0]?.tag ?? null;
  if (!firstTag) {
    return null;
  }

  const isUniform = selectedIndexes.every((index) => words[index]?.tag === firstTag);
  return isUniform ? firstTag : null;
}

function applyHighlightToLine(line: RichTextLine, tag: HighlightTag, start: number, end: number): RichTextLine {
  const words = buildStyledWords(line);
  const selectedIndexes = getSelectedWordIndexes(words, start, end);
  if (selectedIndexes.length === 0) {
    return line;
  }

  const shouldClear = selectedIndexes.every((index) => words[index]?.tag === tag);
  selectedIndexes.forEach((index) => {
    const word = words[index];
    if (!word) {
      return;
    }
    words[index] = {
      ...word,
      tag: shouldClear ? null : tag,
    };
  });

  return serializeStyledWords(words);
}

interface RichLineEditorProps {
  label: string;
  value: RichTextLine;
  placeholder?: string;
  onChange: (value: RichTextLine) => void;
}

function RichLineEditor({ label, value, placeholder, onChange }: RichLineEditorProps): React.JSX.Element {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const plainValue = richTextLineToPlainText(value);
  const [selectionRange, setSelectionRange] = React.useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const activeTag = React.useMemo(
    () => getTagInSelection(value, selectionRange.start, selectionRange.end),
    [selectionRange.end, selectionRange.start, value],
  );

  function syncSelection(): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    setSelectionRange({
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
  }

  function applyTag(tag: HighlightTag): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const nextValue = applyHighlightToLine(value, tag, textarea.selectionStart, textarea.selectionEnd);
    onChange(nextValue);
    setSelectionRange({
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
  }

  function buttonVariant(tag: HighlightTag): "secondary" | "tertiary" {
    return activeTag === tag ? "secondary" : "tertiary";
  }

  return (
    <div className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface/80 p-3">
      <p className="text-sm font-semibold text-text-secondary">{label}</p>
      <TextArea
        ref={textareaRef}
        aria-label={label}
        value={plainValue}
        onChange={(event) => {
          onChange(plainTextToRichTextLine(event.target.value));
        }}
        onSelect={syncSelection}
        onClick={syncSelection}
        onKeyUp={syncSelection}
        rows={2}
        placeholder={placeholder}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          size="sm"
          variant={buttonVariant("term")}
          onClick={() => applyTag("term")}
          className="justify-start"
        >
          <span className="inline-flex min-w-0 flex-col items-start text-left">
            <span className="text-xs font-semibold text-text-secondary">Mettre en avant</span>
            <HighlightChip tag="term" className="text-xs">
              Exemple
            </HighlightChip>
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={buttonVariant("keyword")}
          onClick={() => applyTag("keyword")}
          className="justify-start"
        >
          <span className="inline-flex min-w-0 flex-col items-start text-left">
            <span className="text-xs font-semibold text-text-secondary">Marque grammaticale</span>
            <span className="text-xs font-semibold text-brand-primary">nom / verbe</span>
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={buttonVariant("ending")}
          onClick={() => applyTag("ending")}
          className="justify-start"
        >
          <span className="inline-flex min-w-0 flex-col items-start text-left">
            <span className="text-xs font-semibold text-text-secondary">Terminaison</span>
            <span className="text-xs font-semibold text-status-info underline decoration-status-info/70 decoration-2 underline-offset-2">
              -ons / -ent
            </span>
          </span>
        </Button>
      </div>
      <p className="text-xs text-text-secondary">Selectionne un mot ou un groupe de mots avant d&apos;appliquer un style.</p>
      {value.length > 0 ? (
        <p className="reading text-sm leading-relaxed text-text-secondary">{renderRichTextPreview(value)}</p>
      ) : null}
    </div>
  );
}

function createEmptyQuizQuestion(index: number): RevisionQuizQuestion {
  return {
    id: `q-${index + 1}`,
    question: "",
    choices: ["", ""],
    answer: "",
  };
}

function normalizeQuizQuestions(questions: RevisionQuizQuestion[]): RevisionQuizQuestion[] {
  return questions
    .map((question, index) => {
      const normalizedQuestion = normalizeText(question.question);
      const normalizedChoices = normalizeList(question.choices);
      const normalizedAnswer = normalizeText(question.answer);

      if (!normalizedQuestion || normalizedChoices.length < 2) {
        return null;
      }

      const answer =
        normalizedChoices.find(
          (choice) => choice.toLocaleLowerCase() === normalizedAnswer.toLocaleLowerCase(),
        ) ?? normalizedChoices[0] ?? "";

      if (!answer) {
        return null;
      }

      return {
        id: normalizeText(question.id) || `q-${index + 1}`,
        question: normalizedQuestion,
        choices: normalizedChoices,
        answer,
      };
    })
    .filter((question): question is RevisionQuizQuestion => question !== null);
}

function toExamplePlainText(example: StructuredExample): string {
  const lines = example.text.map((line) => richTextLineToPlainText(line)).filter((line) => line.length > 0);
  return normalizeText(lines.join(" "));
}

export function ParentRevisionEditPage({
  initialCard,
  onSaveAction,
}: ParentRevisionEditPageProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const initialStructured = React.useMemo(
    () => ensureStructuredContent(mapStoredCardToStructuredRevisionContent(initialCard)),
    [initialCard],
  );
  const fallbackQuiz = React.useMemo(
    () => mapStoredQuizToRevisionQuizQuestions(initialCard.content.quiz),
    [initialCard.content.quiz],
  );

  const [title, setTitle] = React.useState<string>(initialCard.title);
  const [structured, setStructured] = React.useState<StructuredRevisionContent>(initialStructured);
  const [miniTest, setMiniTest] = React.useState<string[]>(
    initialCard.content.generatedExercises?.miniTest ??
      initialCard.content.concept?.exercises ??
      initialCard.content.steps,
  );
  const [quiz, setQuiz] = React.useState<RevisionQuizQuestion[]>(
    initialCard.content.generatedExercises?.quiz ??
      initialCard.content.concept?.quiz ??
      (fallbackQuiz.length > 0 ? fallbackQuiz : [createEmptyQuizQuestion(0)]),
  );
  const [visualAidsJson, setVisualAidsJson] = React.useState<string>(
    JSON.stringify(initialStructured.visualAids ?? [], null, 2),
  );
  const [contentJson, setContentJson] = React.useState<string>(JSON.stringify(initialCard.content, null, 2));
  const [newVisualAidKind, setNewVisualAidKind] = React.useState<VisualAidKind>("step_sequence");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [isPending, startTransition] = React.useTransition();
  const [isPreviewOpen, setPreviewOpen] = React.useState(false);

  const isConcept = initialCard.content.kind === "concept";

  function clearErrors(): void {
    setErrorMessage(null);
    setFieldErrors({});
  }

  function parseNonConceptJson(): RevisionCardContent | null {
    try {
      const parsed = JSON.parse(contentJson) as RevisionCardContent;
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function parseVisualAidsJson(value: string): VisualAid[] | null {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }
      const normalized = parsed
        .map((item, index) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const visualAid = item as Partial<VisualAid>;
          const kind = visualAid.kind;
          if (
            kind !== "step_sequence" &&
            kind !== "column_operation" &&
            kind !== "term_result_map" &&
            kind !== "worked_example" &&
            kind !== "marked_shape" &&
            kind !== "compare_table" &&
            kind !== "number_line" &&
            kind !== "classification_grid" &&
            kind !== "vocab_cards" &&
            kind !== "conjugation_grid"
          ) {
            return null;
          }
          const template = buildVisualAidTemplate(kind, index);
          return {
            ...template,
            ...visualAid,
            id:
              typeof visualAid.id === "string" && visualAid.id.trim().length > 0
                ? visualAid.id
                : template.id,
            title:
              typeof visualAid.title === "string" && visualAid.title.trim().length > 0
                ? visualAid.title
                : template.title,
            ...(typeof visualAid.note === "string" ? { note: visualAid.note } : {}),
          } as VisualAid;
        })
        .filter((visualAid): visualAid is VisualAid => visualAid !== null);

      return normalized;
    } catch {
      return null;
    }
  }

  function buildConceptContent(): RevisionCardContent {
    const normalizedQuiz = normalizeQuizQuestions(quiz);
    const normalizedMiniTest = normalizeList(miniTest);
    const normalizedStructured = ensureStructuredContent(structured);

    const summary =
      richTextLineToPlainText(normalizedStructured.definition) ||
      richTextLineToPlainText(normalizedStructured.jeRetiens?.items[0]) ||
      null;

    const structuredExamples = normalizedStructured.jeVois?.examples ?? [];
    const plainExamples = normalizeList(
      structuredExamples.map((example) => toExamplePlainText(example)).filter((value) => value.length > 0),
    );
    const monTrucBullets = normalizeList(
      (normalizedStructured.monTruc?.bullets ?? []).map((line) => richTextLineToPlainText(line)),
    );
    const monTrucPrimary = monTrucBullets[0] ?? "";

    return {
      kind: "concept",
      summary,
      steps: normalizedMiniTest,
      examples: plainExamples,
      quiz: mapRevisionQuizToStoredChoicesQuiz(normalizedQuiz),
      tips: monTrucBullets,
      concept: {
        goal: initialCard.content.concept?.goal ?? summary,
        blocks: {
          jeRetiens:
            normalizeList(
              (normalizedStructured.jeRetiens?.items ?? []).map((line) => richTextLineToPlainText(line)),
            ).join(" ") || summary || "",
          jeVoisHtml: plainExamples.map((example) => `<p>${escapeHtml(example)}</p>`).join(""),
          monTruc: monTrucPrimary,
          examples: plainExamples,
        },
        exercises: normalizedMiniTest,
        quiz: normalizedQuiz,
        audioScript: initialCard.content.concept?.audioScript ?? null,
      },
      structured: normalizedStructured,
      generatedExercises: {
        quiz: normalizedQuiz,
        miniTest: normalizedMiniTest,
      },
    };
  }

  const nextContentForPreview = isConcept ? buildConceptContent() : parseNonConceptJson() ?? initialCard.content;
  const previewCard: StoredRevisionCardViewModel = {
    ...initialCard,
    title,
    content: nextContentForPreview,
  };

  function handleSave(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    clearErrors();

    const nextContent = isConcept ? buildConceptContent() : parseNonConceptJson();
    if (!nextContent) {
      setErrorMessage("Invalid JSON content.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await onSaveAction({
          id: initialCard.id,
          title: normalizeText(title),
          content: nextContent,
        });

        if (!result.success) {
          setErrorMessage(result.error ?? "Unable to save revision card.");
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error ?? "Unable to save revision card.");
          return;
        }

        toast.success("Revision saved.");
        router.refresh();
      })();
    });
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Edit revision card</CardTitle>
              <CardDescription>
                Update card content and preview exactly what Ezra will see.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPreviewOpen(true);
              }}
            >
              Open preview
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSave}>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">General</h2>
                <div className="space-y-1.5">
                  <label htmlFor="revision-edit-title" className="text-sm font-semibold text-text-primary">
                    Title
                  </label>
                  <Input
                    id="revision-edit-title"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                    }}
                    errorMessage={fieldErrors.title}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{initialCard.subject}</Badge>
                  {initialCard.level ? <Badge variant="neutral">{initialCard.level}</Badge> : null}
                  <Badge variant={initialCard.status === "published" ? "success" : "warning"}>
                    {initialCard.status}
                  </Badge>
                  <Badge variant="info">{initialCard.content.kind}</Badge>
                </div>
              </section>

              {isConcept ? (
                <>
                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Je retiens</h2>
                    <RichLineEditor
                      label="Definition"
                      value={structured.definition ?? []}
                      onChange={(value) => {
                        setStructured((current) => ({
                          ...current,
                          definition: value,
                        }));
                      }}
                    />
                    {(structured.jeRetiens?.items ?? []).map((line, index) => (
                      <div key={`je-retiens-${index}`} className="space-y-2">
                        <RichLineEditor
                          label={`Bullet ${index + 1}`}
                          value={line}
                          onChange={(value) => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const items = [...(next.jeRetiens?.items ?? [])];
                              items[index] = value;
                              return {
                                ...next,
                                jeRetiens: {
                                  ...(next.jeRetiens?.title ? { title: next.jeRetiens.title } : {}),
                                  items,
                                },
                              };
                            });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const items = [...(next.jeRetiens?.items ?? [])];
                              items.splice(index, 1);
                              return {
                                ...next,
                                jeRetiens: {
                                  ...(next.jeRetiens?.title ? { title: next.jeRetiens.title } : {}),
                                  items,
                                },
                              };
                            });
                          }}
                        >
                          Remove bullet
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStructured((current) => {
                          const next = ensureStructuredContent(current);
                          return {
                            ...next,
                            jeRetiens: {
                              ...(next.jeRetiens?.title ? { title: next.jeRetiens.title } : {}),
                              items: [...(next.jeRetiens?.items ?? []), []],
                            },
                          };
                        });
                      }}
                    >
                      Add bullet
                    </Button>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Je vois</h2>
                    {(structured.jeVois?.examples ?? []).map((example, index) => (
                      <div key={`je-vois-${index}`} className="space-y-2 rounded-radius-card border border-border-subtle p-3">
                        <Input
                          value={example.label ?? ""}
                          onChange={(event) => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const examples = [...(next.jeVois?.examples ?? [])];
                              const target = examples[index];
                              if (!target) {
                                return next;
                              }
                              examples[index] = {
                                ...target,
                                label: event.target.value,
                              };
                              return {
                                ...next,
                                jeVois: { examples },
                              };
                            });
                          }}
                          placeholder="Example label"
                        />
                        <Input
                          value={example.explanation ?? ""}
                          onChange={(event) => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const examples = [...(next.jeVois?.examples ?? [])];
                              const target = examples[index];
                              if (!target) {
                                return next;
                              }
                              examples[index] = {
                                ...target,
                                explanation: event.target.value,
                              };
                              return {
                                ...next,
                                jeVois: { examples },
                              };
                            });
                          }}
                          placeholder="Explanation"
                        />
                        <RichLineEditor
                          label="Example line"
                          value={example.text[0] ?? []}
                          onChange={(value) => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const examples = [...(next.jeVois?.examples ?? [])];
                              const target = examples[index];
                              if (!target) {
                                return next;
                              }
                              examples[index] = {
                                ...target,
                                text: [value],
                              };
                              return {
                                ...next,
                                jeVois: { examples },
                              };
                            });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const examples = [...(next.jeVois?.examples ?? [])];
                              examples.splice(index, 1);
                              return {
                                ...next,
                                jeVois: { examples },
                              };
                            });
                          }}
                        >
                          Remove example
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStructured((current) => {
                          const next = ensureStructuredContent(current);
                          return {
                            ...next,
                            jeVois: {
                              examples: [
                                ...(next.jeVois?.examples ?? []),
                                {
                                  text: [[]],
                                },
                              ],
                            },
                          };
                        });
                      }}
                    >
                      Add example
                    </Button>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Mon truc</h2>
                    {(structured.monTruc?.bullets ?? []).map((line, index) => (
                      <div key={`mon-truc-${index}`} className="space-y-2">
                        <RichLineEditor
                          label={`Bullet ${index + 1}`}
                          value={line}
                          onChange={(value) => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const bullets = [...(next.monTruc?.bullets ?? [])];
                              bullets[index] = value;
                              return {
                                ...next,
                                monTruc: {
                                  ...next.monTruc,
                                  bullets,
                                },
                              };
                            });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const bullets = [...(next.monTruc?.bullets ?? [])];
                              bullets.splice(index, 1);
                              return {
                                ...next,
                                monTruc: {
                                  ...next.monTruc,
                                  bullets,
                                },
                              };
                            });
                          }}
                        >
                          Remove bullet
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStructured((current) => {
                          const next = ensureStructuredContent(current);
                          return {
                            ...next,
                            monTruc: {
                              ...next.monTruc,
                              bullets: [...(next.monTruc?.bullets ?? []), []],
                            },
                          };
                        });
                      }}
                    >
                      Add bullet
                    </Button>
                  </section>

                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Conjugation</h2>
                    {(structured.conjugation ?? []).map((block, blockIndex) => (
                      <div key={`conjugation-${blockIndex}`} className="space-y-2 rounded-radius-card border border-border-subtle p-3">
                        <div className="grid gap-2 md:grid-cols-3">
                          <Input
                            value={block.verb}
                            placeholder="Verb"
                            onChange={(event) => {
                              setStructured((current) => {
                                const next = ensureStructuredContent(current);
                                const blocks = [...(next.conjugation ?? [])];
                                const target = blocks[blockIndex];
                                if (!target) {
                                  return next;
                                }
                                blocks[blockIndex] = { ...target, verb: event.target.value };
                                return { ...next, conjugation: blocks };
                              });
                            }}
                          />
                          <Input
                            value={block.tense}
                            placeholder="Tense"
                            onChange={(event) => {
                              setStructured((current) => {
                                const next = ensureStructuredContent(current);
                                const blocks = [...(next.conjugation ?? [])];
                                const target = blocks[blockIndex];
                                if (!target) {
                                  return next;
                                }
                                blocks[blockIndex] = { ...target, tense: event.target.value };
                                return { ...next, conjugation: blocks };
                              });
                            }}
                          />
                          <Input
                            value={block.group ?? ""}
                            placeholder="Group"
                            onChange={(event) => {
                              setStructured((current) => {
                                const next = ensureStructuredContent(current);
                                const blocks = [...(next.conjugation ?? [])];
                                const target = blocks[blockIndex];
                                if (!target) {
                                  return next;
                                }
                                blocks[blockIndex] = { ...target, group: event.target.value };
                                return { ...next, conjugation: blocks };
                              });
                            }}
                          />
                        </div>
                        {(block.persons ?? []).map((person, personIndex) => (
                          <div key={`conjugation-person-${blockIndex}-${personIndex}`} className="grid gap-2 md:grid-cols-4">
                            <Input
                              value={person.pronoun}
                              placeholder="Pronoun"
                              onChange={(event) => {
                                setStructured((current) => {
                                  const next = ensureStructuredContent(current);
                                  const blocks = [...(next.conjugation ?? [])];
                                  const targetBlock = blocks[blockIndex];
                                  if (!targetBlock) {
                                    return next;
                                  }
                                  const persons = [...targetBlock.persons];
                                  const targetPerson = persons[personIndex];
                                  if (!targetPerson) {
                                    return next;
                                  }
                                  persons[personIndex] = { ...targetPerson, pronoun: event.target.value };
                                  blocks[blockIndex] = { ...targetBlock, persons };
                                  return { ...next, conjugation: blocks };
                                });
                              }}
                            />
                            <Input
                              value={person.stem}
                              placeholder="Stem"
                              onChange={(event) => {
                                setStructured((current) => {
                                  const next = ensureStructuredContent(current);
                                  const blocks = [...(next.conjugation ?? [])];
                                  const targetBlock = blocks[blockIndex];
                                  if (!targetBlock) {
                                    return next;
                                  }
                                  const persons = [...targetBlock.persons];
                                  const targetPerson = persons[personIndex];
                                  if (!targetPerson) {
                                    return next;
                                  }
                                  persons[personIndex] = { ...targetPerson, stem: event.target.value };
                                  blocks[blockIndex] = { ...targetBlock, persons };
                                  return { ...next, conjugation: blocks };
                                });
                              }}
                            />
                            <Input
                              value={person.ending}
                              placeholder="Ending"
                              onChange={(event) => {
                                setStructured((current) => {
                                  const next = ensureStructuredContent(current);
                                  const blocks = [...(next.conjugation ?? [])];
                                  const targetBlock = blocks[blockIndex];
                                  if (!targetBlock) {
                                    return next;
                                  }
                                  const persons = [...targetBlock.persons];
                                  const targetPerson = persons[personIndex];
                                  if (!targetPerson) {
                                    return next;
                                  }
                                  persons[personIndex] = { ...targetPerson, ending: event.target.value };
                                  blocks[blockIndex] = { ...targetBlock, persons };
                                  return { ...next, conjugation: blocks };
                                });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStructured((current) => {
                                  const next = ensureStructuredContent(current);
                                  const blocks = [...(next.conjugation ?? [])];
                                  const targetBlock = blocks[blockIndex];
                                  if (!targetBlock) {
                                    return next;
                                  }
                                  const persons = [...targetBlock.persons];
                                  persons.splice(personIndex, 1);
                                  blocks[blockIndex] = { ...targetBlock, persons };
                                  return { ...next, conjugation: blocks };
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStructured((current) => {
                                const next = ensureStructuredContent(current);
                                const blocks = [...(next.conjugation ?? [])];
                                const targetBlock = blocks[blockIndex];
                                if (!targetBlock) {
                                  return next;
                                }
                                blocks[blockIndex] = {
                                  ...targetBlock,
                                  persons: [...targetBlock.persons, { pronoun: "", stem: "", ending: "" }],
                                };
                                return { ...next, conjugation: blocks };
                              });
                            }}
                          >
                            Add person
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStructured((current) => {
                                const next = ensureStructuredContent(current);
                                const blocks = [...(next.conjugation ?? [])];
                                blocks.splice(blockIndex, 1);
                                return { ...next, conjugation: blocks };
                              });
                            }}
                          >
                            Remove block
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStructured((current) => {
                          const next = ensureStructuredContent(current);
                          return {
                            ...next,
                            conjugation: [
                              ...(next.conjugation ?? []),
                              {
                                tense: "",
                                verb: "",
                                persons: [{ pronoun: "", stem: "", ending: "" }],
                              },
                            ],
                          };
                        });
                      }}
                    >
                      Add conjugation block
                    </Button>
                  </section>

                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">
                        Aides visuelles
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={newVisualAidKind}
                          onChange={(event) => {
                            setNewVisualAidKind(event.target.value as VisualAidKind);
                          }}
                        >
                          {VISUAL_AID_KIND_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStructured((current) => {
                              const next = ensureStructuredContent(current);
                              const visualAids = [...(next.visualAids ?? [])];
                              visualAids.push(buildVisualAidTemplate(newVisualAidKind, visualAids.length));
                              const nextStructured = {
                                ...next,
                                visualAids,
                              };
                              setVisualAidsJson(JSON.stringify(nextStructured.visualAids ?? [], null, 2));
                              return nextStructured;
                            });
                          }}
                        >
                          Ajouter un schema
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Modifie les schemas explicatifs dans un format structure. La previsualisation enfant utilise
                      directement ce contenu.
                    </p>
                    <TextArea
                      value={visualAidsJson}
                      rows={12}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setVisualAidsJson(nextValue);
                        const parsed = parseVisualAidsJson(nextValue);
                        if (parsed) {
                          setStructured((current) => ({
                            ...ensureStructuredContent(current),
                            visualAids: parsed,
                          }));
                        }
                      }}
                      placeholder='[{"id":"visual-aid-1","kind":"step_sequence","title":"Etapes","steps":[{"text":"Etape 1"}]}]'
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-text-secondary">
                        Types supportes: step_sequence, column_operation, term_result_map, worked_example, marked_shape,
                        compare_table, number_line, classification_grid, vocab_cards, conjugation_grid.
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const snapshot = JSON.stringify(ensureStructuredContent(structured).visualAids ?? [], null, 2);
                          setVisualAidsJson(snapshot);
                        }}
                      >
                        Recharger depuis l&apos;etat courant
                      </Button>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">A toi !</h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMiniTest((current) => [...current, ""]);
                        }}
                      >
                        Add mini test item
                      </Button>
                    </div>
                    {miniTest.map((exercise, index) => (
                      <div key={`exercise-${index}`} className="flex items-center gap-2">
                        <Input
                          value={exercise}
                          onChange={(event) => {
                            setMiniTest((current) =>
                              current.map((entry, currentIndex) =>
                                currentIndex === index ? event.target.value : entry,
                              ),
                            );
                          }}
                          placeholder={`Mini test ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMiniTest((current) => {
                              if (current.length <= 1) {
                                return [""];
                              }
                              return current.filter((_, currentIndex) => currentIndex !== index);
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">Quiz</h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setQuiz((current) => [...current, createEmptyQuizQuestion(current.length)]);
                        }}
                      >
                        Add question
                      </Button>
                    </div>
                    {quiz.map((question, questionIndex) => (
                      <Card key={question.id || `quiz-${questionIndex}`}>
                        <CardContent className="space-y-3 py-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-text-primary">Question {questionIndex + 1}</h3>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setQuiz((current) => {
                                  if (current.length <= 1) {
                                    return [createEmptyQuizQuestion(0)];
                                  }
                                  return current.filter((_, index) => index !== questionIndex);
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                          <Input
                            value={question.question}
                            onChange={(event) => {
                              setQuiz((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === questionIndex
                                    ? { ...entry, question: event.target.value }
                                    : entry,
                                ),
                              );
                            }}
                            placeholder="Question"
                          />
                          <div className="space-y-2">
                            {question.choices.map((choice, choiceIndex) => (
                              <Input
                                key={`${question.id}-choice-${choiceIndex}`}
                                value={choice}
                                onChange={(event) => {
                                  setQuiz((current) =>
                                    current.map((entry, currentIndex) => {
                                      if (currentIndex !== questionIndex) {
                                        return entry;
                                      }
                                      const nextChoices = entry.choices.map((currentChoice, currentChoiceIndex) =>
                                        currentChoiceIndex === choiceIndex ? event.target.value : currentChoice,
                                      );
                                      return {
                                        ...entry,
                                        choices: nextChoices,
                                      };
                                    }),
                                  );
                                }}
                                placeholder={`Choice ${choiceIndex + 1}`}
                              />
                            ))}
                          </div>
                          <Select
                            value={question.answer}
                            onChange={(event) => {
                              setQuiz((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === questionIndex
                                    ? { ...entry, answer: event.target.value }
                                    : entry,
                                ),
                              );
                            }}
                          >
                            <option value="">Select one answer</option>
                            {question.choices.map((choice, choiceIndex) => (
                              <option key={`${question.id}-answer-${choiceIndex}`} value={choice}>
                                {choice || `Choice ${choiceIndex + 1}`}
                              </option>
                            ))}
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                </>
              ) : (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    {initialCard.content.kind} content
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Edit the full card content JSON for this type. Preview updates when JSON is valid.
                  </p>
                  <TextArea
                    value={contentJson}
                    onChange={(event) => {
                      setContentJson(event.target.value);
                    }}
                    rows={18}
                  />
                </section>
              )}

              {errorMessage ? (
                <p role="alert" className="text-sm font-semibold text-status-error">
                  {errorMessage}
                </p>
              ) : null}
              {fieldErrors.content ? (
                <p role="alert" className="text-sm font-semibold text-status-error">
                  {fieldErrors.content}
                </p>
              ) : null}

              <div className="-mx-6 sticky bottom-0 z-10 border-t border-border-subtle bg-bg-base/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg-base/85">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      router.push(`/parent/revisions/${initialCard.id}`);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => {
                      setPreviewOpen(true);
                    }}
                  >
                    Open preview
                  </Button>
                  <Button type="submit" variant="premium" loading={isPending}>
                    Save changes
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={isPreviewOpen}
        onClose={() => {
          setPreviewOpen(false);
        }}
        title="Preview for Ezra"
        description="This preview uses the same child component shown at /child/revisions/[cardId]."
        className="max-w-6xl p-0"
      >
        <div className="max-h-[80vh] overflow-y-auto p-3 sm:p-4">
          <RevisionCardView card={previewCard} showMarkReviewedControls={false} />
        </div>
      </Modal>
    </>
  );
}
