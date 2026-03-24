"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addConjugationAttemptForCurrentChild,
  deleteConjugationExerciseForCurrentFamily,
  duplicateConjugationExerciseForCurrentFamily,
  getConjugationExerciseForCurrentChild,
  saveConjugationSheetForCurrentFamily,
  setConjugationExerciseStatusForCurrentFamily,
  upsertConjugationExerciseForCurrentFamily,
} from "@/lib/api/conjugation";
import {
  type ConjugationAttemptAnswer,
  type ConjugationExerciseContent,
  type ConjugationExerciseDraft,
  type ConjugationExerciseType,
} from "@/lib/conjugation/types";
import {
  conjugationExerciseDraftSchema,
  deleteConjugationExerciseInputSchema,
  duplicateConjugationExerciseInputSchema,
  generateConjugationExerciseInputSchema,
  importConjugationExerciseInputSchema,
  saveConjugationSheetInputSchema,
  setConjugationExercisePublishedInputSchema,
  submitConjugationAttemptInputSchema,
  upsertConjugationExerciseInputSchema,
} from "@/lib/conjugation/validation";
import { type ActionResult } from "@/lib/day-templates/types";
import { OpenAIClientError, createOpenAIJsonChatCompletion } from "@/lib/openai/client";
import { getCurrentProfile } from "@/lib/auth/current-profile";

function revalidateConjugationPaths(): void {
  revalidatePath("/parent-v2/conjugaison");
  revalidatePath("/child/conjugaison");
  revalidatePath("/child/conjugaison/exercises");
}

async function hasParentAccess(): Promise<boolean> {
  const context = await getCurrentProfile();
  return context.role === "parent" && Boolean(context.familyId);
}

function normalizeAssistantJson(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseFirstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

function buildQuestionItemsSchema(type: ConjugationExerciseType): Record<string, unknown> {
  if (type === "qcm") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["id", "prompt", "choices", "answer"],
      properties: {
        id: { type: "string" },
        prompt: { type: "string" },
        choices: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 5,
        },
        answer: { type: "string" },
      },
    };
  }

  if (type === "fill_blank") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["id", "prompt", "answer"],
      properties: {
        id: { type: "string" },
        prompt: { type: "string" },
        answer: { type: "string" },
      },
    };
  }

  if (type === "transform") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["id", "prompt", "instruction", "answer"],
      properties: {
        id: { type: "string" },
        prompt: { type: "string" },
        instruction: { type: "string" },
        answer: { type: "string" },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "instruction", "pairs"],
    properties: {
      id: { type: "string" },
      instruction: { type: "string" },
      pairs: {
        type: "array",
        minItems: 3,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "left", "right"],
          properties: {
            id: { type: "string" },
            left: { type: "string" },
            right: { type: "string" },
          },
        },
      },
    },
  };
}

function buildAIResponseSchema(type: ConjugationExerciseType): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "questions"],
    properties: {
      title: { type: "string" },
      questions: {
        type: "array",
        minItems: 3,
        maxItems: 12,
        items: buildQuestionItemsSchema(type),
      },
    },
  };
}

async function generateExerciseDraftWithAI(input: {
  timeKey: z.infer<typeof generateConjugationExerciseInputSchema>["timeKey"];
  type: ConjugationExerciseType;
  questionCount: number;
  sourceText?: string;
}): Promise<ConjugationExerciseDraft> {
  const targetSchema = buildAIResponseSchema(input.type);
  const userPrompt = input.sourceText
    ? [
        "Analyse cet exercice source puis cree un nouvel exercice du meme type.",
        `Temps cible: ${input.timeKey}.`,
        `Type d'exercice: ${input.type}.`,
        `Nombre de questions: ${input.questionCount}.`,
        "Niveau: enfant de 10 ans, 6P HarmoS, Suisse romande (Geneve).",
        "Retourne uniquement du JSON avec: title, questions.",
        "Exercice source:",
        input.sourceText,
      ].join("\n")
    : [
        "Genere un exercice de conjugaison.",
        `Temps cible: ${input.timeKey}.`,
        `Type d'exercice: ${input.type}.`,
        `Nombre de questions: ${input.questionCount}.`,
        "Niveau: enfant de 10 ans, 6P HarmoS, Suisse romande (Geneve).",
        "Retourne uniquement du JSON avec: title, questions.",
      ].join("\n");

  const completionText = await createOpenAIJsonChatCompletion({
    temperature: 0.2,
    diagnostics: {
      subject: "Francais",
      level: "6P HarmoS",
      kind: "conjugaison",
      promptLength: userPrompt.length,
    },
    messages: [
      {
        role: "system",
        content: [
          "Tu es un assistant pedagogique expert en conjugaison francaise.",
          "Langue: francais simple, clair, adapte a un enfant de 10 ans.",
          "Retourne uniquement du JSON valide, sans markdown.",
        ].join(" "),
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "conjugation_exercise_draft",
        schema: targetSchema,
      },
    },
  });

  const parsedJson = JSON.parse(normalizeAssistantJson(completionText)) as {
    title?: string;
    questions?: unknown[];
  };

  const draftCandidate = {
    title: parsedJson.title ?? "Exercice de conjugaison",
    timeKey: input.timeKey,
    status: "draft" as const,
    content: {
      type: input.type,
      questions: Array.isArray(parsedJson.questions) ? parsedJson.questions : [],
    },
  };

  const parsedDraft = conjugationExerciseDraftSchema.parse(draftCandidate);
  return parsedDraft as ConjugationExerciseDraft;
}

