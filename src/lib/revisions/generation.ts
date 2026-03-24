import { z, type ZodIssue } from "zod";
import { getRevisionCardById } from "@/lib/api/revisions";
import { createOpenAIJsonChatCompletion } from "@/lib/openai/client";
import {
  mapStoredCardToStructuredRevisionContent,
  mapStoredQuizToRevisionQuizQuestions,
  plainTextToRichTextLine,
  richTextLineToPlainText,
} from "@/lib/revisions/mappers";
import type {
  ConceptCard,
  CreateRevisionCardInput,
  ExercisesPayload,
  ProcedureCard,
  RevisionQuizChoiceQuestion,
  RevisionQuizQuestion,
  RichTextLine,
  StoredRevisionCard,
  StructuredRevisionContent,
  VisualAid,
  VisualAidKind,
} from "@/lib/revisions/types";

export interface GenerateConceptInput {
  subject: string;
  level: string;
  topic: string;
  source?: string;
}

export interface GenerateConceptResult {
  conceptCard: ConceptCard;
  structured: StructuredRevisionContent;
  exercises: ExercisesPayload;
}

export interface GenerateProcedureInput {
  subject: string;
  level: string;
  topic: string;
  source?: string;
}

export interface GenerateProcedureResult {
  procedureCard: ProcedureCard;
  structured: StructuredRevisionContent;
  exercises: ExercisesPayload;
}

const GENERATE_INPUT_SCHEMA = z.object({
  subject: z
    .string()
    .min(2)
    .max(120)
    .transform((value) => value.replace(/\s+/g, " ").trim()),
  level: z
    .string()
    .min(1)
    .max(120)
    .transform((value) => value.replace(/\s+/g, " ").trim()),
  topic: z
    .string()
    .min(2)
    .max(180)
    .transform((value) => value.replace(/\s+/g, " ").trim()),
  source: z
    .string()
    .max(30000)
    .optional()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
});

const QUIZ_QUESTION_SCHEMA = z
  .object({
    id: z.string().min(1).max(120),
    question: z.string().min(4).max(500),
    choices: z.array(z.string().min(1).max(200)).min(2).max(6),
    answer: z.string().min(1).max(200),
  })
  .strict()
  .superRefine((question, context) => {
    const normalizedAnswer = question.answer.trim().toLocaleLowerCase();
    const hasAnswer = question.choices.some((choice) => choice.trim().toLocaleLowerCase() === normalizedAnswer);
    if (!hasAnswer) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "answer must match one of choices.",
      });
    }
  });

const CONCEPT_CARD_SCHEMA = z
  .object({
    type: z.literal("concept"),
    id: z.string().min(1).max(120),
    subject: z.string().min(2).max(120),
    level: z.string().min(1).max(120),
    title: z.string().min(2).max(160),
    goal: z.string().min(4).max(500),
    blocks: z
      .object({
        jeRetiens: z.string().min(8).max(1400),
        jeVoisHtml: z.string().min(8).max(9000),
        monTruc: z.string().min(4).max(500),
        examples: z.array(z.string().min(2).max(300)).min(1).max(6),
      })
      .strict(),
    exercises: z.array(z.string().min(2).max(300)).min(1).max(6),
    quiz: z.array(QUIZ_QUESTION_SCHEMA).min(1).max(4),
    audioScript: z.string().max(5000).nullable(),
  })
  .strict();

const PROCEDURE_EXERCISE_SCHEMA = z
  .object({
    id: z.string().min(1).max(120),
    instruction: z.string().min(2).max(500),
    supportHtml: z.string().max(12000).nullable(),
  })
  .strict();

const PROCEDURE_CARD_SCHEMA = z
  .object({
    type: z.literal("procedure"),
    id: z.string().min(1).max(120),
    subject: z.string().min(2).max(120),
    level: z.string().min(1).max(120),
    title: z.string().min(2).max(160),
    goal: z.string().min(4).max(500),
    stepsHtml: z.array(z.string().min(2).max(12000)).min(1).max(6),
    exampleHtml: z.string().min(4).max(12000),
    monTruc: z.string().min(4).max(500),
    exercises: z.array(PROCEDURE_EXERCISE_SCHEMA).min(1).max(5),
    quiz: z.array(QUIZ_QUESTION_SCHEMA).min(1).max(4),
    audioScript: z.string().max(5000).nullable(),
  })
  .strict();

const RICH_TEXT_FRAGMENT_SCHEMA = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("text"),
        text: z.string().min(1).max(500),
      })
      .strict(),
    z
      .object({
        type: z.literal("highlight"),
        tag: z.enum(["term", "keyword", "ending"]),
        text: z.string().min(1).max(500),
      })
      .strict(),
  ])
  .readonly();

const RICH_TEXT_LINE_SCHEMA = z.array(RICH_TEXT_FRAGMENT_SCHEMA).min(1).max(20);

const STRUCTURED_EXAMPLE_SCHEMA = z
  .object({
    label: z.string().min(1).max(300).optional(),
    explanation: z.string().min(1).max(500).optional(),
    text: z.array(RICH_TEXT_LINE_SCHEMA).min(1).max(8),
  })
  .strict();

const VISUAL_AID_KIND_SCHEMA = z.enum([
  "step_sequence",
  "column_operation",
  "term_result_map",
  "worked_example",
  "marked_shape",
  "compare_table",
  "number_line",
  "classification_grid",
  "vocab_cards",
  "conjugation_grid",
]);

const VISUAL_AID_SCHEMA = z
  .object({
    id: z.string().min(1).max(120),
    kind: VISUAL_AID_KIND_SCHEMA,
    title: z.string().min(2).max(180),
    note: z.string().min(1).max(400).optional(),
  })
  .passthrough();

const STRUCTURED_CONTENT_SCHEMA = z
  .object({
    definition: RICH_TEXT_LINE_SCHEMA.optional(),
    jeRetiens: z
      .object({
        title: z.string().min(1).max(200).optional(),
        items: z.array(RICH_TEXT_LINE_SCHEMA).min(1).max(8),
      })
      .strict()
      .optional(),
    monTruc: z
      .object({
        bullets: z.array(RICH_TEXT_LINE_SCHEMA).min(1).max(6),
        example: STRUCTURED_EXAMPLE_SCHEMA.optional(),
      })
      .strict()
      .optional(),
    jeVois: z
      .object({
        examples: z.array(STRUCTURED_EXAMPLE_SCHEMA).min(1).max(6),
      })
      .strict()
      .optional(),
    conjugation: z
      .array(
        z
          .object({
            tense: z.string().min(1).max(160),
            verb: z.string().min(1).max(160),
            group: z.string().min(1).max(120).optional(),
            persons: z
              .array(
                z
                  .object({
                    pronoun: z.string().min(1).max(80),
                    stem: z.string().min(1).max(120),
                    ending: z.string().min(1).max(80),
                  })
                  .strict(),
              )
              .min(1)
              .max(10),
          })
          .strict(),
      )
      .max(8)
      .optional(),
    visualAids: z.array(VISUAL_AID_SCHEMA).max(24).optional(),
  })
  .strict();

const EXERCISES_PAYLOAD_SCHEMA = z
  .object({
    quiz: z.array(QUIZ_QUESTION_SCHEMA).min(1).max(8),
    miniTest: z.array(z.string().min(2).max(400)).max(8).default([]),
  })
  .strict();

const CONCEPT_GENERATION_SCHEMA = z
  .object({
    conceptCard: CONCEPT_CARD_SCHEMA,
    structured: STRUCTURED_CONTENT_SCHEMA,
    exercises: EXERCISES_PAYLOAD_SCHEMA,
  })
  .strict();

const PROCEDURE_GENERATION_SCHEMA = z
  .object({
    procedureCard: PROCEDURE_CARD_SCHEMA,
    structured: STRUCTURED_CONTENT_SCHEMA,
    exercises: EXERCISES_PAYLOAD_SCHEMA,
  })
  .strict();

const CONCEPT_GENERATION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["conceptCard", "structured", "exercises"],
  properties: {
    conceptCard: { type: "object" },
    structured: { type: "object" },
    exercises: { type: "object" },
  },
};

const PROCEDURE_GENERATION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["procedureCard", "structured", "exercises"],
  properties: {
    procedureCard: { type: "object" },
    structured: { type: "object" },
    exercises: { type: "object" },
  },
};

const EXTRA_EXERCISES_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["quiz", "miniTest"],
  properties: {
    quiz: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "question", "choices", "answer"],
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          choices: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string" },
          },
          answer: { type: "string" },
        },
      },
    },
    miniTest: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
  },
};

function normalizeAssistantJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function formatIssuePath(path: ZodIssue["path"]): string {
  if (path.length === 0) {
    return "(root)";
  }

  return path
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value === "string") {
    const cleaned = value.replace(/\s+/g, " ").trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return normalizeList(
    value
      .map((item) => toTrimmedString(item))
      .filter((item): item is string => typeof item === "string" && item.length > 0),
  );
}

