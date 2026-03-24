export type CardType = "concept" | "procedure" | "vocab" | "comprehension";

export interface RevisionQuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: string;
}

export type HighlightTag = "term" | "keyword" | "ending";

export interface RichTextPlainFragment {
  type: "text";
  text: string;
}

export interface RichTextHighlightFragment {
  type: "highlight";
  tag: HighlightTag;
  text: string;
}

export type RichTextFragment = RichTextPlainFragment | RichTextHighlightFragment;
export type RichTextLine = RichTextFragment[];

export interface BulletList {
  title?: string | undefined;
  items: RichTextLine[];
}

export interface StructuredExample {
  label?: string | undefined;
  explanation?: string | undefined;
  text: RichTextLine[];
}

export interface ConjugationPerson {
  pronoun: string;
  stem: string;
  ending: string;
}

export interface ConjugationBlock {
  tense: string;
  verb: string;
  group?: string | undefined;
  persons: ConjugationPerson[];
}

export type VisualAidKind =
  | "step_sequence"
  | "column_operation"
  | "term_result_map"
  | "worked_example"
  | "marked_shape"
  | "compare_table"
  | "number_line"
  | "classification_grid"
  | "vocab_cards"
  | "conjugation_grid";

interface VisualAidBase {
  id: string;
  kind: VisualAidKind;
  title: string;
  note?: string | undefined;
}

export interface VisualAidStepSequence extends VisualAidBase {
  kind: "step_sequence";
  steps: Array<{
    label?: string | undefined;
    text: string;
  }>;
}

export interface VisualAidColumnOperation extends VisualAidBase {
  kind: "column_operation";
  operation: "addition" | "subtraction" | "multiplication" | "division";
  placeHeaders: string[];
  top: string;
  bottom: string;
  result?: string | undefined;
  carry?: string[] | undefined;
  hint?: string | undefined;
}

export interface VisualAidTermResultMap extends VisualAidBase {
  kind: "term_result_map";
  expression: string;
  termLabel: string;
  resultLabel: string;
}

export interface VisualAidWorkedExample extends VisualAidBase {
  kind: "worked_example";
  problem: string;
  steps: string[];
  answer: string;
}

export interface VisualAidMarkedShape extends VisualAidBase {
  kind: "marked_shape";
  statement: string;
  items: Array<{
    label: string;
    hasMarker?: boolean | undefined;
  }>;
}

export interface VisualAidCompareTable extends VisualAidBase {
  kind: "compare_table";
  columns: [string, string];
  rows: Array<{
    left: string;
    right: string;
    note?: string | undefined;
  }>;
}

export interface VisualAidNumberLine extends VisualAidBase {
  kind: "number_line";
  start: number;
  end: number;
  marks: number[];
  highlight?: number | undefined;
}

export interface VisualAidClassificationGrid extends VisualAidBase {
  kind: "classification_grid";
  categories: Array<{
    label: string;
    items: string[];
  }>;
}

export interface VisualAidVocabCards extends VisualAidBase {
  kind: "vocab_cards";
  cards: Array<{
    term: string;
    meaning: string;
    example?: string | undefined;
  }>;
}

export interface VisualAidConjugationGrid extends VisualAidBase {
  kind: "conjugation_grid";
  tense: string;
  verb: string;
  rows: ConjugationPerson[];
}

export type VisualAid =
  | VisualAidStepSequence
  | VisualAidColumnOperation
  | VisualAidTermResultMap
  | VisualAidWorkedExample
  | VisualAidMarkedShape
  | VisualAidCompareTable
  | VisualAidNumberLine
  | VisualAidClassificationGrid
  | VisualAidVocabCards
  | VisualAidConjugationGrid;

export interface StructuredRevisionContent {
  definition?: RichTextLine | undefined;
  jeRetiens?: BulletList | undefined;
  monTruc?:
    | {
      bullets: RichTextLine[];
      example?: StructuredExample | undefined;
    }
    | undefined;
  jeVois?:
    | {
      examples: StructuredExample[];
    }
    | undefined;
  conjugation?: ConjugationBlock[] | undefined;
  visualAids?: VisualAid[] | undefined;
}

export interface ExercisesPayload {
  quiz: RevisionQuizQuestion[];
  miniTest: string[];
}

export type RevisionContentSourceType = "manual" | "ai" | "book";

export interface RevisionContentSource {
  sourceType: RevisionContentSourceType;
  bookId?: string;
  bookTitle?: string;
}

