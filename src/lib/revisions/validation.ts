import { z } from "zod";
import type { RevisionCardContent } from "@/lib/revisions/types";

function normalizeString(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeStringList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    const cleaned = normalizeString(value);
    if (!cleaned) {
      return;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(cleaned);
  });

  return normalized;
}

const normalizedListSchema = z
  .array(z.string().max(300))
  .max(40)
  .default([])
  .transform((values) => normalizeStringList(values));

const richTextPlainFragmentSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().max(500).transform((value) => value.replace(/\s+/g, " ")),
  })
  .strict();

const richTextHighlightFragmentSchema = z
  .object({
    type: z.literal("highlight"),
    tag: z.enum(["term", "keyword", "ending"]),
    text: z.string().max(500).transform((value) => value.replace(/\s+/g, " ")),
  })
  .strict();

const richTextFragmentSchema = z.discriminatedUnion("type", [
  richTextPlainFragmentSchema,
  richTextHighlightFragmentSchema,
]);

const richTextLineSchema = z
  .array(richTextFragmentSchema)
  .max(20)
  .default([])
  .transform((line) =>
    line
      .map((fragment) => ({
        ...fragment,
        text: fragment.text.trim(),
      }))
      .filter((fragment) => fragment.text.length > 0),
  );

const bulletListSchema = z
  .object({
    title: z
      .string()
      .max(200)
      .optional()
      .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
    items: z.array(richTextLineSchema).max(12).default([]),
  })
  .strict();

const structuredExampleSchema = z
  .object({
    label: z
      .string()
      .max(300)
      .optional()
      .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
    explanation: z
      .string()
      .max(500)
      .optional()
      .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
    text: z.array(richTextLineSchema).max(8).default([]),
  })
  .strict();

const conjugationPersonSchema = z
  .object({
    pronoun: z.string().max(60).transform(normalizeString),
    stem: z.string().max(120).transform(normalizeString),
    ending: z.string().max(60).transform(normalizeString),
  })
  .strict();

const conjugationBlockSchema = z
  .object({
    tense: z.string().max(160).transform(normalizeString),
    verb: z.string().max(160).transform(normalizeString),
    group: z
      .string()
      .max(120)
      .optional()
      .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
    persons: z.array(conjugationPersonSchema).max(10).default([]),
  })
  .strict();

const visualAidBaseSchema = z
  .object({
    id: z.string().max(120).transform((value) => normalizeString(value)),
    title: z.string().max(180).transform((value) => normalizeString(value)),
    note: z
      .string()
      .max(400)
      .optional()
      .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
  })
  .strict();

const visualAidStepSequenceSchema = visualAidBaseSchema.extend({
  kind: z.literal("step_sequence"),
  steps: z
    .array(
      z
        .object({
          label: z
            .string()
            .max(80)
            .optional()
            .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
          text: z.string().max(240).transform(normalizeString),
        })
        .strict(),
    )
    .max(12)
    .default([]),
});

const visualAidColumnOperationSchema = visualAidBaseSchema.extend({
  kind: z.literal("column_operation"),
  operation: z.enum(["addition", "subtraction", "multiplication", "division"]),
  placeHeaders: z
    .array(z.string().max(12).transform(normalizeString))
    .max(6)
    .default([]),
  top: z.string().max(120).transform(normalizeString),
  bottom: z.string().max(120).transform(normalizeString),
  result: z
    .string()
    .max(120)
    .optional()
    .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
  carry: z.array(z.string().max(40).transform(normalizeString)).max(6).optional(),
  hint: z
    .string()
    .max(240)
    .optional()
    .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
});

const visualAidTermResultMapSchema = visualAidBaseSchema.extend({
  kind: z.literal("term_result_map"),
  expression: z.string().max(160).transform(normalizeString),
  termLabel: z.string().max(80).transform(normalizeString),
  resultLabel: z.string().max(80).transform(normalizeString),
});

const visualAidWorkedExampleSchema = visualAidBaseSchema.extend({
  kind: z.literal("worked_example"),
  problem: z.string().max(280).transform(normalizeString),
  steps: z.array(z.string().max(240).transform(normalizeString)).max(10).default([]),
  answer: z.string().max(180).transform(normalizeString),
});