function toRichTextLineFromUnknown(value: unknown): RichTextLine {
  if (Array.isArray(value)) {
    const fragments = value
      .map((fragment) => {
        const fragmentRecord = asRecord(fragment);
        if (!fragmentRecord) {
          const text = toTrimmedString(fragment);
          return text ? { type: "text" as const, text } : null;
        }

        const fragmentType = toTrimmedString(fragmentRecord.type);
        const text = toTrimmedString(fragmentRecord.text);
        if (!text) {
          return null;
        }

        if (fragmentType === "highlight") {
          const rawTag = toTrimmedString(fragmentRecord.tag);
          const tag = rawTag === "term" || rawTag === "keyword" || rawTag === "ending" ? rawTag : "keyword";
          return { type: "highlight" as const, tag, text };
        }

        return { type: "text" as const, text };
      })
      .filter((fragment): fragment is RichTextLine[number] => fragment !== null);

    if (fragments.length > 0) {
      return fragments;
    }
  }

  const text = toTrimmedString(value);
  if (!text) {
    return [];
  }

  return plainTextToRichTextLine(text);
}

function toRichTextLinesFromUnknown(value: unknown): RichTextLine[] {
  if (!Array.isArray(value)) {
    const oneLine = toRichTextLineFromUnknown(value);
    return oneLine.length > 0 ? [oneLine] : [];
  }

  const asStructuredFragments = toRichTextLineFromUnknown(value);
  if (asStructuredFragments.length > 0 && typeof value[0] === "object" && !Array.isArray(value[0])) {
    return [asStructuredFragments];
  }

  return value
    .map((item) => toRichTextLineFromUnknown(item))
    .filter((line) => line.length > 0);
}

function normalizeList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return;
    }
    const key = cleaned.toLocaleLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(cleaned);
  });

  return normalized;
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function sanitizeVisualAidBase(value: {
  id: string;
  kind: VisualAidKind;
  title: string;
  note?: string | undefined;
}): { id: string; kind: VisualAidKind; title: string; note?: string | undefined } | null {
  const id = value.id.replace(/\s+/g, " ").trim();
  const title = value.title.replace(/\s+/g, " ").trim();
  const note = typeof value.note === "string" ? value.note.replace(/\s+/g, " ").trim() : "";

  if (!id || !title) {
    return null;
  }

  return {
    id,
    kind: value.kind,
    title,
    ...(note ? { note } : {}),
  };
}

function sanitizeVisualAids(input: StructuredRevisionContent["visualAids"]): VisualAid[] {
  if (!input || input.length === 0) {
    return [];
  }

  const normalized = input
    .map((visualAid) => {
      const base = sanitizeVisualAidBase(visualAid);
      if (!base) {
        return null;
      }

      if (visualAid.kind === "step_sequence") {
        const steps = visualAid.steps
          .map((step) => {
            const text = step.text.replace(/\s+/g, " ").trim();
            if (!text) {
              return null;
            }
            const label = step.label ? step.label.replace(/\s+/g, " ").trim() : "";
            return {
              ...(label ? { label } : {}),
              text,
            };
          })
          .filter((step) => step !== null) as Array<{ label?: string; text: string }>;
        return steps.length > 0 ? { ...base, kind: "step_sequence", steps } : null;
      }

      if (visualAid.kind === "column_operation") {
        const top = visualAid.top.replace(/\s+/g, " ").trim();
        const bottom = visualAid.bottom.replace(/\s+/g, " ").trim();
        if (!top || !bottom) {
          return null;
        }
        const placeHeaders = normalizeList(visualAid.placeHeaders);
        const carry = visualAid.carry ? normalizeList(visualAid.carry) : [];
        const result = visualAid.result ? visualAid.result.replace(/\s+/g, " ").trim() : "";
        const hint = visualAid.hint ? visualAid.hint.replace(/\s+/g, " ").trim() : "";
        return {
          ...base,
          kind: "column_operation",
          operation: visualAid.operation,
          placeHeaders,
          top,
          bottom,
          ...(result ? { result } : {}),
          ...(carry.length > 0 ? { carry } : {}),
          ...(hint ? { hint } : {}),
        };
      }

      if (visualAid.kind === "term_result_map") {
        const expression = visualAid.expression.replace(/\s+/g, " ").trim();
        const termLabel = visualAid.termLabel.replace(/\s+/g, " ").trim();
        const resultLabel = visualAid.resultLabel.replace(/\s+/g, " ").trim();
        if (!expression || !termLabel || !resultLabel) {
          return null;
        }
        return {
          ...base,
          kind: "term_result_map",
          expression,
          termLabel,
          resultLabel,
        };
      }

      if (visualAid.kind === "worked_example") {
        const problem = visualAid.problem.replace(/\s+/g, " ").trim();
        const answer = visualAid.answer.replace(/\s+/g, " ").trim();
        const steps = normalizeList(visualAid.steps);
        if (!problem || !answer) {
          return null;
        }
        return {
          ...base,
          kind: "worked_example",
          problem,
          steps,
          answer,
        };
      }

      if (visualAid.kind === "marked_shape") {
        const statement = visualAid.statement.replace(/\s+/g, " ").trim();
        const items = visualAid.items
          .map((item) => {
            const label = item.label.replace(/\s+/g, " ").trim();
            if (!label) {
              return null;
            }
            return {
              label,
              ...(item.hasMarker ? { hasMarker: true } : {}),
            };
          })
          .filter((item) => item !== null) as Array<{ label: string; hasMarker?: boolean }>;
        if (!statement || items.length === 0) {
          return null;
        }
        return {
          ...base,
          kind: "marked_shape",
          statement,
          items,
        };
      }

      if (visualAid.kind === "compare_table") {
        const leftColumn = visualAid.columns[0].replace(/\s+/g, " ").trim();
        const rightColumn = visualAid.columns[1].replace(/\s+/g, " ").trim();
        const rows = visualAid.rows
          .map((row) => {
            const left = row.left.replace(/\s+/g, " ").trim();
            const right = row.right.replace(/\s+/g, " ").trim();
            if (!left && !right) {
              return null;
            }
            const note = row.note ? row.note.replace(/\s+/g, " ").trim() : "";
            return {
              left,
              right,
              ...(note ? { note } : {}),
            };
          })
          .filter((row) => row !== null) as Array<{ left: string; right: string; note?: string }>;
        if (!leftColumn || !rightColumn || rows.length === 0) {
          return null;
        }
        return {
          ...base,
          kind: "compare_table",
          columns: [leftColumn, rightColumn] as [string, string],
          rows,
        };
      }

      if (visualAid.kind === "number_line") {
        const marks = Array.from(
          new Set(
            visualAid.marks
              .map((mark) => Math.trunc(mark))
              .filter((mark) => Number.isFinite(mark)),
          ),
        );
        return {
          ...base,
          kind: "number_line",
          start: Math.trunc(visualAid.start),
          end: Math.trunc(visualAid.end),
          marks,
          ...(typeof visualAid.highlight === "number"
            ? { highlight: Math.trunc(visualAid.highlight) }
            : {}),
        };
      }

      if (visualAid.kind === "classification_grid") {
        const categories = visualAid.categories
          .map((category) => {
            const label = category.label.replace(/\s+/g, " ").trim();
            if (!label) {
              return null;
            }
            return {
              label,
              items: normalizeList(category.items),
            };
          })
          .filter((category): category is { label: string; items: string[] } => category !== null);
        return categories.length > 0
          ? {
              ...base,
              kind: "classification_grid",
              categories,
            }
          : null;
      }

      if (visualAid.kind === "vocab_cards") {
        const cards = visualAid.cards
          .map((card) => {
            const term = card.term.replace(/\s+/g, " ").trim();
            const meaning = card.meaning.replace(/\s+/g, " ").trim();
            if (!term || !meaning) {
              return null;
            }
            const example = card.example ? card.example.replace(/\s+/g, " ").trim() : "";
            return {
              term,
              meaning,
              ...(example ? { example } : {}),
            };
          })
          .filter((card) => card !== null) as Array<{ term: string; meaning: string; example?: string }>;
        return cards.length > 0
          ? {
              ...base,
              kind: "vocab_cards",
              cards,
            }
          : null;
      }

      if (visualAid.kind === "conjugation_grid") {
        const tense = visualAid.tense.replace(/\s+/g, " ").trim();
        const verb = visualAid.verb.replace(/\s+/g, " ").trim();
        const rows = visualAid.rows
          .map((row) => ({
            pronoun: row.pronoun.replace(/\s+/g, " ").trim(),
            stem: row.stem.replace(/\s+/g, " ").trim(),
            ending: row.ending.replace(/\s+/g, " ").trim(),
          }))
          .filter((row) => row.pronoun && row.stem && row.ending);
        if (!tense || !verb || rows.length === 0) {
          return null;
        }
        return {
          ...base,
          kind: "conjugation_grid",
          tense,
          verb,
          rows,
        };
      }

      return null;
    })
    .filter((visualAid) => visualAid !== null) as VisualAid[];

  return normalized.slice(0, 24);
}

function sanitizeQuizQuestion(question: RevisionQuizQuestion): RevisionQuizQuestion {
  const normalizedChoices = normalizeList(question.choices);
  const normalizedAnswer = question.answer.replace(/\s+/g, " ").trim();
  let answerIndex = normalizedChoices.findIndex(
    (choice) => choice.toLocaleLowerCase() === normalizedAnswer.toLocaleLowerCase(),
  );

  if (answerIndex < 0 && normalizedAnswer && normalizedChoices.length < 6) {
    normalizedChoices.push(normalizedAnswer);
    answerIndex = normalizedChoices.length - 1;
  }

  return {
    ...question,
    question: question.question.replace(/\s+/g, " ").trim(),
    choices: normalizedChoices,
    answer:
      answerIndex >= 0
        ? normalizedChoices[answerIndex] ?? normalizedAnswer
        : normalizedChoices[0] ?? normalizedAnswer,
  };
}

