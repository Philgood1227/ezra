import { z } from "zod";
import { CONJUGATION_TIME_KEYS } from "@/lib/conjugation/types";

export const conjugationTimeKeySchema = z.enum(CONJUGATION_TIME_KEYS);

export const conjugationExerciseStatusSchema = z.enum(["draft", "published"]);
export const conjugationExerciseTypeSchema = z.enum([
  "qcm",
  "fill_blank",
  "match",
  "transform",
]);

const SHORT_TEXT_MAX_LENGTH = 500;

function shortTextSchema(minLength: number): z.ZodType<string> {
  return z
    .string()
    .max(SHORT_TEXT_MAX_LENGTH)
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= minLength, {
      message: `Minimum ${minLength} caracteres.`,
    });
}

const richTextSchema = z.string().max(40_000);

export const conjugationSheetBlocksSchema = z.object({
  aQuoiCaSertHtml: richTextSchema,
  marquesDuTempsHtml: richTextSchema,
  exempleConjugaisonCompleteHtml: richTextSchema,
  verbesAuxiliairesHtml: richTextSchema,
  trucsAstucesHtml: richTextSchema,
});

export const conjugationQcmQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  prompt: shortTextSchema(3),
  choices: z
    .array(shortTextSchema(1))
    .min(3)
    .max(6)
    .transform((values) => values.filter(Boolean)),
  answer: shortTextSchema(1),
});

export const conjugationFillBlankQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  prompt: shortTextSchema(3),
  answer: shortTextSchema(1),
});

export const conjugationMatchPairSchema = z.object({
  id: z.string().min(1).max(120),
  left: shortTextSchema(1),
  right: shortTextSchema(1),
});

export const conjugationMatchQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  instruction: shortTextSchema(3),
  pairs: z.array(conjugationMatchPairSchema).min(2).max(12),
});

export const conjugationTransformQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  prompt: shortTextSchema(3),
  instruction: shortTextSchema(3),
  answer: shortTextSchema(1),
});

export const conjugationExerciseContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("qcm"),
    questions: z.array(conjugationQcmQuestionSchema).min(1).max(20),
  }),
  z.object({
    type: z.literal("fill_blank"),
    questions: z.array(conjugationFillBlankQuestionSchema).min(1).max(20),
  }),
  z.object({
    type: z.literal("match"),
    questions: z.array(conjugationMatchQuestionSchema).min(1).max(10),
  }),
  z.object({
    type: z.literal("transform"),
    questions: z.array(conjugationTransformQuestionSchema).min(1).max(20),
  }),
]);

export const conjugationExerciseDraftSchema = z.object({
  title: z
    .string()
    .min(2)
    .max(160)
    .transform((value) => value.replace(/\s+/g, " ").trim()),
  timeKey: conjugationTimeKeySchema,
  status: conjugationExerciseStatusSchema,
  content: conjugationExerciseContentSchema,
});

export const saveConjugationSheetInputSchema = z.object({
  timeKey: conjugationTimeKeySchema,
  blocks: conjugationSheetBlocksSchema,
});

export const upsertConjugationExerciseInputSchema = z.object({
  id: z.string().uuid().optional(),
  draft: conjugationExerciseDraftSchema,
});

export const setConjugationExercisePublishedInputSchema = z.object({
  exerciseId: z.string().uuid(),
  published: z.boolean(),
});

export const deleteConjugationExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
});

export const duplicateConjugationExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
});

export const generateConjugationExerciseInputSchema = z.object({
  timeKey: conjugationTimeKeySchema,
  type: conjugationExerciseTypeSchema,
  questionCount: z.number().int().min(3).max(12),
});

export const importConjugationExerciseInputSchema = z.object({
  timeKey: conjugationTimeKeySchema,
  type: conjugationExerciseTypeSchema,
  sourceText: z.string().min(10).max(24_000),
  questionCount: z.number().int().min(3).max(12).default(6),
});

export const submitConjugationAttemptInputSchema = z.object({
  exerciseId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      value: z.string().optional(),
      matches: z.record(z.string(), z.string()).optional(),
    }),
  ),
});
