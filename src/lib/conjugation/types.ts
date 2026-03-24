export const CONJUGATION_TIME_KEYS = [
  "present-indicatif",
  "imparfait-indicatif",
  "passe-compose",
  "futur-simple",
  "auxiliaires",
] as const;

export type ConjugationTimeKey = (typeof CONJUGATION_TIME_KEYS)[number];

export interface ConjugationTimeDefinition {
  key: ConjugationTimeKey;
  title: string;
  subtitle: string;
  explanation: string;
}

export const CONJUGATION_TIME_DEFINITIONS: readonly ConjugationTimeDefinition[] = [
  {
    key: "present-indicatif",
    title: "Present de l'indicatif",
    subtitle: "Ce qui se passe maintenant",
    explanation: "Tu racontes une action qui se passe maintenant ou d'habitude.",
  },
  {
    key: "imparfait-indicatif",
    title: "Imparfait de l'indicatif",
    subtitle: "Ce qui se passait avant",
    explanation: "Tu racontes une action habituelle ou en cours dans le passe.",
  },
  {
    key: "passe-compose",
    title: "Passe compose",
    subtitle: "Ce qui s'est passe",
    explanation: "Tu racontes une action terminee dans le passe.",
  },
  {
    key: "futur-simple",
    title: "Futur simple",
    subtitle: "Ce qui se passera plus tard",
    explanation: "Tu racontes une action qui arrivera plus tard.",
  },
  {
    key: "auxiliaires",
    title: "Auxiliaires etre & avoir",
    subtitle: "Les verbes outils",
    explanation: "Ces verbes aident a conjuguer beaucoup d'autres temps.",
  },
];

export interface ConjugationSheetBlocks {
  aQuoiCaSertHtml: string;
  marquesDuTempsHtml: string;
  exempleConjugaisonCompleteHtml: string;
  verbesAuxiliairesHtml: string;
  trucsAstucesHtml: string;
}

export interface ConjugationSheetRecord {
  id: string;
  familyId: string;
  timeKey: ConjugationTimeKey;
  blocks: ConjugationSheetBlocks;
  updatedAt: string;
}

export type ConjugationExerciseType = "qcm" | "fill_blank" | "match" | "transform";
export type ConjugationExerciseStatus = "draft" | "published";

export interface ConjugationQcmQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
}

export interface ConjugationFillBlankQuestion {
  id: string;
  prompt: string;
  answer: string;
}

export interface ConjugationMatchPair {
  id: string;
  left: string;
  right: string;
}

export interface ConjugationMatchQuestion {
  id: string;
  instruction: string;
  pairs: ConjugationMatchPair[];
}

export interface ConjugationTransformQuestion {
  id: string;
  prompt: string;
  instruction: string;
  answer: string;
}

export type ConjugationExerciseContent =
  | {
      type: "qcm";
      questions: ConjugationQcmQuestion[];
    }
  | {
      type: "fill_blank";
      questions: ConjugationFillBlankQuestion[];
    }
  | {
      type: "match";
      questions: ConjugationMatchQuestion[];
    }
  | {
      type: "transform";
      questions: ConjugationTransformQuestion[];
    };

export interface ConjugationExerciseRecord {
  id: string;
  familyId: string;
  timeKey: ConjugationTimeKey;
  title: string;
  status: ConjugationExerciseStatus;
  content: ConjugationExerciseContent;
  createdAt: string;
  updatedAt: string;
}

export interface ConjugationAttemptAnswer {
  questionId: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface ConjugationExerciseAttemptRecord {
  id: string;
  familyId: string;
  childProfileId: string;
  exerciseId: string;
  timeKey: ConjugationTimeKey;
  exerciseType: ConjugationExerciseType;
  score: number;
  totalQuestions: number;
  submittedAt: string;
  answers: ConjugationAttemptAnswer[];
}

export interface ConjugationChildExerciseListItem {
  exercise: ConjugationExerciseRecord;
  latestAttempt: ConjugationExerciseAttemptRecord | null;
  isCompleted: boolean;
}

export interface ConjugationExerciseParentStats {
  exerciseId: string;
  attemptsCount: number;
  latestAttempt: ConjugationExerciseAttemptRecord | null;
  averageScore: number | null;
}

export interface ConjugationParentPageData {
  timeDefinitions: readonly ConjugationTimeDefinition[];
  sheetsByTime: Record<ConjugationTimeKey, ConjugationSheetRecord>;
  exercises: ConjugationExerciseRecord[];
  statsByExerciseId: Record<string, ConjugationExerciseParentStats>;
  defaultChildProfileId: string | null;
}

export interface ConjugationChildHomeData {
  timeDefinitions: readonly ConjugationTimeDefinition[];
  pendingExerciseCount: number;
  byTimePending: Record<ConjugationTimeKey, number>;
}

export interface ConjugationExerciseDraft {
  title: string;
  timeKey: ConjugationTimeKey;
  status: ConjugationExerciseStatus;
  content: ConjugationExerciseContent;
}

export function getConjugationTimeDefinition(
  timeKey: ConjugationTimeKey,
): ConjugationTimeDefinition {
  return (
    CONJUGATION_TIME_DEFINITIONS.find((entry) => entry.key === timeKey) ??
    CONJUGATION_TIME_DEFINITIONS[0]!
  );
}

export function getExerciseQuestionCount(exercise: ConjugationExerciseRecord): number {
  return exercise.content.questions.length;
}