const visualAidMarkedShapeSchema = visualAidBaseSchema.extend({
  kind: z.literal("marked_shape"),
  statement: z.string().max(240).transform(normalizeString),
  items: z
    .array(
      z
        .object({
          label: z.string().max(160).transform(normalizeString),
          hasMarker: z.boolean().optional(),
        })
        .strict(),
    )
    .max(12)
    .default([]),
});

const visualAidCompareTableSchema = visualAidBaseSchema.extend({
  kind: z.literal("compare_table"),
  columns: z.tuple([z.string().max(80).transform(normalizeString), z.string().max(80).transform(normalizeString)]),
  rows: z
    .array(
      z
        .object({
          left: z.string().max(240).transform(normalizeString),
          right: z.string().max(240).transform(normalizeString),
          note: z
            .string()
            .max(240)
            .optional()
            .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
        })
        .strict(),
    )
    .max(20)
    .default([]),
});

const visualAidNumberLineSchema = visualAidBaseSchema.extend({
  kind: z.literal("number_line"),
  start: z.number().int().min(-10000).max(10000),
  end: z.number().int().min(-10000).max(10000),
  marks: z.array(z.number().int().min(-10000).max(10000)).max(40).default([]),
  highlight: z.number().int().min(-10000).max(10000).optional(),
});

const visualAidClassificationGridSchema = visualAidBaseSchema.extend({
  kind: z.literal("classification_grid"),
  categories: z
    .array(
      z
        .object({
          label: z.string().max(120).transform(normalizeString),
          items: z.array(z.string().max(200).transform(normalizeString)).max(20).default([]),
        })
        .strict(),
    )
    .max(8)
    .default([]),
});

const visualAidVocabCardsSchema = visualAidBaseSchema.extend({
  kind: z.literal("vocab_cards"),
  cards: z
    .array(
      z
        .object({
          term: z.string().max(120).transform(normalizeString),
          meaning: z.string().max(240).transform(normalizeString),
          example: z
            .string()
            .max(240)
            .optional()
            .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
        })
        .strict(),
    )
    .max(30)
    .default([]),
});

const visualAidConjugationGridSchema = visualAidBaseSchema.extend({
  kind: z.literal("conjugation_grid"),
  tense: z.string().max(120).transform(normalizeString),
  verb: z.string().max(120).transform(normalizeString),
  rows: z.array(conjugationPersonSchema).max(20).default([]),
});

const visualAidSchema = z.discriminatedUnion("kind", [
  visualAidStepSequenceSchema,
  visualAidColumnOperationSchema,
  visualAidTermResultMapSchema,
  visualAidWorkedExampleSchema,
  visualAidMarkedShapeSchema,
  visualAidCompareTableSchema,
  visualAidNumberLineSchema,
  visualAidClassificationGridSchema,
  visualAidVocabCardsSchema,
  visualAidConjugationGridSchema,
]);

const structuredRevisionContentSchema = z
  .object({
    definition: richTextLineSchema.optional(),
    jeRetiens: bulletListSchema.optional(),
    monTruc: z
      .object({
        bullets: z.array(richTextLineSchema).max(8).default([]),
        example: structuredExampleSchema.optional(),
      })
      .strict()
      .optional(),
    jeVois: z
      .object({
        examples: z.array(structuredExampleSchema).max(8).default([]),
      })
      .strict()
      .optional(),
    conjugation: z.array(conjugationBlockSchema).max(8).optional(),
    visualAids: z.array(visualAidSchema).max(24).optional(),
  })
  .strict();

const nullableShortTextSchema = z
  .string()
  .max(5000)
  .optional()
  .nullable()
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }
    const cleaned = normalizeString(value);
    return cleaned || null;
  });

const quizChoiceQuestionSchema = z
  .object({
    kind: z.literal("choices"),
    prompt: z.string().min(2).max(500).transform(normalizeString),
    choices: z.array(z.string().min(1).max(300)).min(2).max(8).transform((values) => normalizeStringList(values)),
    answerIndex: z.number().int().min(0).nullable().optional().default(null),
    explanation: nullableShortTextSchema,
  })
  .superRefine((question, context) => {
    if (question.answerIndex !== null && question.answerIndex >= question.choices.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answerIndex"],
        message: "answerIndex is out of range for choices.",
      });
    }
  });

const quizFreeQuestionSchema = z.object({
  kind: z.literal("free"),
  prompt: z.string().min(2).max(500).transform(normalizeString),
  answer: nullableShortTextSchema,
  explanation: nullableShortTextSchema,
});