function evaluateSubmission(input: {
  content: ConjugationExerciseContent;
  answers: z.infer<typeof submitConjugationAttemptInputSchema>["answers"];
}): {
  score: number;
  totalQuestions: number;
  gradedAnswers: ConjugationAttemptAnswer[];
} {
  const answerByQuestionId = new Map(
    input.answers.map((entry) => [
      entry.questionId,
      {
        value: entry.value ?? "",
        matches: entry.matches ?? {},
      },
    ]),
  );

  const gradedAnswers: ConjugationAttemptAnswer[] = [];

  if (input.content.type === "match") {
    input.content.questions.forEach((question) => {
      const response = answerByQuestionId.get(question.id);
      const matches = response?.matches ?? {};
      question.pairs.forEach((pair) => {
        const userAnswer = matches[pair.left] ?? "";
        const correctAnswer = pair.right;
        const isCorrect = normalizeText(userAnswer) === normalizeText(correctAnswer);
        gradedAnswers.push({
          questionId: `${question.id}:${pair.id}`,
          prompt: `${question.instruction} (${pair.left})`,
          userAnswer,
          correctAnswer,
          isCorrect,
        });
      });
    });
  } else if (input.content.type === "qcm") {
    input.content.questions.forEach((question) => {
      const userAnswer = answerByQuestionId.get(question.id)?.value ?? "";
      const correctAnswer = question.answer;
      const isCorrect = normalizeText(userAnswer) === normalizeText(correctAnswer);
      gradedAnswers.push({
        questionId: question.id,
        prompt: question.prompt,
        userAnswer,
        correctAnswer,
        isCorrect,
      });
    });
  } else if (input.content.type === "fill_blank") {
    input.content.questions.forEach((question) => {
      const userAnswer = answerByQuestionId.get(question.id)?.value ?? "";
      const correctAnswer = question.answer;
      const isCorrect = normalizeText(userAnswer) === normalizeText(correctAnswer);
      gradedAnswers.push({
        questionId: question.id,
        prompt: question.prompt,
        userAnswer,
        correctAnswer,
        isCorrect,
      });
    });
  } else {
    input.content.questions.forEach((question) => {
      const userAnswer = answerByQuestionId.get(question.id)?.value ?? "";
      const correctAnswer = question.answer;
      const isCorrect = normalizeText(userAnswer) === normalizeText(correctAnswer);
      gradedAnswers.push({
        questionId: question.id,
        prompt: `${question.instruction} ${question.prompt}`.trim(),
        userAnswer,
        correctAnswer,
        isCorrect,
      });
    });
  }

  const totalQuestions = gradedAnswers.length;
  const correctCount = gradedAnswers.filter((entry) => entry.isCorrect).length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    score,
    totalQuestions,
    gradedAnswers,
  };
}

export async function saveConjugationSheetAction(
  payload: unknown,
): Promise<ActionResult> {
  const parsed = saveConjugationSheetInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Saisie invalide pour la fiche de conjugaison."),
    };
  }

  const saved = await saveConjugationSheetForCurrentFamily(parsed.data.timeKey, parsed.data.blocks);
  if (!saved) {
    return { success: false, error: "Action reservee au parent." };
  }

  revalidateConjugationPaths();
  return { success: true };
}

export async function upsertConjugationExerciseAction(
  payload: unknown,
): Promise<ActionResult<{ exerciseId: string }>> {
  const parsed = upsertConjugationExerciseInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Saisie invalide pour l'exercice."),
    };
  }

  const draft = parsed.data.draft as ConjugationExerciseDraft;
  const saved = await upsertConjugationExerciseForCurrentFamily(draft, parsed.data.id);
  if (!saved) {
    return { success: false, error: "Action reservee au parent." };
  }

  revalidateConjugationPaths();
  return { success: true, data: { exerciseId: saved.id } };
}

