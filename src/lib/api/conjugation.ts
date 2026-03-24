import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getPrimaryChildProfileForCurrentFamily } from "@/lib/api/children";
import {
  addDemoConjugationAttempt,
  deleteDemoConjugationExercise,
  duplicateDemoConjugationExercise,
  getDemoConjugationExerciseById,
  getDemoConjugationSheets,
  listDemoChildConjugationExercises,
  listDemoConjugationAttempts,
  listDemoConjugationExercises,
  setDemoConjugationExerciseStatus,
  upsertDemoConjugationExercise,
  upsertDemoConjugationSheet,
} from "@/lib/demo/conjugation-store";
import {
  CONJUGATION_TIME_DEFINITIONS,
  CONJUGATION_TIME_KEYS,
  type ConjugationAttemptAnswer,
  type ConjugationChildExerciseListItem,
  type ConjugationChildHomeData,
  type ConjugationExerciseAttemptRecord,
  type ConjugationExerciseDraft,
  type ConjugationExerciseParentStats,
  type ConjugationExerciseRecord,
  type ConjugationExerciseStatus,
  type ConjugationParentPageData,
  type ConjugationSheetBlocks,
  type ConjugationSheetRecord,
  type ConjugationTimeKey,
} from "@/lib/conjugation/types";

interface FamilyContext {
  familyId: string;
  role: "parent" | "child" | "viewer";
  profileId: string;
}

function emptyPendingByTime(): Record<ConjugationTimeKey, number> {
  return {
    "present-indicatif": 0,
    "imparfait-indicatif": 0,
    "passe-compose": 0,
    "futur-simple": 0,
    auxiliaires: 0,
  };
}

async function getFamilyContext(): Promise<FamilyContext | null> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id) {
    return null;
  }

  if (context.role !== "parent" && context.role !== "child" && context.role !== "viewer") {
    return null;
  }

  return {
    familyId: context.familyId,
    role: context.role,
    profileId: context.profile.id,
  };
}

function buildStatsByExerciseId(
  exercises: ConjugationExerciseRecord[],
  attempts: ConjugationExerciseAttemptRecord[],
): Record<string, ConjugationExerciseParentStats> {
  const statsByExerciseId = new Map<string, ConjugationExerciseParentStats>();

  exercises.forEach((exercise) => {
    statsByExerciseId.set(exercise.id, {
      exerciseId: exercise.id,
      attemptsCount: 0,
      latestAttempt: null,
      averageScore: null,
    });
  });

  const attemptsByExerciseId = new Map<string, ConjugationExerciseAttemptRecord[]>();
  attempts.forEach((attempt) => {
    const current = attemptsByExerciseId.get(attempt.exerciseId) ?? [];
    current.push(attempt);
    attemptsByExerciseId.set(attempt.exerciseId, current);
  });

  attemptsByExerciseId.forEach((exerciseAttempts, exerciseId) => {
    const sortedAttempts = [...exerciseAttempts].sort((left, right) =>
      right.submittedAt.localeCompare(left.submittedAt),
    );
    const totalScore = sortedAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const averageScore =
      sortedAttempts.length > 0 ? Math.round(totalScore / sortedAttempts.length) : null;

    statsByExerciseId.set(exerciseId, {
      exerciseId,
      attemptsCount: sortedAttempts.length,
      latestAttempt: sortedAttempts[0] ?? null,
      averageScore,
    });
  });

  return Object.fromEntries(statsByExerciseId.entries());
}

export async function getConjugationParentPageData(): Promise<ConjugationParentPageData> {
  const context = await getFamilyContext();
  if (!context) {
    return {
      timeDefinitions: CONJUGATION_TIME_DEFINITIONS,
      sheetsByTime: getDemoConjugationSheets("dev-family-id"),
      exercises: [],
      statsByExerciseId: {},
      defaultChildProfileId: null,
    };
  }

  const sheetsByTime = getDemoConjugationSheets(context.familyId);
  const exercises = listDemoConjugationExercises(context.familyId);
  const primaryChild = await getPrimaryChildProfileForCurrentFamily();
  const attempts = primaryChild
    ? listDemoConjugationAttempts(context.familyId, { childProfileId: primaryChild.id })
    : [];

  return {
    timeDefinitions: CONJUGATION_TIME_DEFINITIONS,
    sheetsByTime,
    exercises,
    statsByExerciseId: buildStatsByExerciseId(exercises, attempts),
    defaultChildProfileId: primaryChild?.id ?? null,
  };
}