export const revisionQuizQuestionSchema = z.discriminatedUnion("kind", [
  quizChoiceQuestionSchema,
  quizFreeQuestionSchema,
]);

const revisionQuizDomainQuestionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(120)
      .optional()
      .transform((value) => normalizeString(value ?? "")),
    question: z.string().min(2).max(500).transform(normalizeString),
    choices: z
      .array(z.string().min(1).max(300))
      .min(2)
      .max(8)
      .transform((values) => normalizeStringList(values)),
    answer: z.string().min(1).max(300).transform(normalizeString),
  })
  .superRefine((question, context) => {
    const hasAnswer = question.choices.some(
      (choice) => choice.toLocaleLowerCase() === question.answer.toLocaleLowerCase(),
    );
    if (!hasAnswer) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "Answer must match one of choices.",
      });
    }
  });

const generatedExercisesSchema = z
  .object({
    quiz: z.array(revisionQuizDomainQuestionSchema).max(40).default([]),
    miniTest: normalizedListSchema,
  })
  .strict();

const revisionContentSourceSchema = z
  .object({
    sourceType: z.enum(["manual", "ai", "book"]),
    bookId: z
      .string()
      .uuid("bookId must be a valid uuid.")
      .optional(),
    bookTitle: z
      .string()
      .max(240)
      .optional()
      .transform((value) => (typeof value === "string" ? normalizeString(value) : value)),
  })
  .strict()
  .superRefine((source, context) => {
    if (source.sourceType === "book" && !source.bookId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookId"],
        message: "bookId is required when sourceType is 'book'.",
      });
    }
  });

export const revisionCardKindSchema = z.enum([
  "concept",
  "procedure",
  "vocab",
  "comprehension",
  "generic",
]);

const conceptPayloadSchema = z
  .object({
    goal: nullableShortTextSchema,
    blocks: z
      .object({
        jeRetiens: z.string().max(4000).transform(normalizeString),
        jeVoisHtml: z.string().max(12000).transform((value) => value.trim()),
        monTruc: z.string().max(1200).transform(normalizeString),
        examples: z.array(z.string().max(300)).max(20).transform((values) => normalizeStringList(values)),
      })
      .strict(),
    exercises: normalizedListSchema,
    quiz: z.array(revisionQuizDomainQuestionSchema).max(30).default([]),
    audioScript: nullableShortTextSchema,
  })
  .strict();

const procedurePayloadSchema = z
  .object({
    goal: nullableShortTextSchema,
    stepsHtml: z.array(z.string().max(12000)).max(30).default([]).transform((values) =>
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    ),
    exampleHtml: z.string().max(12000).transform((value) => value.trim()),
    monTruc: z.string().max(1200).transform(normalizeString),
    exercises: z
      .array(
        z
          .object({
            id: z.string().max(120).optional().transform((value) => normalizeString(value ?? "")),
            instruction: z.string().max(500).transform(normalizeString),
            supportHtml: z
              .string()
              .max(12000)
              .nullable()
              .optional()
              .transform((value) => {
                if (typeof value !== "string") {
                  return null;
                }
                const cleaned = value.trim();
                return cleaned.length > 0 ? cleaned : null;
              }),
          })
          .strict(),
      )
      .max(30)
      .default([]),
    quiz: z.array(revisionQuizDomainQuestionSchema).max(30).default([]),
    audioScript: nullableShortTextSchema,
  })
  .strict();

const vocabPayloadSchema = z
  .object({
    goal: nullableShortTextSchema,
    items: z
      .array(
        z
          .object({
            id: z.string().max(120).optional().transform((value) => normalizeString(value ?? "")),
            term: z.string().max(200).transform(normalizeString),
            translation: z.string().max(200).transform(normalizeString),
            exampleSentence: z.string().max(500).transform(normalizeString),
            exampleTranslation: z.string().max(500).transform(normalizeString),
          })
          .strict(),
      )
      .max(50)
      .default([]),
    activities: normalizedListSchema,
    quiz: z.array(revisionQuizDomainQuestionSchema).max(30).default([]),
    audioScript: nullableShortTextSchema,
  })
  .strict();