function sanitizeRichTextLine(line: RichTextLine): RichTextLine {
  return line
    .map((fragment) => {
      const text = fragment.text.replace(/\s+/g, " ").trim();
      if (!text) {
        return null;
      }

      if (fragment.type === "highlight") {
        return {
          type: "highlight" as const,
          tag: fragment.tag,
          text,
        };
      }

      return {
        type: "text" as const,
        text,
      };
    })
    .filter((fragment): fragment is RichTextLine[number] => fragment !== null);
}

function sanitizeStructuredContent(input: StructuredRevisionContent): StructuredRevisionContent {
  const definition = input.definition ? sanitizeRichTextLine(input.definition) : [];
  const jeRetiensItems =
    input.jeRetiens?.items?.map((line) => sanitizeRichTextLine(line)).filter((line) => line.length > 0) ?? [];
  const monTrucBullets =
    input.monTruc?.bullets?.map((line) => sanitizeRichTextLine(line)).filter((line) => line.length > 0) ?? [];
  const jeVoisExamples =
    input.jeVois?.examples
      ?.map((example) => {
        const text = example.text.map((line) => sanitizeRichTextLine(line)).filter((line) => line.length > 0);
        if (text.length === 0) {
          return null;
        }

        return {
          ...(example.label ? { label: example.label.replace(/\s+/g, " ").trim() } : {}),
          ...(example.explanation ? { explanation: example.explanation.replace(/\s+/g, " ").trim() } : {}),
          text,
        };
      })
      .filter((example) => example !== null) as
      | NonNullable<StructuredRevisionContent["jeVois"]>["examples"]
      | undefined;

  const conjugation =
    input.conjugation
      ?.map((block) => {
        const tense = block.tense.replace(/\s+/g, " ").trim();
        const verb = block.verb.replace(/\s+/g, " ").trim();
        if (!tense || !verb) {
          return null;
        }

        const persons = block.persons
          .map((person) => ({
            pronoun: person.pronoun.replace(/\s+/g, " ").trim(),
            stem: person.stem.replace(/\s+/g, " ").trim(),
            ending: person.ending.replace(/\s+/g, " ").trim(),
          }))
          .filter((person) => person.pronoun && person.stem && person.ending);

        if (persons.length === 0) {
          return null;
        }

        return {
          tense,
          verb,
          ...(block.group ? { group: block.group.replace(/\s+/g, " ").trim() } : {}),
          persons,
        };
      })
      .filter((block) => block !== null) as NonNullable<StructuredRevisionContent["conjugation"]> | undefined;

  const normalizedConjugation = conjugation ??
    [];
  const visualAids = sanitizeVisualAids(input.visualAids);

  const monTrucExample = input.monTruc?.example
    ? {
        ...(input.monTruc.example.label
          ? { label: input.monTruc.example.label.replace(/\s+/g, " ").trim() }
          : {}),
        ...(input.monTruc.example.explanation
          ? { explanation: input.monTruc.example.explanation.replace(/\s+/g, " ").trim() }
          : {}),
        text: input.monTruc.example.text
          .map((line) => sanitizeRichTextLine(line))
          .filter((line) => line.length > 0),
      }
    : null;

  return {
    ...(definition.length > 0 ? { definition } : {}),
    ...(jeRetiensItems.length > 0
      ? {
          jeRetiens: {
            ...(input.jeRetiens?.title ? { title: input.jeRetiens.title.replace(/\s+/g, " ").trim() } : {}),
            items: jeRetiensItems,
          },
        }
      : {}),
    ...(monTrucBullets.length > 0 || (monTrucExample && monTrucExample.text.length > 0)
      ? {
          monTruc: {
            bullets: monTrucBullets,
            ...(monTrucExample && monTrucExample.text.length > 0 ? { example: monTrucExample } : {}),
          },
        }
      : {}),
    ...(jeVoisExamples && jeVoisExamples.length > 0 ? { jeVois: { examples: jeVoisExamples } } : {}),
    ...(normalizedConjugation.length > 0 ? { conjugation: normalizedConjugation } : {}),
    ...(visualAids.length > 0 ? { visualAids } : {}),
  };
}

function sanitizeExercisesPayload(input: ExercisesPayload): ExercisesPayload {
  return {
    quiz: input.quiz.map((question) => sanitizeQuizQuestion(question)),
    miniTest: normalizeList(input.miniTest),
  };
}

function sanitizeConceptCard(input: ConceptCard): ConceptCard {
  return {
    ...input,
    id: input.id.replace(/\s+/g, " ").trim(),
    subject: input.subject.replace(/\s+/g, " ").trim(),
    level: input.level.replace(/\s+/g, " ").trim(),
    title: input.title.replace(/\s+/g, " ").trim(),
    goal: input.goal.replace(/\s+/g, " ").trim(),
    blocks: {
      jeRetiens: input.blocks.jeRetiens.replace(/\s+/g, " ").trim(),
      jeVoisHtml: input.blocks.jeVoisHtml.trim(),
      monTruc: input.blocks.monTruc.replace(/\s+/g, " ").trim(),
      examples: normalizeList(input.blocks.examples),
    },
    exercises: normalizeList(input.exercises),
    quiz: input.quiz.map((question) => sanitizeQuizQuestion(question)),
    audioScript: typeof input.audioScript === "string" ? input.audioScript.trim() : null,
  };
}

function sanitizeProcedureCard(input: ProcedureCard): ProcedureCard {
  return {
    ...input,
    id: input.id.replace(/\s+/g, " ").trim(),
    subject: input.subject.replace(/\s+/g, " ").trim(),
    level: input.level.replace(/\s+/g, " ").trim(),
    title: input.title.replace(/\s+/g, " ").trim(),
    goal: input.goal.replace(/\s+/g, " ").trim(),
    stepsHtml: input.stepsHtml.map((step) => step.trim()).filter((step) => step.length > 0),
    exampleHtml: input.exampleHtml.trim(),
    monTruc: input.monTruc.replace(/\s+/g, " ").trim(),
    exercises: input.exercises
      .map((exercise) => ({
        id: exercise.id.replace(/\s+/g, " ").trim(),
        instruction: exercise.instruction.replace(/\s+/g, " ").trim(),
        supportHtml:
          typeof exercise.supportHtml === "string" && exercise.supportHtml.trim().length > 0
            ? exercise.supportHtml.trim()
            : null,
      }))
      .filter((exercise) => exercise.id.length > 0 && exercise.instruction.length > 0),
    quiz: input.quiz.map((question) => sanitizeQuizQuestion(question)),
    audioScript: typeof input.audioScript === "string" ? input.audioScript.trim() : null,
  };
}

function coerceQuizQuestionsFromUnknown(value: unknown): RevisionQuizQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const question = toTrimmedString(record.question) ?? toTrimmedString(record.prompt);
      const choices = toStringList(record.choices);
      const answer = toTrimmedString(record.answer);

      if (!question || choices.length < 2) {
        return null;
      }

      return sanitizeQuizQuestion({
        id: toTrimmedString(record.id) ?? `q-${index + 1}`,
        question,
        choices,
        answer: answer ?? choices[0] ?? "",
      });
    })
    .filter((question): question is RevisionQuizQuestion => question !== null);
}

function coerceExercisesPayloadFromUnknown(value: unknown): ExercisesPayload {
  const root = asRecord(value);
  if (!root) {
    return {
      quiz: [],
      miniTest: [],
    };
  }

  const quiz = coerceQuizQuestionsFromUnknown(root.quiz ?? root.questions ?? root.quizQuestions);
  const miniTest = toStringList(root.miniTest ?? root.mini_test ?? root.tasks ?? root.exercises);

  return sanitizeExercisesPayload({
    quiz,
    miniTest,
  });
}

function buildFallbackExtraExercisesFromCard(
  card: StoredRevisionCard,
  structured: StructuredRevisionContent,
): ExercisesPayload {
  const storedQuiz = mapStoredQuizToRevisionQuizQuestions(card.content.quiz).map((question) =>
    sanitizeQuizQuestion(question),
  );
  const conceptQuiz = card.content.concept?.quiz?.map((question) => sanitizeQuizQuestion(question)) ?? [];
  const procedureQuiz = card.content.procedure?.quiz?.map((question) => sanitizeQuizQuestion(question)) ?? [];
  const vocabQuiz = card.content.vocab?.quiz?.map((question) => sanitizeQuizQuestion(question)) ?? [];
  const comprehensionQuiz = card.content.comprehension?.quiz?.map((question) => sanitizeQuizQuestion(question)) ?? [];
  const generatedQuiz = card.content.generatedExercises?.quiz?.map((question) => sanitizeQuizQuestion(question)) ?? [];

  const quiz = normalizeQuizPool([
    ...generatedQuiz,
    ...storedQuiz,
    ...conceptQuiz,
    ...procedureQuiz,
    ...vocabQuiz,
    ...comprehensionQuiz,
  ]).slice(0, 4);

  const miniTestFromStructured = normalizeList([
    ...toPlainLines(structured.jeRetiens?.items).map((item) => `Explique avec tes mots: ${item}`),
    ...toPlainLines(structured.monTruc?.bullets).map((item) => `Applique cette astuce: ${item}`),
    ...extractExamplesFromStructured(structured).map((example) => `Observe puis explique: ${example}`),
  ]);
  const miniTestFromCard = normalizeList([
    ...(card.content.generatedExercises?.miniTest ?? []),
    ...card.content.steps,
  ]);
  const miniTest = normalizeList([...miniTestFromStructured, ...miniTestFromCard]).slice(0, 4);

  const safeQuiz =
    quiz.length > 0
      ? quiz
      : [
          sanitizeQuizQuestion({
            id: "fallback-q1",
            question: "Quelle phrase resume le mieux cette fiche ?",
            choices: [
              toPlainLine(structured.definition) || card.content.summary || card.title,
              "Je ne sais pas encore.",
            ].map((value) => value.replace(/\s+/g, " ").trim()),
            answer: toPlainLine(structured.definition) || card.content.summary || card.title,
          }),
        ];

  const safeMiniTest =
    miniTest.length > 0
      ? miniTest
      : [`Relis "${card.title}" puis explique la regle en une phrase.`];

  return sanitizeExercisesPayload({
    quiz: safeQuiz,
    miniTest: safeMiniTest,
  });
}