export async function getConjugationChildHomeDataForCurrentChild(): Promise<ConjugationChildHomeData> {
  const context = await getFamilyContext();
  if (!context || context.role !== "child") {
    return {
      timeDefinitions: CONJUGATION_TIME_DEFINITIONS,
      pendingExerciseCount: 0,
      byTimePending: emptyPendingByTime(),
    };
  }

  const list = listDemoChildConjugationExercises(context.familyId, context.profileId);
  const byTimePending = emptyPendingByTime();
  list.forEach((item) => {
    if (!item.isCompleted) {
      byTimePending[item.exercise.timeKey] += 1;
    }
  });

  return {
    timeDefinitions: CONJUGATION_TIME_DEFINITIONS,
    pendingExerciseCount: Object.values(byTimePending).reduce((sum, value) => sum + value, 0),
    byTimePending,
  };
}

export async function getConjugationSheetForCurrentFamily(
  timeKey: ConjugationTimeKey,
): Promise<ConjugationSheetRecord | null> {
  const context = await getFamilyContext();
  if (!context) {
    return null;
  }

  const sheetsByTime = getDemoConjugationSheets(context.familyId);
  return sheetsByTime[timeKey] ?? null;
}

export async function listConjugationExercisesForCurrentChild(
  timeKey?: ConjugationTimeKey,
): Promise<ConjugationChildExerciseListItem[]> {
  const context = await getFamilyContext();
  if (!context || context.role !== "child") {
    return [];
  }

  return listDemoChildConjugationExercises(context.familyId, context.profileId, {
    ...(timeKey ? { timeKey } : {}),
  });
}

export async function getConjugationExerciseForCurrentChild(
  exerciseId: string,
): Promise<ConjugationChildExerciseListItem | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "child") {
    return null;
  }

  const exercise = getDemoConjugationExerciseById(context.familyId, exerciseId);
  if (!exercise || exercise.status !== "published") {
    return null;
  }

  const latestAttempt =
    listDemoConjugationAttempts(context.familyId, {
      childProfileId: context.profileId,
      exerciseId,
    })[0] ?? null;

  return {
    exercise,
    latestAttempt,
    isCompleted: latestAttempt !== null,
  };
}

export async function listConjugationAttemptsForParent(
  exerciseId?: string,
): Promise<ConjugationExerciseAttemptRecord[]> {
  const context = await getFamilyContext();
  if (!context || (context.role !== "parent" && context.role !== "viewer")) {
    return [];
  }

  const primaryChild = await getPrimaryChildProfileForCurrentFamily();
  if (!primaryChild) {
    return [];
  }

  return listDemoConjugationAttempts(context.familyId, {
    childProfileId: primaryChild.id,
    ...(exerciseId ? { exerciseId } : {}),
  });
}

export async function saveConjugationSheetForCurrentFamily(
  timeKey: ConjugationTimeKey,
  blocks: ConjugationSheetBlocks,
): Promise<ConjugationSheetRecord | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return null;
  }

  return upsertDemoConjugationSheet(context.familyId, timeKey, blocks);
}

export async function upsertConjugationExerciseForCurrentFamily(
  draft: ConjugationExerciseDraft,
  exerciseId?: string,
): Promise<ConjugationExerciseRecord | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return null;
  }

  return upsertDemoConjugationExercise(context.familyId, draft, exerciseId);
}

export async function deleteConjugationExerciseForCurrentFamily(
  exerciseId: string,
): Promise<boolean> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return false;
  }

  return deleteDemoConjugationExercise(context.familyId, exerciseId);
}

export async function duplicateConjugationExerciseForCurrentFamily(
  exerciseId: string,
): Promise<ConjugationExerciseRecord | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return null;
  }

  return duplicateDemoConjugationExercise(context.familyId, exerciseId);
}

export async function setConjugationExerciseStatusForCurrentFamily(
  exerciseId: string,
  status: ConjugationExerciseStatus,
): Promise<ConjugationExerciseRecord | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return null;
  }

  return setDemoConjugationExerciseStatus(context.familyId, exerciseId, status);
}

export async function addConjugationAttemptForCurrentChild(input: {
  exerciseId: string;
  timeKey: ConjugationTimeKey;
  exerciseType: ConjugationExerciseRecord["content"]["type"];
  score: number;
  totalQuestions: number;
  answers: ConjugationAttemptAnswer[];
}): Promise<ConjugationExerciseAttemptRecord | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "child") {
    return null;
  }

  return addDemoConjugationAttempt(context.familyId, {
    childProfileId: context.profileId,
    exerciseId: input.exerciseId,
    timeKey: input.timeKey,
    exerciseType: input.exerciseType,
    score: input.score,
    totalQuestions: input.totalQuestions,
    answers: input.answers,
  });
}

export function isConjugationTimeKey(value: string): value is ConjugationTimeKey {
  return (CONJUGATION_TIME_KEYS as readonly string[]).includes(value);
}