const comprehensionPayloadSchema = z
  .object({
    goal: nullableShortTextSchema,
    text: z.string().max(12000).transform((value) => value.replace(/\r\n/g, "\n").trim()),
    textTranslation: z
      .string()
      .max(12000)
      .nullable()
      .optional()
      .transform((value) => {
        if (typeof value !== "string") {
          return null;
        }
        const cleaned = value.replace(/\r\n/g, "\n").trim();
        return cleaned.length > 0 ? cleaned : null;
      }),
    questions: z.array(revisionQuizDomainQuestionSchema).max(30).default([]),
    openQuestions: normalizedListSchema,
    quiz: z.array(revisionQuizDomainQuestionSchema).max(30).default([]),
    audioScript: nullableShortTextSchema,
  })
  .strict();

const revisionCardContentBaseSchema = z.object({
  kind: revisionCardKindSchema.optional(),
  summary: nullableShortTextSchema,
  steps: normalizedListSchema,
  examples: normalizedListSchema,
  quiz: z.array(revisionQuizQuestionSchema).max(30).default([]),
  tips: normalizedListSchema,
  concept: conceptPayloadSchema.optional(),
  procedure: procedurePayloadSchema.optional(),
  vocab: vocabPayloadSchema.optional(),
  comprehension: comprehensionPayloadSchema.optional(),
  source: revisionContentSourceSchema.optional(),
  structured: structuredRevisionContentSchema.optional(),
  generatedExercises: generatedExercisesSchema.nullable().optional(),
}).strict();

export const revisionCardContentSchema = revisionCardContentBaseSchema.transform(
  (content): RevisionCardContent => ({
    kind: content.kind ?? "generic",
    summary: content.summary ?? null,
    steps: content.steps,
    examples: content.examples,
    quiz: content.quiz,
    tips: content.tips,
    ...(content.concept ? { concept: content.concept } : {}),
    ...(content.procedure ? { procedure: content.procedure } : {}),
    ...(content.vocab ? { vocab: content.vocab } : {}),
    ...(content.comprehension ? { comprehension: content.comprehension } : {}),
    ...(content.source
      ? {
          source: {
            sourceType: content.source.sourceType,
            ...(content.source.bookId ? { bookId: content.source.bookId } : {}),
            ...(content.source.bookTitle ? { bookTitle: content.source.bookTitle } : {}),
          },
        }
      : {}),
    ...(content.structured ? { structured: content.structured } : {}),
    ...(content.generatedExercises !== undefined ? { generatedExercises: content.generatedExercises } : {}),
  }),
);

export const revisionCardStatusSchema = z.enum(["draft", "published"]);

export const createRevisionCardInputSchema = z.object({
  title: z.string().min(2).max(160).transform(normalizeString),
  subject: z.string().min(2).max(120).transform(normalizeString),
  level: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const cleaned = normalizeString(value);
      return cleaned || null;
    }),
  tags: normalizedListSchema,
  content: revisionCardContentSchema.default({
    kind: "generic",
    summary: null,
    steps: [],
    examples: [],
    quiz: [],
    tips: [],
  }),
  status: revisionCardStatusSchema.default("draft"),
});

export const updateRevisionCardPatchSchema = z
  .object({
    title: z.string().min(2).max(160).transform(normalizeString).optional(),
    subject: z.string().min(2).max(120).transform(normalizeString).optional(),
    level: z
      .string()
      .max(120)
      .nullable()
      .transform((value) => {
        if (typeof value !== "string") {
          return null;
        }
        const cleaned = normalizeString(value);
        return cleaned || null;
      })
      .optional(),
    tags: normalizedListSchema.optional(),
    content: revisionCardContentSchema.optional(),
    status: revisionCardStatusSchema.optional(),
  })
  .superRefine((payload, context) => {
    if (Object.keys(payload).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided.",
      });
    }
  });

const revisionProgressStatusSchema = z.enum(["not_started", "in_progress", "completed"]);

export const upsertRevisionProgressInputSchema = z.object({
  revisionCardId: z.string().uuid("Invalid revision card id."),
  lastSeenAt: z.string().datetime({ offset: true }).nullable().optional(),
  completedCount: z.number().int().min(0).max(10000).optional(),
  successStreak: z.number().int().min(0).max(10000).optional(),
  confidenceScore: z.number().int().min(0).max(100).nullable().optional(),
  status: revisionProgressStatusSchema.optional(),
});