function normalizeQuizPool(questions: RevisionQuizQuestion[]): RevisionQuizQuestion[] {
  const seen = new Set<string>();
  const normalized: RevisionQuizQuestion[] = [];

  questions.forEach((question, index) => {
    const sanitized = sanitizeQuizQuestion({
      ...question,
      id: question.id || `q-${index + 1}`,
    });
    const key = `${sanitized.question.toLocaleLowerCase()}::${sanitized.answer.toLocaleLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(sanitized);
  });

  return normalized;
}

function coerceVisualAidsFromUnknown(value: unknown): VisualAid[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = value
    .map((entry, index) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const kind = toTrimmedString(record.kind) as VisualAidKind | null;
      const title = toTrimmedString(record.title);
      if (!kind || !title) {
        return null;
      }

      const id = toTrimmedString(record.id) ?? `visual-aid-${index + 1}`;
      const note = toTrimmedString(record.note);

      if (kind === "step_sequence") {
        const rawSteps = Array.isArray(record.steps) ? record.steps : [];
        const steps = rawSteps
          .map((step) => {
            const stepRecord = asRecord(step);
            if (!stepRecord) {
              const text = toTrimmedString(step);
              return text ? { text } : null;
            }
            const text = toTrimmedString(stepRecord.text);
            if (!text) {
              return null;
            }
            const label = toTrimmedString(stepRecord.label);
            return {
              ...(label ? { label } : {}),
              text,
            };
          })
          .filter((step) => step !== null) as Array<{ text: string; label?: string }>;
        return steps.length > 0
          ? {
              id,
              kind,
              title,
              ...(note ? { note } : {}),
              steps,
            }
          : null;
      }

      if (kind === "column_operation") {
        const top = toTrimmedString(record.top);
        const bottom = toTrimmedString(record.bottom);
        const operation = toTrimmedString(record.operation);
        if (!top || !bottom) {
          return null;
        }
        const validOperation =
          operation === "addition" ||
          operation === "subtraction" ||
          operation === "multiplication" ||
          operation === "division"
            ? operation
            : "addition";
        const placeHeaders = toStringList(record.placeHeaders);
        const carry = toStringList(record.carry);
        const result = toTrimmedString(record.result);
        const hint = toTrimmedString(record.hint);
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          operation: validOperation,
          placeHeaders,
          top,
          bottom,
          ...(result ? { result } : {}),
          ...(carry.length > 0 ? { carry } : {}),
          ...(hint ? { hint } : {}),
        };
      }

      if (kind === "term_result_map") {
        const expression = toTrimmedString(record.expression);
        const termLabel = toTrimmedString(record.termLabel);
        const resultLabel = toTrimmedString(record.resultLabel);
        if (!expression || !termLabel || !resultLabel) {
          return null;
        }
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          expression,
          termLabel,
          resultLabel,
        };
      }

      if (kind === "worked_example") {
        const problem = toTrimmedString(record.problem);
        const answer = toTrimmedString(record.answer);
        const steps = toStringList(record.steps);
        if (!problem || !answer) {
          return null;
        }
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          problem,
          steps,
          answer,
        };
      }

      if (kind === "marked_shape") {
        const statement = toTrimmedString(record.statement);
        const rawItems = Array.isArray(record.items) ? record.items : [];
        const items = rawItems
          .map((item) => {
            const itemRecord = asRecord(item);
            if (!itemRecord) {
              const label = toTrimmedString(item);
              return label ? { label } : null;
            }
            const label = toTrimmedString(itemRecord.label);
            if (!label) {
              return null;
            }
            return {
              label,
              ...(itemRecord.hasMarker === true ? { hasMarker: true } : {}),
            };
          })
          .filter((item) => item !== null) as Array<{ label: string; hasMarker?: boolean }>;
        if (!statement || items.length === 0) {
          return null;
        }
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          statement,
          items,
        };
      }

      if (kind === "compare_table") {
        const columnsRaw = Array.isArray(record.columns) ? record.columns : [];
        const leftColumn = toTrimmedString(columnsRaw[0]);
        const rightColumn = toTrimmedString(columnsRaw[1]);
        const rawRows = Array.isArray(record.rows) ? record.rows : [];
        const rows = rawRows
          .map((row) => {
            const rowRecord = asRecord(row);
            if (!rowRecord) {
              return null;
            }
            const left = toTrimmedString(rowRecord.left);
            const right = toTrimmedString(rowRecord.right);
            if (!left && !right) {
              return null;
            }
            const rowNote = toTrimmedString(rowRecord.note);
            return {
              left: left ?? "",
              right: right ?? "",
              ...(rowNote ? { note: rowNote } : {}),
            };
          })
          .filter((row) => row !== null) as Array<{ left: string; right: string; note?: string }>;
        if (!leftColumn || !rightColumn || rows.length === 0) {
          return null;
        }
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          columns: [leftColumn, rightColumn] as [string, string],
          rows,
        };
      }

      if (kind === "number_line") {
        const start = toInteger(record.start);
        const end = toInteger(record.end);
        if (start === null || end === null) {
          return null;
        }
        const marks = Array.isArray(record.marks)
          ? Array.from(
              new Set(
                record.marks
                  .map((mark) => toInteger(mark))
                  .filter((mark): mark is number => mark !== null),
              ),
            )
          : [];
        const highlight = toInteger(record.highlight);
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          start,
          end,
          marks,
          ...(highlight !== null ? { highlight } : {}),
        };
      }

      if (kind === "classification_grid") {
        const rawCategories = Array.isArray(record.categories) ? record.categories : [];
        const categories = rawCategories
          .map((category) => {
            const categoryRecord = asRecord(category);
            if (!categoryRecord) {
              return null;
            }
            const label = toTrimmedString(categoryRecord.label);
            if (!label) {
              return null;
            }
            return {
              label,
              items: toStringList(categoryRecord.items),
            };
          })
          .filter((category): category is { label: string; items: string[] } => category !== null);
        return categories.length > 0
          ? {
              id,
              kind,
              title,
              ...(note ? { note } : {}),
              categories,
            }
          : null;
      }

      if (kind === "vocab_cards") {
        const rawCards = Array.isArray(record.cards) ? record.cards : [];
        const cards = rawCards
          .map((card) => {
            const cardRecord = asRecord(card);
            if (!cardRecord) {
              return null;
            }
            const term = toTrimmedString(cardRecord.term);
            const meaning = toTrimmedString(cardRecord.meaning);
            if (!term || !meaning) {
              return null;
            }
            const example = toTrimmedString(cardRecord.example);
            return {
              term,
              meaning,
              ...(example ? { example } : {}),
            };
          })
          .filter((card) => card !== null) as Array<{ term: string; meaning: string; example?: string }>;
        return cards.length > 0
          ? {
              id,
              kind,
              title,
              ...(note ? { note } : {}),
              cards,
            }
          : null;
      }

      if (kind === "conjugation_grid") {
        const tense = toTrimmedString(record.tense);
        const verb = toTrimmedString(record.verb);
        const rawRows = Array.isArray(record.rows) ? record.rows : [];
        const rows = rawRows
          .map((row) => {
            const rowRecord = asRecord(row);
            if (!rowRecord) {
              return null;
            }
            const pronoun = toTrimmedString(rowRecord.pronoun);
            const stem = toTrimmedString(rowRecord.stem);
            const ending = toTrimmedString(rowRecord.ending);
            if (!pronoun || !stem || !ending) {
              return null;
            }
            return { pronoun, stem, ending };
          })
          .filter((row): row is { pronoun: string; stem: string; ending: string } => row !== null);
        if (!tense || !verb || rows.length === 0) {
          return null;
        }
        return {
          id,
          kind,
          title,
          ...(note ? { note } : {}),
          tense,
          verb,
          rows,
        };
      }

      return null;
    })
    .filter((visualAid) => visualAid !== null) as VisualAid[];

  return parsed.slice(0, 24);
}

function coerceStructuredContentFromUnknown(input: unknown): StructuredRevisionContent {
  const root = asRecord(input);
  if (!root) {
    return {};
  }

  const definition = toRichTextLineFromUnknown(root.definition);

  const jeRetiensRoot = asRecord(root.jeRetiens);
  const jeRetiensItems = toRichTextLinesFromUnknown(
    jeRetiensRoot?.items ?? jeRetiensRoot?.bullets ?? root.jeRetiens,
  );

  const monTrucRoot = asRecord(root.monTruc);
  const monTrucBullets = toRichTextLinesFromUnknown(
    monTrucRoot?.bullets ?? monTrucRoot?.items ?? root.monTruc,
  );
  const monTrucExampleRoot = asRecord(monTrucRoot?.example);
  const monTrucExampleText = toRichTextLinesFromUnknown(monTrucExampleRoot?.text);

  const jeVoisRoot = asRecord(root.jeVois);
  const rawExamples = Array.isArray(jeVoisRoot?.examples)
    ? jeVoisRoot.examples
    : Array.isArray(root.examples)
      ? root.examples
      : [];
  const examples = rawExamples
    .map((example) => {
      const exampleRecord = asRecord(example);
      if (!exampleRecord) {
        const line = toRichTextLineFromUnknown(example);
        if (line.length === 0) {
          return null;
        }
        const normalized: NonNullable<StructuredRevisionContent["jeVois"]>["examples"][number] = { text: [line] };
        return normalized;
      }

      const textLines = toRichTextLinesFromUnknown(exampleRecord.text ?? exampleRecord.value ?? exampleRecord.example);
      if (textLines.length === 0) {
        return null;
      }

      const label = toTrimmedString(exampleRecord.label);
      const explanation = toTrimmedString(exampleRecord.explanation);

      const normalized: NonNullable<StructuredRevisionContent["jeVois"]>["examples"][number] = {
        ...(label ? { label } : {}),
        ...(explanation ? { explanation } : {}),
        text: textLines,
      };

      return normalized;
    })
    .filter((example): example is NonNullable<StructuredRevisionContent["jeVois"]>["examples"][number] => example !== null);

  const conjugation = Array.isArray(root.conjugation)
    ? root.conjugation
        .map((block) => {
          const blockRecord = asRecord(block);
          if (!blockRecord) {
            return null;
          }

          const tense = toTrimmedString(blockRecord.tense);
          const verb = toTrimmedString(blockRecord.verb);
          const persons = Array.isArray(blockRecord.persons)
            ? blockRecord.persons
                .map((person) => {
                  const personRecord = asRecord(person);
                  if (!personRecord) {
                    return null;
                  }

                  const pronoun = toTrimmedString(personRecord.pronoun);
                  const stem = toTrimmedString(personRecord.stem);
                  const ending = toTrimmedString(personRecord.ending);

                  if (!pronoun || !stem || !ending) {
                    return null;
                  }

                  return { pronoun, stem, ending };
                })
                .filter((person): person is { pronoun: string; stem: string; ending: string } => person !== null)
            : [];

          if (!tense || !verb || persons.length === 0) {
            return null;
          }

          const group = toTrimmedString(blockRecord.group);
          const normalized: NonNullable<StructuredRevisionContent["conjugation"]>[number] = {
            tense,
            verb,
            ...(group ? { group } : {}),
            persons,
          };

          return normalized;
        })
        .filter((block): block is NonNullable<StructuredRevisionContent["conjugation"]>[number] => block !== null)
    : [];

  const jeRetiensTitle = toTrimmedString(jeRetiensRoot?.title);
  const monTrucExampleLabel = toTrimmedString(monTrucExampleRoot?.label);
  const monTrucExampleExplanation = toTrimmedString(monTrucExampleRoot?.explanation);
  const visualAids = coerceVisualAidsFromUnknown(root.visualAids);

  return sanitizeStructuredContent({
    ...(definition.length > 0 ? { definition } : {}),
    ...(jeRetiensItems.length > 0
      ? {
          jeRetiens: {
            ...(jeRetiensTitle ? { title: jeRetiensTitle } : {}),
            items: jeRetiensItems,
          },
        }
      : {}),
    ...(monTrucBullets.length > 0 || monTrucExampleText.length > 0
      ? {
          monTruc: {
            bullets: monTrucBullets,
            ...(monTrucExampleText.length > 0
                ? {
                  example: {
                    ...(monTrucExampleLabel ? { label: monTrucExampleLabel } : {}),
                    ...(monTrucExampleExplanation ? { explanation: monTrucExampleExplanation } : {}),
                    text: monTrucExampleText,
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(examples.length > 0 ? { jeVois: { examples } } : {}),
    ...(conjugation.length > 0 ? { conjugation } : {}),
    ...(visualAids.length > 0 ? { visualAids } : {}),
  });
}

function coerceConceptGenerationPayload(
  payload: unknown,
  input: { subject: string; level: string; topic: string },
): { conceptCard: ConceptCard; structured: StructuredRevisionContent; exercises: ExercisesPayload } {
  const root = asRecord(payload) ?? {};
  const rawConcept = asRecord(root.conceptCard) ?? {};
  const rawBlocks = asRecord(rawConcept.blocks) ?? {};
  const rawStructured = root.structured;
  const rawExercises = asRecord(root.exercises) ?? {};

  const fallbackTitle = input.topic;
  const fallbackGoal = `Comprendre ${input.topic}.`;
  const blockJeRetiens = toTrimmedString(rawBlocks.jeRetiens) ?? toTrimmedString(rawConcept.jeRetiens) ?? fallbackGoal;
  const blockExamples = toStringList(rawBlocks.examples);
  const blockJeVoisHtml =
    toTrimmedString(rawBlocks.jeVoisHtml) ??
    (blockExamples.map((example) => `<p>${example}</p>`).join("") || "<p>Exemple a completer.</p>");
  const blockMonTruc = toTrimmedString(rawBlocks.monTruc) ?? toTrimmedString(rawConcept.monTruc) ?? `Astuce: pense a ${input.topic}.`;

  const conceptCard = sanitizeConceptCard({
    type: "concept",
    id: toTrimmedString(rawConcept.id) ?? "generated-concept-card",
    subject: input.subject,
    level: input.level,
    title: toTrimmedString(rawConcept.title) ?? fallbackTitle,
    goal: toTrimmedString(rawConcept.goal) ?? fallbackGoal,
    blocks: {
      jeRetiens: blockJeRetiens,
      jeVoisHtml: blockJeVoisHtml,
      monTruc: blockMonTruc,
      examples: blockExamples.length > 0 ? blockExamples : [fallbackTitle],
    },
    exercises: (() => {
      const fromRaw = toStringList(rawConcept.exercises);
      if (fromRaw.length > 0) {
        return fromRaw;
      }
      const miniTest = toStringList(rawExercises.miniTest);
      if (miniTest.length > 0) {
        return miniTest;
      }
      return [`Explique avec tes mots: ${input.topic}.`];
    })(),
    quiz: (() => {
      const quiz = coerceQuizQuestionsFromUnknown(rawConcept.quiz);
      if (quiz.length > 0) {
        return quiz;
      }

      const extraQuiz = coerceQuizQuestionsFromUnknown(rawExercises.quiz);
      if (extraQuiz.length > 0) {
        return extraQuiz;
      }

      return [
        {
          id: "q-1",
          question: `Quelle phrase parle de ${input.topic} ?`,
          choices: [input.topic, "Aucune des deux"],
          answer: input.topic,
        },
      ];
    })(),
    audioScript: toTrimmedString(rawConcept.audioScript),
  });

  const structuredRaw = coerceStructuredContentFromUnknown(rawStructured);
  const structured =
    Object.keys(structuredRaw).length > 0 ? structuredRaw : deriveStructuredFromConceptCard(conceptCard);

  const exercises = sanitizeExercisesPayload({
    quiz: (() => {
      const quiz = coerceQuizQuestionsFromUnknown(rawExercises.quiz);
      return quiz.length > 0 ? quiz : conceptCard.quiz;
    })(),
    miniTest: (() => {
      const miniTest = toStringList(rawExercises.miniTest);
      return miniTest.length > 0 ? miniTest : conceptCard.exercises;
    })(),
  });

  return {
    conceptCard,
    structured,
    exercises,
  };
}

function coerceProcedureGenerationPayload(
  payload: unknown,
  input: { subject: string; level: string; topic: string },
): { procedureCard: ProcedureCard; structured: StructuredRevisionContent; exercises: ExercisesPayload } {
  const root = asRecord(payload) ?? {};
  const rawProcedure = asRecord(root.procedureCard) ?? {};
  const rawExercises = asRecord(root.exercises) ?? {};

  const fallbackTitle = input.topic;
  const fallbackGoal = `Appliquer ${input.topic} pas a pas.`;
  const stepsHtml = toStringList(rawProcedure.stepsHtml).map((step) => `<p>${step}</p>`);

  const procedureCard = sanitizeProcedureCard({
    type: "procedure",
    id: toTrimmedString(rawProcedure.id) ?? "generated-procedure-card",
    subject: input.subject,
    level: input.level,
    title: toTrimmedString(rawProcedure.title) ?? fallbackTitle,
    goal: toTrimmedString(rawProcedure.goal) ?? fallbackGoal,
    stepsHtml: stepsHtml.length > 0 ? stepsHtml : ["<p>Etape 1 a completer.</p>"],
    exampleHtml: toTrimmedString(rawProcedure.exampleHtml) ?? "<p>Exemple a completer.</p>",
    monTruc: toTrimmedString(rawProcedure.monTruc) ?? `Astuce: avance etape par etape pour ${input.topic}.`,
    exercises: (() => {
      if (Array.isArray(rawProcedure.exercises)) {
        const mapped = rawProcedure.exercises
          .map((exercise, index) => {
            const record = asRecord(exercise);
            if (!record) {
              const text = toTrimmedString(exercise);
              if (!text) {
                return null;
              }
              return {
                id: `ex-${index + 1}`,
                instruction: text,
                supportHtml: null,
              };
            }

            const instruction = toTrimmedString(record.instruction) ?? toTrimmedString(record.prompt);
            if (!instruction) {
              return null;
            }

            return {
              id: toTrimmedString(record.id) ?? `ex-${index + 1}`,
              instruction,
              supportHtml: toTrimmedString(record.supportHtml),
            };
          })
          .filter(
            (exercise): exercise is ProcedureCard["exercises"][number] => exercise !== null,
          );

        if (mapped.length > 0) {
          return mapped;
        }
      }

      const miniTest = toStringList(rawExercises.miniTest);
      if (miniTest.length > 0) {
        return miniTest.map((instruction, index) => ({
          id: `ex-${index + 1}`,
          instruction,
          supportHtml: null,
        }));
      }

      return [
        {
          id: "ex-1",
          instruction: `Applique ${input.topic} sur un exemple simple.`,
          supportHtml: null,
        },
      ];
    })(),
    quiz: (() => {
      const quiz = coerceQuizQuestionsFromUnknown(rawProcedure.quiz);
      if (quiz.length > 0) {
        return quiz;
      }

      const extraQuiz = coerceQuizQuestionsFromUnknown(rawExercises.quiz);
      if (extraQuiz.length > 0) {
        return extraQuiz;
      }

      return [
        {
          id: "q-1",
          question: `Quelle etape vient en premier pour ${input.topic} ?`,
          choices: ["Lire la consigne", "Repondre au hasard"],
          answer: "Lire la consigne",
        },
      ];
    })(),
    audioScript: toTrimmedString(rawProcedure.audioScript),
  });

  const structuredRaw = coerceStructuredContentFromUnknown(root.structured);
  const structured =
    Object.keys(structuredRaw).length > 0 ? structuredRaw : deriveStructuredFromProcedureCard(procedureCard);

  const exercises = sanitizeExercisesPayload({
    quiz: (() => {
      const quiz = coerceQuizQuestionsFromUnknown(rawExercises.quiz);
      return quiz.length > 0 ? quiz : procedureCard.quiz;
    })(),
    miniTest: (() => {
      const miniTest = toStringList(rawExercises.miniTest);
      return miniTest.length > 0
        ? miniTest
        : procedureCard.exercises.map((exercise) => exercise.instruction);
    })(),
  });

  return {
    procedureCard,
    structured,
    exercises,
  };
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapDomainQuizToStoredChoicesQuiz(
  quiz: RevisionQuizQuestion[],
): RevisionQuizChoiceQuestion[] {
  return quiz.map((question) => {
    const choices = normalizeList(question.choices);
    const normalizedAnswer = question.answer.trim().toLocaleLowerCase();
    const answerIndex = choices.findIndex((choice) => choice.toLocaleLowerCase() === normalizedAnswer);

    return {
      kind: "choices",
      prompt: question.question,
      choices,
      answerIndex: answerIndex >= 0 ? answerIndex : null,
      explanation: null,
    };
  });
}

function toPlainLine(line: RichTextLine | undefined): string {
  return richTextLineToPlainText(line);
}

function toPlainLines(lines: RichTextLine[] | undefined): string[] {
  if (!lines) {
    return [];
  }

  return normalizeList(lines.map((line) => richTextLineToPlainText(line)).filter((line) => line.length > 0));
}

function extractExamplesFromStructured(structured: StructuredRevisionContent): string[] {
  if (!structured.jeVois?.examples || structured.jeVois.examples.length === 0) {
    return [];
  }

  return normalizeList(
    structured.jeVois.examples.map((example) => {
      const lines = example.text.map((line) => richTextLineToPlainText(line)).filter((line) => line.length > 0);
      return lines.join(" ");
    }),
  );
}

function deriveStructuredFromConceptCard(card: ConceptCard): StructuredRevisionContent {
  const definition = plainTextToRichTextLine(card.blocks.jeRetiens);
  return sanitizeStructuredContent({
    ...(definition.length > 0 ? { definition } : {}),
    ...(definition.length > 0
      ? {
          jeRetiens: {
            items: [definition],
          },
        }
      : {}),
    ...(card.blocks.examples.length > 0
      ? {
          jeVois: {
            examples: card.blocks.examples.map((example) => ({
              text: [plainTextToRichTextLine(example)],
            })),
          },
        }
      : {}),
    ...(card.blocks.monTruc
      ? {
          monTruc: {
            bullets: [plainTextToRichTextLine(card.blocks.monTruc)],
          },
        }
      : {}),
  });
}

function deriveStructuredFromProcedureCard(card: ProcedureCard): StructuredRevisionContent {
  const definition = plainTextToRichTextLine(card.goal);
  return sanitizeStructuredContent({
    ...(definition.length > 0 ? { definition } : {}),
    ...(card.stepsHtml.length > 0
      ? {
          jeRetiens: {
            items: card.stepsHtml.map((step) => plainTextToRichTextLine(stripHtmlToText(step), "keyword")),
          },
        }
      : {}),
    ...(card.exampleHtml
      ? {
          jeVois: {
            examples: [
              {
                text: [plainTextToRichTextLine(stripHtmlToText(card.exampleHtml))],
              },
            ],
          },
        }
      : {}),
    ...(card.monTruc
      ? {
          monTruc: {
            bullets: [plainTextToRichTextLine(card.monTruc)],
          },
        }
      : {}),
  });
}

function buildSourceConstraintBlock(source: string): string {
  return [
    "Base de connaissance fermee:",
    "- Tu dois rester STRICTEMENT dans ce contenu source.",
    "- Tu ne dois pas inventer de nouvelles regles, exemples ou definitions.",
    "- Tu dois utiliser uniquement les termes qui figurent dans la SOURCE ci-dessous.",
    "- N'utilise pas de nomenclature scolaire francaise (COD, COI, etc.) sauf si ces termes apparaissent explicitement dans la SOURCE.",
    "- Si un schema explicatif n'est pas clairement derivable de la source, laisse structured.visualAids vide.",
    "- Si une information n'est pas presente dans la source, laisse le champ vide.",
    "SOURCE:",
    source,
  ].join("\n");
}

const FRANCE_ONLY_GRAMMAR_TERMS = [
  "cod",
  "coi",
  "complement d objet direct",
  "complement d objet indirect",
  "attribut du sujet",
  "cm1",
  "cm2",
  "ce1",
  "ce2",
  "sixieme",
  "cinquieme",
  "quatrieme",
  "troisieme",
  "college",
  "lycee",
];

function normalizeForClosedBookCheck(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectVisualAidsOutputText(visualAids: StructuredRevisionContent["visualAids"]): string {
  if (!visualAids || visualAids.length === 0) {
    return "";
  }

  return visualAids
    .map((visualAid) => {
      if (visualAid.kind === "step_sequence") {
        return [visualAid.title, visualAid.note ?? "", visualAid.steps.map((step) => `${step.label ?? ""} ${step.text}`).join(" ")].join(" ");
      }
      if (visualAid.kind === "column_operation") {
        return [
          visualAid.title,
          visualAid.note ?? "",
          visualAid.operation,
          visualAid.placeHeaders.join(" "),
          visualAid.top,
          visualAid.bottom,
          visualAid.result ?? "",
          visualAid.hint ?? "",
          (visualAid.carry ?? []).join(" "),
        ].join(" ");
      }
      if (visualAid.kind === "term_result_map") {
        return [visualAid.title, visualAid.note ?? "", visualAid.expression, visualAid.termLabel, visualAid.resultLabel].join(" ");
      }
      if (visualAid.kind === "worked_example") {
        return [visualAid.title, visualAid.note ?? "", visualAid.problem, visualAid.steps.join(" "), visualAid.answer].join(" ");
      }
      if (visualAid.kind === "marked_shape") {
        return [visualAid.title, visualAid.note ?? "", visualAid.statement, visualAid.items.map((item) => item.label).join(" ")].join(" ");
      }
      if (visualAid.kind === "compare_table") {
        return [
          visualAid.title,
          visualAid.note ?? "",
          visualAid.columns.join(" "),
          visualAid.rows.map((row) => `${row.left} ${row.right} ${row.note ?? ""}`).join(" "),
        ].join(" ");
      }
      if (visualAid.kind === "number_line") {
        return [
          visualAid.title,
          visualAid.note ?? "",
          String(visualAid.start),
          String(visualAid.end),
          visualAid.marks.map(String).join(" "),
          typeof visualAid.highlight === "number" ? String(visualAid.highlight) : "",
        ].join(" ");
      }
      if (visualAid.kind === "classification_grid") {
        return [
          visualAid.title,
          visualAid.note ?? "",
          visualAid.categories.map((category) => `${category.label} ${category.items.join(" ")}`).join(" "),
        ].join(" ");
      }
      if (visualAid.kind === "vocab_cards") {
        return [
          visualAid.title,
          visualAid.note ?? "",
          visualAid.cards.map((card) => `${card.term} ${card.meaning} ${card.example ?? ""}`).join(" "),
        ].join(" ");
      }
      return [
        visualAid.title,
        visualAid.note ?? "",
        visualAid.tense,
        visualAid.verb,
        visualAid.rows.map((row) => `${row.pronoun} ${row.stem} ${row.ending}`).join(" "),
      ].join(" ");
    })
    .join(" ");
}

function collectConceptOutputText(payload: GenerateConceptResult): string {
  return [
    payload.conceptCard.title,
    payload.conceptCard.goal,
    payload.conceptCard.blocks.jeRetiens,
    stripHtmlToText(payload.conceptCard.blocks.jeVoisHtml),
    payload.conceptCard.blocks.monTruc,
    payload.conceptCard.blocks.examples.join(" "),
    payload.conceptCard.exercises.join(" "),
    payload.conceptCard.quiz
      .map((question) => [question.question, question.choices.join(" "), question.answer].join(" "))
      .join(" "),
    payload.exercises.quiz
      .map((question) => [question.question, question.choices.join(" "), question.answer].join(" "))
      .join(" "),
    payload.exercises.miniTest.join(" "),
    collectVisualAidsOutputText(payload.structured.visualAids),
  ]
    .join(" ")
    .trim();
}

function collectProcedureOutputText(payload: GenerateProcedureResult): string {
  return [
    payload.procedureCard.title,
    payload.procedureCard.goal,
    payload.procedureCard.stepsHtml.map((step) => stripHtmlToText(step)).join(" "),
    stripHtmlToText(payload.procedureCard.exampleHtml),
    payload.procedureCard.monTruc,
    payload.procedureCard.exercises.map((exercise) => exercise.instruction).join(" "),
    payload.procedureCard.quiz
      .map((question) => [question.question, question.choices.join(" "), question.answer].join(" "))
      .join(" "),
    payload.exercises.quiz
      .map((question) => [question.question, question.choices.join(" "), question.answer].join(" "))
      .join(" "),
    payload.exercises.miniTest.join(" "),
    collectVisualAidsOutputText(payload.structured.visualAids),
  ]
    .join(" ")
    .trim();
}

function findForbiddenTermsOutsideSource(outputText: string, source: string): string[] {
  const normalizedOutput = normalizeForClosedBookCheck(outputText);
  const normalizedSource = normalizeForClosedBookCheck(source);

  return FRANCE_ONLY_GRAMMAR_TERMS.filter((term) => {
    const hasInOutput = normalizedOutput.includes(term);
    if (!hasInOutput) {
      return false;
    }
    const hasInSource = normalizedSource.includes(term);
    return !hasInSource;
  });
}

export class ConceptGenerationParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConceptGenerationParseError";
  }
}

export class ConceptGenerationValidationError extends Error {
  readonly issues: Array<{ path: string; message: string }>;

  constructor(issues: ZodIssue[]) {
    const firstIssue = issues[0];
    const detail = firstIssue
      ? `${formatIssuePath(firstIssue.path)}: ${firstIssue.message}`
      : "Unknown validation issue.";
    super(`Generated concept card failed validation (${detail})`);
    this.name = "ConceptGenerationValidationError";
    this.issues = issues.map((issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
    }));
  }
}

export class ProcedureGenerationParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcedureGenerationParseError";
  }
}

export class ProcedureGenerationValidationError extends Error {
  readonly issues: Array<{ path: string; message: string }>;

  constructor(issues: ZodIssue[]) {
    const firstIssue = issues[0];
    const detail = firstIssue
      ? `${formatIssuePath(firstIssue.path)}: ${firstIssue.message}`
      : "Unknown validation issue.";
    super(`Generated procedure card failed validation (${detail})`);
    this.name = "ProcedureGenerationValidationError";
    this.issues = issues.map((issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
    }));
  }
}

export class ExtraExercisesGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtraExercisesGenerationError";
  }
}

export async function generateConceptCardWithAI(
  input: GenerateConceptInput,
): Promise<GenerateConceptResult> {
  const parsedInput = GENERATE_INPUT_SCHEMA.parse(input);
  const source = parsedInput.source ?? parsedInput.topic;

  const completionText = await createOpenAIJsonChatCompletion({
    temperature: 0.2,
    diagnostics: {
      subject: parsedInput.subject,
      level: parsedInput.level,
      kind: "concept",
      promptLength: source.length,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an expert primary-school pedagogy assistant.",
          "Return JSON only, no markdown and no extra keys.",
          "Language must be French used in Switzerland.",
          "Style must be TDAH/dys-friendly: short sentences, clear wording, low cognitive load.",
          "You must stay strictly inside the provided source knowledge.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "Create exactly one Concept card package with three keys: conceptCard, structured, exercises.",
          `subject: ${parsedInput.subject}`,
          `level: ${parsedInput.level}`,
          `topic: ${parsedInput.topic}`,
          "Constraints:",
          "- conceptCard.type = 'concept'",
          "- structured.definition must be very short (one short sentence)",
          "- structured.jeRetiens.items: 3 to 6 short bullet lines",
          "- structured.jeVois.examples: 2 to 4 examples",
          "- structured.monTruc.bullets: 2 to 4 bullets and one optional example",
          "- optional structured.visualAids: 0 to 2 objects",
          "- when provided, visualAids.kind must be one of: step_sequence, column_operation, term_result_map, worked_example, marked_shape, compare_table, number_line, classification_grid, vocab_cards, conjugation_grid",
          "- visual aids must stay simple, concise, and directly grounded in the source",
          "- exercises.quiz: 2 to 4 MCQ questions",
          "- exercises.miniTest: 2 to 4 short tasks",
          "- each quiz answer must match one of choices",
          buildSourceConstraintBlock(source),
        ].join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "concept_structured_card",
        schema: CONCEPT_GENERATION_JSON_SCHEMA,
      },
    },
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(normalizeAssistantJson(completionText));
  } catch {
    throw new ConceptGenerationParseError("OpenAI did not return valid JSON.");
  }

  const validated = CONCEPT_GENERATION_SCHEMA.safeParse(parsedJson);
  if (validated.success) {
    const normalizedResult: GenerateConceptResult = {
      conceptCard: sanitizeConceptCard({
        ...validated.data.conceptCard,
        subject: parsedInput.subject,
        level: parsedInput.level,
      }),
      structured: sanitizeStructuredContent(validated.data.structured as StructuredRevisionContent),
      exercises: sanitizeExercisesPayload(validated.data.exercises),
    };

    const forbiddenTerms = findForbiddenTermsOutsideSource(collectConceptOutputText(normalizedResult), source);
    if (forbiddenTerms.length > 0) {
      throw new ConceptGenerationValidationError([
        {
          code: "custom",
          path: ["grounding"],
          message: `Closed-book violation: unsupported terms found (${forbiddenTerms.join(", ")}).`,
        } as ZodIssue,
      ]);
    }

    return normalizedResult;
  }

  console.warn("[revisions] concept_generation_strict_validation_failed", {
    issues: validated.error.issues.slice(0, 5).map((issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
    })),
  });

  const coercedPayload = coerceConceptGenerationPayload(parsedJson, {
    subject: parsedInput.subject,
    level: parsedInput.level,
    topic: parsedInput.topic,
  });
  const coercedValidated = CONCEPT_GENERATION_SCHEMA.safeParse(coercedPayload);
  if (!coercedValidated.success) {
    throw new ConceptGenerationValidationError(coercedValidated.error.issues);
  }

  const normalizedResult: GenerateConceptResult = {
    conceptCard: sanitizeConceptCard(coercedValidated.data.conceptCard),
    structured: sanitizeStructuredContent(coercedValidated.data.structured as StructuredRevisionContent),
    exercises: sanitizeExercisesPayload(coercedValidated.data.exercises),
  };

  const forbiddenTerms = findForbiddenTermsOutsideSource(collectConceptOutputText(normalizedResult), source);
  if (forbiddenTerms.length > 0) {
    throw new ConceptGenerationValidationError([
      {
        code: "custom",
        path: ["grounding"],
        message: `Closed-book violation: unsupported terms found (${forbiddenTerms.join(", ")}).`,
      } as ZodIssue,
    ]);
  }

  return normalizedResult;
}

export async function generateProcedureCardWithAI(
  input: GenerateProcedureInput,
): Promise<GenerateProcedureResult> {
  const parsedInput = GENERATE_INPUT_SCHEMA.parse(input);
  const source = parsedInput.source ?? parsedInput.topic;

  const completionText = await createOpenAIJsonChatCompletion({
    temperature: 0.2,
    diagnostics: {
      subject: parsedInput.subject,
      level: parsedInput.level,
      kind: "procedure",
      promptLength: source.length,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an expert primary-school pedagogy assistant.",
          "Return JSON only, no markdown and no extra keys.",
          "Language must be French used in Switzerland.",
          "Style must be TDAH/dys-friendly: short sentences, clear wording, low cognitive load.",
          "You must stay strictly inside the provided source knowledge.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "Create exactly one Procedure card package with three keys: procedureCard, structured, exercises.",
          `subject: ${parsedInput.subject}`,
          `level: ${parsedInput.level}`,
          `topic: ${parsedInput.topic}`,
          "Constraints:",
          "- procedureCard.type = 'procedure'",
          "- procedureCard.stepsHtml must be explicit and sequential",
          "- include one clear example and one practical tip",
          "- include common mistakes in simple language when relevant",
          "- structured.jeRetiens.items: 3 to 6 short bullet lines",
          "- structured.jeVois.examples: 2 to 4 examples",
          "- optional structured.visualAids: 0 to 2 objects",
          "- when provided, visualAids.kind must be one of: step_sequence, column_operation, term_result_map, worked_example, marked_shape, compare_table, number_line, classification_grid, vocab_cards, conjugation_grid",
          "- visual aids must stay simple, concise, and directly grounded in the source",
          "- exercises.quiz: 2 to 4 MCQ questions",
          "- exercises.miniTest: 2 to 4 short guided tasks",
          "- each quiz answer must match one of choices",
          buildSourceConstraintBlock(source),
        ].join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "procedure_structured_card",
        schema: PROCEDURE_GENERATION_JSON_SCHEMA,
      },
    },
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(normalizeAssistantJson(completionText));
  } catch {
    throw new ProcedureGenerationParseError("OpenAI did not return valid JSON.");
  }

  const validated = PROCEDURE_GENERATION_SCHEMA.safeParse(parsedJson);
  if (validated.success) {
    const normalizedResult: GenerateProcedureResult = {
      procedureCard: sanitizeProcedureCard({
        ...validated.data.procedureCard,
        subject: parsedInput.subject,
        level: parsedInput.level,
      }),
      structured: sanitizeStructuredContent(validated.data.structured as StructuredRevisionContent),
      exercises: sanitizeExercisesPayload(validated.data.exercises),
    };

    const forbiddenTerms = findForbiddenTermsOutsideSource(collectProcedureOutputText(normalizedResult), source);
    if (forbiddenTerms.length > 0) {
      throw new ProcedureGenerationValidationError([
        {
          code: "custom",
          path: ["grounding"],
          message: `Closed-book violation: unsupported terms found (${forbiddenTerms.join(", ")}).`,
        } as ZodIssue,
      ]);
    }

    return normalizedResult;
  }

  console.warn("[revisions] procedure_generation_strict_validation_failed", {
    issues: validated.error.issues.slice(0, 5).map((issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
    })),
  });

  const coercedPayload = coerceProcedureGenerationPayload(parsedJson, {
    subject: parsedInput.subject,
    level: parsedInput.level,
    topic: parsedInput.topic,
  });
  const coercedValidated = PROCEDURE_GENERATION_SCHEMA.safeParse(coercedPayload);
  if (!coercedValidated.success) {
    throw new ProcedureGenerationValidationError(coercedValidated.error.issues);
  }

  const normalizedResult: GenerateProcedureResult = {
    procedureCard: sanitizeProcedureCard(coercedValidated.data.procedureCard),
    structured: sanitizeStructuredContent(coercedValidated.data.structured as StructuredRevisionContent),
    exercises: sanitizeExercisesPayload(coercedValidated.data.exercises),
  };

  const forbiddenTerms = findForbiddenTermsOutsideSource(collectProcedureOutputText(normalizedResult), source);
  if (forbiddenTerms.length > 0) {
    throw new ProcedureGenerationValidationError([
      {
        code: "custom",
        path: ["grounding"],
        message: `Closed-book violation: unsupported terms found (${forbiddenTerms.join(", ")}).`,
      } as ZodIssue,
    ]);
  }

  return normalizedResult;
}

export function mapConceptCardToStoredRevisionDraftInput(input: {
  conceptCard: ConceptCard;
  topic: string;
  structured?: StructuredRevisionContent;
  exercises?: ExercisesPayload;
}): CreateRevisionCardInput {
  const topic = input.topic.replace(/\s+/g, " ").trim();
  const conceptCard = sanitizeConceptCard(input.conceptCard);
  const structured = input.structured
    ? sanitizeStructuredContent(input.structured)
    : deriveStructuredFromConceptCard(conceptCard);
  const exercises = input.exercises
    ? sanitizeExercisesPayload(input.exercises)
    : {
        quiz: conceptCard.quiz,
        miniTest: conceptCard.exercises,
      };

  const summary =
    toPlainLine(structured.definition) || conceptCard.blocks.jeRetiens || conceptCard.goal;
  const examples = (() => {
    const fromStructured = extractExamplesFromStructured(structured);
    if (fromStructured.length > 0) {
      return fromStructured;
    }

    if (conceptCard.blocks.examples.length > 0) {
      return conceptCard.blocks.examples;
    }

    return [stripHtmlToText(conceptCard.blocks.jeVoisHtml)].filter((value) => value.length > 0);
  })();
  const steps = exercises.miniTest.length > 0 ? exercises.miniTest : conceptCard.exercises;
  const monTrucBullets = toPlainLines(structured.monTruc?.bullets);
  const tips = normalizeList([...monTrucBullets, `Objectif: ${conceptCard.goal}`]);

  return {
    title: conceptCard.title,
    subject: conceptCard.subject,
    level: conceptCard.level,
    status: "draft",
    tags: topic ? [topic] : [],
    content: {
      kind: "concept",
      summary: summary || null,
      steps,
      examples,
      quiz: mapDomainQuizToStoredChoicesQuiz(exercises.quiz),
      tips,
      concept: {
        goal: conceptCard.goal,
        blocks: conceptCard.blocks,
        exercises: steps,
        quiz: exercises.quiz,
        audioScript: conceptCard.audioScript,
      },
      structured,
      generatedExercises: exercises,
    },
  };
}

export function mapProcedureCardToStoredRevisionDraftInput(input: {
  procedureCard: ProcedureCard;
  topic: string;
  structured?: StructuredRevisionContent;
  exercises?: ExercisesPayload;
}): CreateRevisionCardInput {
  const topic = input.topic.replace(/\s+/g, " ").trim();
  const procedureCard = sanitizeProcedureCard(input.procedureCard);
  const structured = input.structured
    ? sanitizeStructuredContent(input.structured)
    : deriveStructuredFromProcedureCard(procedureCard);
  const exercises = input.exercises
    ? sanitizeExercisesPayload(input.exercises)
    : {
        quiz: procedureCard.quiz,
        miniTest: procedureCard.exercises.map((exercise) => exercise.instruction),
      };

  const summary = toPlainLine(structured.definition) || procedureCard.goal;
  const examplesFromStructured = extractExamplesFromStructured(structured);
  const exampleText = stripHtmlToText(procedureCard.exampleHtml);
  const examples =
    examplesFromStructured.length > 0
      ? examplesFromStructured
      : exampleText
        ? [exampleText]
        : [];

  const steps = exercises.miniTest.length
    ? exercises.miniTest
    : procedureCard.stepsHtml.map((step) => stripHtmlToText(step)).filter((step) => step.length > 0);
  const monTrucBullets = toPlainLines(structured.monTruc?.bullets);
  const tips = normalizeList([...monTrucBullets, procedureCard.monTruc, `Objectif: ${procedureCard.goal}`]);

  return {
    title: procedureCard.title,
    subject: procedureCard.subject,
    level: procedureCard.level,
    status: "draft",
    tags: topic ? [topic] : [],
    content: {
      kind: "procedure",
      summary: summary || null,
      steps,
      examples,
      quiz: mapDomainQuizToStoredChoicesQuiz(exercises.quiz),
      tips,
      procedure: {
        goal: procedureCard.goal,
        stepsHtml: procedureCard.stepsHtml,
        exampleHtml: procedureCard.exampleHtml,
        monTruc: procedureCard.monTruc,
        exercises: procedureCard.exercises,
        quiz: exercises.quiz,
        audioScript: procedureCard.audioScript,
      },
      structured,
      generatedExercises: exercises,
    },
  };
}

export async function generateExtraExercisesForCard(cardId: string): Promise<ExercisesPayload> {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) {
    throw new ExtraExercisesGenerationError("Missing card id.");
  }

  const card = await getRevisionCardById(normalizedCardId);
  if (!card) {
    throw new ExtraExercisesGenerationError("Revision card not found.");
  }

  const structured = mapStoredCardToStructuredRevisionContent(card);
  if (!structured) {
    throw new ExtraExercisesGenerationError("Structured content is required to generate exercises.");
  }

  const fallbackPayload = buildFallbackExtraExercisesFromCard(card, structured);

  let completionText: string;
  try {
    completionText = await createOpenAIJsonChatCompletion({
      temperature: 0.2,
      diagnostics: {
        subject: card.subject,
        level: card.level,
        kind: card.content.kind,
        promptLength: JSON.stringify(structured).length,
      },
      messages: [
        {
          role: "system",
          content: [
            "You are an expert primary-school pedagogy assistant.",
            "Return JSON only, no markdown.",
            "You must stay strictly inside the provided structured content.",
            "Do not invent any rule or concept beyond the structured content.",
            "Language must be French (Switzerland), TDAH/dys-friendly.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            "Generate fresh extra exercises from this structured revision card.",
            "Output JSON with keys: quiz, miniTest.",
            "quiz: 2 to 4 multiple-choice questions.",
            "miniTest: 2 to 4 short tasks.",
            "Each answer must match one choice exactly.",
            "STRUCTURED CONTENT:",
            JSON.stringify(structured),
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extra_exercises_payload",
          schema: EXTRA_EXERCISES_JSON_SCHEMA,
        },
      },
    });
  } catch (error) {
    console.warn("[revisions] extra_exercises_generation_http_failed_using_fallback", {
      cardId: card.id,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return fallbackPayload;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(normalizeAssistantJson(completionText));
  } catch {
    console.warn("[revisions] extra_exercises_generation_parse_failed_using_fallback", {
      cardId: card.id,
    });
    return fallbackPayload;
  }

  const validated = EXERCISES_PAYLOAD_SCHEMA.safeParse(parsedJson);
  if (validated.success) {
    return sanitizeExercisesPayload(validated.data);
  }

  console.warn("[revisions] extra_exercises_generation_strict_validation_failed", {
    cardId: card.id,
    issues: validated.error.issues.slice(0, 5).map((issue) => ({
      path: formatIssuePath(issue.path),
      message: issue.message,
    })),
  });

  const coercedPayload = coerceExercisesPayloadFromUnknown(parsedJson);
  const coercedValidated = EXERCISES_PAYLOAD_SCHEMA.safeParse(coercedPayload);
  if (coercedValidated.success) {
    return sanitizeExercisesPayload(coercedValidated.data);
  }

  console.warn("[revisions] extra_exercises_generation_coercion_failed_using_fallback", {
    cardId: card.id,
  });
  return fallbackPayload;
}