export interface ConceptCard {
  type: "concept";
  id: string;
  subject: string;
  level: string;
  title: string;
  goal: string;
  blocks: {
    jeRetiens: string;
    jeVoisHtml: string;
    monTruc: string;
    examples: string[];
  };
  exercises: string[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export interface ProcedureExercise {
  id: string;
  instruction: string;
  supportHtml: string | null;
}

export interface ProcedureCard {
  type: "procedure";
  id: string;
  subject: string;
  level: string;
  title: string;
  goal: string;
  stepsHtml: string[];
  exampleHtml: string;
  monTruc: string;
  exercises: ProcedureExercise[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export interface VocabItem {
  id: string;
  term: string;
  translation: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface VocabCard {
  type: "vocab";
  id: string;
  subject: string;
  level: string;
  title: string;
  goal: string;
  items: VocabItem[];
  activities: string[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export interface ComprehensionQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: string;
}

export interface ComprehensionCard {
  type: "comprehension";
  id: string;
  subject: string;
  level: string;
  title: string;
  goal: string;
  text: string;
  textTranslation: string | null;
  questions: ComprehensionQuestion[];
  openQuestions: string[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export type RevisionCard = ConceptCard | ProcedureCard | VocabCard | ComprehensionCard;

export interface ConceptContentPayload {
  goal?: string | null;
  blocks: ConceptCard["blocks"];
  exercises: string[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export interface ProcedureContentPayload {
  goal?: string | null;
  stepsHtml: string[];
  exampleHtml: string;
  monTruc: string;
  exercises: ProcedureExercise[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export interface VocabContentPayload {
  goal?: string | null;
  items: VocabItem[];
  activities: string[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export interface ComprehensionContentPayload {
  goal?: string | null;
  text: string;
  textTranslation: string | null;
  questions: ComprehensionQuestion[];
  openQuestions: string[];
  quiz: RevisionQuizQuestion[];
  audioScript: string | null;
}

export type RevisionStatus = "unseen" | "in_progress" | "mastered";

export interface UserRevisionState {
  userId: string;
  cardId: string;
  status: RevisionStatus;
  stars: number;
  lastReviewedAt: string;
  quizScore?: {
    lastScore: number;
    attempts: number;
  };
}

// Legacy storage and API model kept for current runtime behavior.
export type RevisionCardStatus = "draft" | "published";
export type RevisionCardKind = "concept" | "procedure" | "vocab" | "comprehension" | "generic";

export type RevisionProgressStatus = "not_started" | "in_progress" | "completed";

export interface RevisionQuizChoiceQuestion {
  kind: "choices";
  prompt: string;
  choices: string[];
  answerIndex: number | null;
  explanation: string | null;
}

export interface RevisionQuizFreeQuestion {
  kind: "free";
  prompt: string;
  answer: string | null;
  explanation: string | null;
}

export type RevisionContentQuizQuestion = RevisionQuizChoiceQuestion | RevisionQuizFreeQuestion;

export interface RevisionCardContent {
  kind: RevisionCardKind;
  summary: string | null;
  steps: string[];
  examples: string[];
  quiz: RevisionContentQuizQuestion[];
  tips: string[];
  concept?: ConceptContentPayload;
  procedure?: ProcedureContentPayload;
  vocab?: VocabContentPayload;
  comprehension?: ComprehensionContentPayload;
  source?: RevisionContentSource;
  structured?: StructuredRevisionContent;
  generatedExercises?: ExercisesPayload | null;
}

export interface StoredRevisionCard {
  id: string;
  familyId: string;
  createdByProfileId: string | null;
  title: string;
  subject: string;
  level: string | null;
  tags: string[];
  content: RevisionCardContent;
  status: RevisionCardStatus;
  createdAt: string;
  updatedAt: string;
}

export type StoredRevisionCardViewModel = StoredRevisionCard & {
  type?: CardType;
  goal?: string;
  blocks?: ConceptCard["blocks"];
  structured?: StructuredRevisionContent;
  stepsHtml?: string[];
  exampleHtml?: string;
  monTruc?: string;
  procedureExercises?: ProcedureExercise[];
  vocabItems?: VocabItem[];
  vocabActivities?: string[];
  comprehensionText?: string;
  comprehensionTextTranslation?: string | null;
  comprehensionQuestions?: ComprehensionQuestion[];
  comprehensionOpenQuestions?: string[];
  exercises?: string[];
  quiz?: RevisionQuizQuestion[];
  audioScript?: string | null;
};

export type RevisionLibraryStatusFilter = RevisionCardStatus | "all";
export type RevisionLibraryKindFilter = RevisionCardKind | "all";

export interface RevisionLibraryFilters {
  status?: RevisionLibraryStatusFilter;
  kind?: RevisionLibraryKindFilter;
  subject?: string | null;
  search?: string | null;
  limit?: number;
}

export interface RevisionCardLibraryItem {
  id: string;
  title: string;
  subject: string;
  level: string | null;
  tags: string[];
  kind: RevisionCardKind;
  status: RevisionCardStatus;
  sourceType?: RevisionContentSourceType;
  sourceLabel?: string | null;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionProgress {
  id: string;
  familyId: string;
  childProfileId: string;
  revisionCardId: string;
  lastSeenAt: string | null;
  completedCount: number;
  successStreak: number;
  confidenceScore: number | null;
  status: RevisionProgressStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRevisionCardInput {
  title: string;
  subject: string;
  level?: string | null;
  tags?: string[];
  content?: RevisionCardContent;
  status?: RevisionCardStatus;
}

export interface UpdateRevisionCardPatch {
  title?: string;
  subject?: string;
  level?: string | null;
  tags?: string[];
  content?: RevisionCardContent;
  status?: RevisionCardStatus;
}

export interface UpsertRevisionProgressInput {
  revisionCardId: string;
  lastSeenAt?: string | null;
  completedCount?: number;
  successStreak?: number;
  confidenceScore?: number | null;
  status?: RevisionProgressStatus;
}

export interface RevisionMutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