export async function deleteConjugationExerciseAction(
  payload: unknown,
): Promise<ActionResult> {
  const parsed = deleteConjugationExerciseInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Exercice invalide."),
    };
  }

  const deleted = await deleteConjugationExerciseForCurrentFamily(parsed.data.exerciseId);
  if (!deleted) {
    return { success: false, error: "Exercice introuvable." };
  }

  revalidateConjugationPaths();
  return { success: true };
}

export async function duplicateConjugationExerciseAction(
  payload: unknown,
): Promise<ActionResult<{ exerciseId: string }>> {
  const parsed = duplicateConjugationExerciseInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Exercice invalide."),
    };
  }

  const duplicated = await duplicateConjugationExerciseForCurrentFamily(parsed.data.exerciseId);
  if (!duplicated) {
    return { success: false, error: "Exercice introuvable." };
  }

  revalidateConjugationPaths();
  return { success: true, data: { exerciseId: duplicated.id } };
}

export async function setConjugationExercisePublishedAction(
  payload: unknown,
): Promise<ActionResult> {
  const parsed = setConjugationExercisePublishedInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Saisie invalide."),
    };
  }

  const status = parsed.data.published ? "published" : "draft";
  const updated = await setConjugationExerciseStatusForCurrentFamily(parsed.data.exerciseId, status);
  if (!updated) {
    return { success: false, error: "Exercice introuvable." };
  }

  revalidateConjugationPaths();
  return { success: true };
}

export async function generateConjugationExerciseWithAIAction(
  payload: unknown,
): Promise<ActionResult<{ draft: ConjugationExerciseDraft }>> {
  if (!(await hasParentAccess())) {
    return {
      success: false,
      error: "Action reservee au parent.",
    };
  }

  const parsed = generateConjugationExerciseInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Parametres de generation invalides."),
    };
  }

  try {
    const draft = await generateExerciseDraftWithAI(parsed.data);
    return {
      success: true,
      data: { draft },
    };
  } catch (error) {
    if (error instanceof OpenAIClientError) {
      return {
        success: false,
        error: error.safeMessageFr,
      };
    }
    return {
      success: false,
      error: "Impossible de generer l'exercice pour le moment.",
    };
  }
}

export async function importConjugationExerciseWithAIAction(
  payload: unknown,
): Promise<ActionResult<{ draft: ConjugationExerciseDraft }>> {
  if (!(await hasParentAccess())) {
    return {
      success: false,
      error: "Action reservee au parent.",
    };
  }

  const parsed = importConjugationExerciseInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Parametres d'import invalides."),
    };
  }

  try {
    const draft = await generateExerciseDraftWithAI({
      timeKey: parsed.data.timeKey,
      type: parsed.data.type,
      questionCount: parsed.data.questionCount,
      sourceText: parsed.data.sourceText,
    });
    return {
      success: true,
      data: { draft },
    };
  } catch (error) {
    if (error instanceof OpenAIClientError) {
      return {
        success: false,
        error: error.safeMessageFr,
      };
    }
    return {
      success: false,
      error: "Impossible d'importer cet exercice avec l'IA.",
    };
  }
}

export async function submitConjugationExerciseAttemptAction(
  payload: unknown,
): Promise<
  ActionResult<{
    attemptId: string;
    score: number;
    totalQuestions: number;
    answers: ConjugationAttemptAnswer[];
  }>
> {
  const parsed = submitConjugationAttemptInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parseFirstIssue(parsed.error, "Reponses invalides."),
    };
  }

  const target = await getConjugationExerciseForCurrentChild(parsed.data.exerciseId);
  if (!target) {
    return { success: false, error: "Exercice introuvable." };
  }

  const evaluated = evaluateSubmission({
    content: target.exercise.content,
    answers: parsed.data.answers,
  });

  const savedAttempt = await addConjugationAttemptForCurrentChild({
    exerciseId: target.exercise.id,
    timeKey: target.exercise.timeKey,
    exerciseType: target.exercise.content.type,
    score: evaluated.score,
    totalQuestions: evaluated.totalQuestions,
    answers: evaluated.gradedAnswers,
  });

  if (!savedAttempt) {
    return { success: false, error: "Impossible d'enregistrer le resultat." };
  }

  revalidatePath("/parent-v2/conjugaison");
  revalidatePath("/child/conjugaison");
  revalidatePath(`/child/conjugaison/exercises/${target.exercise.id}`);
  revalidatePath("/child/conjugaison/exercises");

  return {
    success: true,
    data: {
      attemptId: savedAttempt.id,
      score: savedAttempt.score,
      totalQuestions: savedAttempt.totalQuestions,
      answers: savedAttempt.answers,
    },
  };
}
