import type {
  CardType,
  ComprehensionQuestion,
  ProcedureExercise,
  RevisionCardContent,
  RevisionQuizQuestion,
  VocabItem,
} from "@/lib/revisions/types";

export const PARENT_REVISION_SUBJECT_OPTIONS = [
  "Francais",
  "Mathematiques",
  "Allemand",
] as const;

export type ParentRevisionSubject = (typeof PARENT_REVISION_SUBJECT_OPTIONS)[number];

export const PARENT_REVISION_TYPE_OPTIONS = [
  "concept",
  "procedure",
  "vocab",
  "comprehension",
] as const satisfies readonly CardType[];

export const PARENT_REVISION_AI_TYPE_OPTIONS = [
  "concept",
  "procedure",
] as const;

export type ParentRevisionAIType = (typeof PARENT_REVISION_AI_TYPE_OPTIONS)[number];

export interface CreateDraftInput {
  subject: string;
  type: CardType;
  level: string;
  title: string;
}

export function createDefaultRevisionContent(type: CardType): RevisionCardContent {
  switch (type) {
    case "concept":
      return {
        kind: "concept",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
        source: {
          sourceType: "manual",
        },
        structured: {
          definition: [],
          jeRetiens: {
            items: [],
          },
          monTruc: {
            bullets: [],
          },
          jeVois: {
            examples: [],
          },
          conjugation: [],
        },
        generatedExercises: {
          quiz: [],
          miniTest: [],
        },
        concept: {
          goal: null,
          blocks: {
            jeRetiens: "",
            jeVoisHtml: "",
            monTruc: "",
            examples: [],
          },
          exercises: [],
          quiz: [] as RevisionQuizQuestion[],
          audioScript: null,
        },
      };
    case "procedure":
      return {
        kind: "procedure",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
        source: {
          sourceType: "manual",
        },
        structured: {
          definition: [],
          jeRetiens: {
            items: [],
          },
          monTruc: {
            bullets: [],
          },
          jeVois: {
            examples: [],
          },
        },
        generatedExercises: {
          quiz: [],
          miniTest: [],
        },
        procedure: {
          goal: null,
          stepsHtml: [],
          exampleHtml: "",
          monTruc: "",
          exercises: [] as ProcedureExercise[],
          quiz: [],
          audioScript: null,
        },
      };
    case "vocab":
      return {
        kind: "vocab",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
        source: {
          sourceType: "manual",
        },
        structured: {
          definition: [],
          jeRetiens: {
            items: [],
          },
          monTruc: {
            bullets: [],
          },
          jeVois: {
            examples: [],
          },
        },
        generatedExercises: {
          quiz: [],
          miniTest: [],
        },
        vocab: {
          goal: null,
          items: [] as VocabItem[],
          activities: [],
          quiz: [],
          audioScript: null,
        },
      };
    case "comprehension":
      return {
        kind: "comprehension",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
        source: {
          sourceType: "manual",
        },
        structured: {
          definition: [],
          jeRetiens: {
            items: [],
          },
          monTruc: {
            bullets: [],
          },
          jeVois: {
            examples: [],
          },
        },
        generatedExercises: {
          quiz: [],
          miniTest: [],
        },
        comprehension: {
          goal: null,
          text: "",
          textTranslation: null,
          questions: [] as ComprehensionQuestion[],
          openQuestions: [],
          quiz: [],
          audioScript: null,
        },
      };
    default:
      return {
        kind: "generic",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
        source: {
          sourceType: "manual",
        },
      };
  }
}

export type CreateDraftActionResult =
  | { success: true; cardId: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<keyof CreateDraftInput, string>>;
    };
