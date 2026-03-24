import type { Database } from "@/types/database";
import type {
  CardType,
  ComprehensionCard,
  ComprehensionQuestion,
  ConceptCard,
  HighlightTag,
  VisualAid,
  ProcedureCard,
  ProcedureExercise,
  RichTextLine,
  StructuredExample,
  StructuredRevisionContent,
  UserRevisionState,
  VocabCard,
  VocabItem,
  RevisionQuizQuestion,
  RevisionQuizChoiceQuestion,
  RevisionCardStatus,
  RevisionCardContent,
  StoredRevisionCard,
  StoredRevisionCardViewModel,
} from "@/lib/revisions/types";
import { revisionCardContentSchema } from "@/lib/revisions/validation";

type RevisionCardRow = Database["public"]["Tables"]["revision_cards"]["Row"];
type UserRevisionStateRow = Database["public"]["Tables"]["user_revision_state"]["Row"];

const EMPTY_CONTENT: RevisionCardContent = {
  kind: "generic",
  summary: null,
  steps: [],
  examples: [],
  quiz: [],
  tips: [],
};

function normalizeTags(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];
  value.forEach((tag) => {
    const cleaned = tag.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    tags.push(cleaned);
  });

  return tags;
}

function normalizeCardContent(rawContent: unknown): RevisionCardContent {
  const parsed = revisionCardContentSchema.safeParse(rawContent ?? {});
  if (!parsed.success) {
    return EMPTY_CONTENT;
  }

  return parsed.data;
}

export function mapRevisionCardRow(row: RevisionCardRow): StoredRevisionCard {
  const rawContent = row.content ?? row.content_json;
  const normalizedContent = normalizeCardContent(rawContent);
  const rowType = (row.type ?? normalizedContent.kind) as CardType | "generic";
  const alignedKind = rowType === "generic" ? normalizedContent.kind : rowType;

  return {
    id: row.id,
    familyId: row.family_id,
    createdByProfileId: row.created_by_profile_id,
    title: row.title,
    subject: row.subject,
    level: row.level,
    tags: normalizeTags(row.tags),
    content: {
      ...normalizedContent,
      kind: alignedKind,
      summary: normalizedContent.summary ?? row.goal ?? null,
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserRevisionStateRow(row: UserRevisionStateRow): UserRevisionState {
  const attempts = Math.max(0, row.attempts);
  const lastScore = row.last_quiz_score;
  const base: UserRevisionState = {
    userId: row.user_id,
    cardId: row.card_id,
    status: row.status,
    stars: row.stars,
    lastReviewedAt: row.last_reviewed_at ?? row.updated_at,
  };

  if (lastScore === null && attempts === 0) {
    return base;
  }

  return {
    ...base,
    quizScore: {
      lastScore: lastScore ?? 0,
      attempts,
    },
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function plainTextToRichTextLine(text: string, tag?: HighlightTag): RichTextLine {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  if (tag) {
    return [{ type: "highlight", tag, text: normalized }];
  }

  return [{ type: "text", text: normalized }];
}

export function richTextLineToPlainText(line: RichTextLine | null | undefined): string {
  if (!line || line.length === 0) {
    return "";
  }

  return normalizeText(
    line
      .map((fragment) => fragment.text)
      .join(" "),
  );
}

function normalizeRichTextLine(line: RichTextLine | null | undefined): RichTextLine {
  if (!line) {
    return [];
  }

  return line
    .map((fragment) => {
      const text = normalizeText(fragment.text);
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

function normalizeRichTextLines(lines: RichTextLine[] | null | undefined): RichTextLine[] {
  if (!lines) {
    return [];
  }

  return lines
    .map((line) => normalizeRichTextLine(line))
    .filter((line) => line.length > 0);
}

function normalizeStructuredExample(example: StructuredExample): StructuredExample | null {
  const text = normalizeRichTextLines(example.text);
  if (text.length === 0) {
    return null;
  }

  const label = example.label ? normalizeText(example.label) : undefined;
  const explanation = example.explanation ? normalizeText(example.explanation) : undefined;

  return {
    ...(label ? { label } : {}),
    ...(explanation ? { explanation } : {}),
    text,
  };
}

function normalizeVisualAids(visualAids: VisualAid[] | null | undefined): VisualAid[] {
  if (!visualAids) {
    return [];
  }

  const normalized = visualAids
    .map((visualAid) => {
      const title = normalizeText(visualAid.title);
      if (!title) {
        return null;
      }

      const common = {
        ...visualAid,
        title,
        ...(visualAid.note ? { note: normalizeText(visualAid.note) } : {}),
      };

      if (visualAid.kind === "step_sequence") {
        const steps = visualAid.steps
          .map((step) => ({
            ...(step.label ? { label: normalizeText(step.label) } : {}),
            text: normalizeText(step.text),
          }))
          .filter((step) => step.text.length > 0);
        return steps.length > 0 ? { ...common, steps } : null;
      }

      if (visualAid.kind === "column_operation") {
        const placeHeaders = normalizeUniqueList(visualAid.placeHeaders);
        const carry = visualAid.carry ? normalizeUniqueList(visualAid.carry) : undefined;
        return {
          ...common,
          placeHeaders,
          top: normalizeText(visualAid.top),
          bottom: normalizeText(visualAid.bottom),
          ...(visualAid.result ? { result: normalizeText(visualAid.result) } : {}),
          ...(carry && carry.length > 0 ? { carry } : {}),
          ...(visualAid.hint ? { hint: normalizeText(visualAid.hint) } : {}),
        };
      }

      if (visualAid.kind === "term_result_map") {
        return {
          ...common,
          expression: normalizeText(visualAid.expression),
          termLabel: normalizeText(visualAid.termLabel),
          resultLabel: normalizeText(visualAid.resultLabel),
        };
      }

      if (visualAid.kind === "worked_example") {
        const steps = normalizeUniqueList(visualAid.steps);
        return {
          ...common,
          problem: normalizeText(visualAid.problem),
          steps,
          answer: normalizeText(visualAid.answer),
        };
      }

      if (visualAid.kind === "marked_shape") {
        const items = visualAid.items
          .map((item) => ({
            label: normalizeText(item.label),
            ...(item.hasMarker ? { hasMarker: true } : {}),
          }))
          .filter((item) => item.label.length > 0);
        return items.length > 0
          ? {
              ...common,
              statement: normalizeText(visualAid.statement),
              items,
            }
          : null;
      }

      if (visualAid.kind === "compare_table") {
        const rows = visualAid.rows
          .map((row) => ({
            left: normalizeText(row.left),
            right: normalizeText(row.right),
            ...(row.note ? { note: normalizeText(row.note) } : {}),
          }))
          .filter((row) => row.left.length > 0 || row.right.length > 0);
        return rows.length > 0
          ? {
              ...common,
              columns: [normalizeText(visualAid.columns[0]), normalizeText(visualAid.columns[1])] as [string, string],
              rows,
            }
          : null;
      }

      if (visualAid.kind === "number_line") {
        return {
          ...common,
          start: visualAid.start,
          end: visualAid.end,
          marks: Array.from(new Set(visualAid.marks)),
          ...(typeof visualAid.highlight === "number" ? { highlight: visualAid.highlight } : {}),
        };
      }

      if (visualAid.kind === "classification_grid") {
        const categories = visualAid.categories
          .map((category) => ({
            label: normalizeText(category.label),
            items: normalizeUniqueList(category.items),
          }))
          .filter((category) => category.label.length > 0);
        return categories.length > 0 ? { ...common, categories } : null;
      }

      if (visualAid.kind === "vocab_cards") {
        const cards = visualAid.cards
          .map((card) => ({
            term: normalizeText(card.term),
            meaning: normalizeText(card.meaning),
            ...(card.example ? { example: normalizeText(card.example) } : {}),
          }))
          .filter((card) => card.term.length > 0 && card.meaning.length > 0);
        return cards.length > 0 ? { ...common, cards } : null;
      }

      if (visualAid.kind === "conjugation_grid") {
        const rows = visualAid.rows
          .map((row) => ({
            pronoun: normalizeText(row.pronoun),
            stem: normalizeText(row.stem),
            ending: normalizeText(row.ending),
          }))
          .filter((row) => row.pronoun.length > 0 && row.stem.length > 0 && row.ending.length > 0);
        return rows.length > 0
          ? {
              ...common,
              tense: normalizeText(visualAid.tense),
              verb: normalizeText(visualAid.verb),
              rows,
            }
          : null;
      }

      return null;
    })
    .filter((visualAid) => visualAid !== null) as VisualAid[];

  return normalized;
}

function normalizeStructuredContent(content: StructuredRevisionContent): StructuredRevisionContent {
  const definition = normalizeRichTextLine(content.definition);
  const jeRetiensItems = normalizeRichTextLines(content.jeRetiens?.items);
  const monTrucBullets = normalizeRichTextLines(content.monTruc?.bullets);
  const monTrucExample = content.monTruc?.example
    ? normalizeStructuredExample(content.monTruc.example)
    : null;
  const jeVoisExamples = (content.jeVois?.examples ?? [])
    .map((example) => normalizeStructuredExample(example))
    .filter((example) => example !== null) as StructuredExample[];
  const conjugation = (content.conjugation ?? [])
    .map((block) => {
      const tense = normalizeText(block.tense);
      const verb = normalizeText(block.verb);
      if (!tense || !verb) {
        return null;
      }

      const persons = block.persons
        .map((person) => ({
          pronoun: normalizeText(person.pronoun),
          stem: normalizeText(person.stem),
          ending: normalizeText(person.ending),
        }))
        .filter((person) => person.pronoun && person.stem && person.ending);

      return {
        tense,
        verb,
        ...(block.group ? { group: normalizeText(block.group) } : {}),
        persons,
      };
    })
    .filter((block) => block !== null) as NonNullable<StructuredRevisionContent["conjugation"]>;
  const visualAids = normalizeVisualAids(content.visualAids);

  return {
    ...(definition.length > 0 ? { definition } : {}),
    ...(jeRetiensItems.length > 0
      ? {
          jeRetiens: {
            ...(content.jeRetiens?.title ? { title: normalizeText(content.jeRetiens.title) } : {}),
            items: jeRetiensItems,
          },
        }
      : {}),
    ...(monTrucBullets.length > 0 || monTrucExample
      ? {
          monTruc: {
            bullets: monTrucBullets,
            ...(monTrucExample ? { example: monTrucExample } : {}),
          },
        }
      : {}),
    ...(jeVoisExamples.length > 0
      ? {
          jeVois: {
            examples: jeVoisExamples,
          },
        }
      : {}),
    ...(conjugation.length > 0 ? { conjugation } : {}),
    ...(visualAids.length > 0 ? { visualAids } : {}),
  };
}

function normalizeUniqueList(values: string[]): string[] {
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

function stripHtmlToText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function extractExamplesFromHtml(value: string): string[] {
  const paragraphMatches = Array.from(value.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtmlToText(match[1] ?? ""))
    .filter((entry) => entry.length > 0);
  if (paragraphMatches.length > 0) {
    return normalizeUniqueList(paragraphMatches);
  }

  const text = stripHtmlToText(value);
  if (!text) {
    return [];
  }

  return normalizeUniqueList(
    text
      .split(/\s*[.;!?]\s+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

function toHtmlParagraphs(values: string[]): string {
  return values.map((value) => `<p>${escapeHtml(value)}</p>`).join("");
}

function resolveAnswer(choiceList: string[], answer: string): { answer: string; answerIndex: number | null } {
  const normalizedAnswer = normalizeText(answer);
  const normalizedChoices = normalizeUniqueList(choiceList);
  const exactIndex = normalizedChoices.findIndex(
    (choice) => choice.toLocaleLowerCase() === normalizedAnswer.toLocaleLowerCase(),
  );

  if (exactIndex >= 0) {
    return {
      answer: normalizedChoices[exactIndex] ?? normalizedAnswer,
      answerIndex: exactIndex,
    };
  }

  if (normalizedAnswer && normalizedChoices.length < 8) {
    const nextChoices = [...normalizedChoices, normalizedAnswer];
    return {
      answer: normalizedAnswer,
      answerIndex: nextChoices.length - 1,
    };
  }

  return {
    answer: normalizedChoices[0] ?? normalizedAnswer,
    answerIndex: normalizedChoices.length > 0 ? 0 : null,
  };
}

export function mapStoredQuizToRevisionQuizQuestions(
  quiz: StoredRevisionCard["content"]["quiz"],
): RevisionQuizQuestion[] {
  return quiz.map((question, index) => {
    if (question.kind === "choices") {
      const choices = normalizeUniqueList(question.choices);
      const fallbackChoice = choices[0] ?? "";
      const answer =
        typeof question.answerIndex === "number" &&
        question.answerIndex >= 0 &&
        question.answerIndex < choices.length
          ? choices[question.answerIndex] ?? fallbackChoice
          : fallbackChoice;

      return {
        id: `stored-${index + 1}`,
        question: normalizeText(question.prompt),
        choices,
        answer,
      };
    }

    const freeAnswer = normalizeText(question.answer ?? "") || "Je ne sais pas encore";
    return {
      id: `stored-${index + 1}`,
      question: normalizeText(question.prompt),
      choices: [freeAnswer],
      answer: freeAnswer,
    };
  });
}

export function mapRevisionQuizToStoredChoicesQuiz(
  quiz: RevisionQuizQuestion[],
): RevisionQuizChoiceQuestion[] {
  return quiz.reduce<RevisionQuizChoiceQuestion[]>((accumulator, question) => {
      const normalizedQuestion = normalizeText(question.question);
      if (!normalizedQuestion) {
        return accumulator;
      }

      const choices = normalizeUniqueList(question.choices);
      if (choices.length < 2) {
        return accumulator;
      }

      const resolved = resolveAnswer(choices, question.answer);
      const finalChoices =
        resolved.answerIndex !== null && resolved.answerIndex >= choices.length && resolved.answer
          ? [...choices, resolved.answer]
          : choices;

      const answerIndex = finalChoices.findIndex(
        (choice) => choice.toLocaleLowerCase() === resolved.answer.toLocaleLowerCase(),
      );

      accumulator.push({
        kind: "choices" as const,
        prompt: normalizedQuestion,
        choices: finalChoices,
        answerIndex: answerIndex >= 0 ? answerIndex : 0,
        explanation: null,
      });

      return accumulator;
    }, []);
}

function normalizeHtmlList(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function toProcedureExercise(
  exercise: ProcedureExercise,
  index: number,
): ProcedureExercise | null {
  const instruction = normalizeText(exercise.instruction);
  if (!instruction) {
    return null;
  }

  const supportHtml = exercise.supportHtml?.trim();

  return {
    id: exercise.id || `exercise-${index + 1}`,
    instruction,
    supportHtml: supportHtml && supportHtml.length > 0 ? supportHtml : null,
  };
}

export function mapStoredCardToProcedureCard(
  card: StoredRevisionCardViewModel,
): ProcedureCard | null {
  const cardType = card.type ?? card.content.kind;
  if (cardType !== "procedure") {
    return null;
  }

  const procedurePayload = card.content.procedure;

  const fallbackSteps = normalizeUniqueList(card.content.steps).map(
    (step) => `<p>${escapeHtml(step)}</p>`,
  );
  const stepsHtml =
    card.stepsHtml && card.stepsHtml.length > 0
      ? normalizeHtmlList(card.stepsHtml)
      : procedurePayload && procedurePayload.stepsHtml.length > 0
        ? normalizeHtmlList(procedurePayload.stepsHtml)
        : fallbackSteps;

  const fallbackExampleHtml = toHtmlParagraphs(normalizeUniqueList(card.content.examples));
  const trimmedExampleHtml = card.exampleHtml?.trim() ?? procedurePayload?.exampleHtml?.trim();
  const exampleHtml =
    trimmedExampleHtml && trimmedExampleHtml.length > 0
      ? trimmedExampleHtml
      : fallbackExampleHtml;

  const rawExercises =
    card.procedureExercises && card.procedureExercises.length > 0
      ? card.procedureExercises
      : procedurePayload && procedurePayload.exercises.length > 0
        ? procedurePayload.exercises
      : normalizeUniqueList(card.exercises ?? card.content.steps).map((instruction, index) => ({
          id: `exercise-${index + 1}`,
          instruction,
          supportHtml: null,
        }));

  const exercises = rawExercises
    .map((exercise, index) => toProcedureExercise(exercise, index))
    .filter((exercise): exercise is ProcedureExercise => exercise !== null);

  const mappedMonTruc = normalizeText(
    card.monTruc ?? procedurePayload?.monTruc ?? card.content.tips[0] ?? "",
  );

  return {
    type: "procedure",
    id: card.id,
    subject: card.subject,
    level: card.level ?? "",
    title: card.title,
    goal: card.goal ?? procedurePayload?.goal ?? card.content.summary ?? "",
    stepsHtml,
    exampleHtml,
    monTruc: mappedMonTruc,
    exercises,
    quiz:
      card.quiz && card.quiz.length > 0
        ? card.quiz
        : procedurePayload && procedurePayload.quiz.length > 0
          ? procedurePayload.quiz
        : mapStoredQuizToRevisionQuizQuestions(card.content.quiz),
    audioScript: card.audioScript ?? procedurePayload?.audioScript ?? null,
  };
}

function toVocabItem(item: VocabItem, index: number): VocabItem | null {
  const term = normalizeText(item.term);
  if (!term) {
    return null;
  }

  return {
    id: item.id || `vocab-${index + 1}`,
    term,
    translation: normalizeText(item.translation),
    exampleSentence: normalizeText(item.exampleSentence),
    exampleTranslation: normalizeText(item.exampleTranslation),
  };
}

function mapExampleToVocabItem(example: string, index: number): VocabItem {
  const normalized = normalizeText(example);
  const separatorPattern = /\s*(?:->|:|=|-)\s*/;
  const split = normalized.split(separatorPattern, 2);
  const rawTerm = split[0] ?? normalized;
  const rawTranslation = split[1] ?? "";
  const hasSplit = rawTranslation.length > 0;

  const term = (hasSplit ? rawTerm : normalized).replace(/\s+/g, " ").trim();
  const translation = (hasSplit ? rawTranslation : "").replace(/\s+/g, " ").trim();

  return {
    id: `vocab-${index + 1}`,
    term,
    translation,
    exampleSentence: normalized,
    exampleTranslation: translation,
  };
}

export function mapStoredCardToVocabCard(
  card: StoredRevisionCardViewModel,
): VocabCard | null {
  const cardType = card.type ?? card.content.kind;
  if (cardType !== "vocab") {
    return null;
  }

  const vocabPayload = card.content.vocab;

  const rawItems =
    card.vocabItems && card.vocabItems.length > 0
      ? card.vocabItems
      : vocabPayload && vocabPayload.items.length > 0
        ? vocabPayload.items
      : normalizeUniqueList(card.content.examples).map((example, index) =>
          mapExampleToVocabItem(example, index),
        );

  const items = rawItems
    .map((item, index) => toVocabItem(item, index))
    .filter((item): item is VocabItem => item !== null);

  const activities = normalizeUniqueList(
    card.vocabActivities ?? vocabPayload?.activities ?? card.content.steps,
  );

  return {
    type: "vocab",
    id: card.id,
    subject: card.subject,
    level: card.level ?? "",
    title: card.title,
    goal: card.goal ?? vocabPayload?.goal ?? card.content.summary ?? "",
    items,
    activities,
    quiz:
      card.quiz && card.quiz.length > 0
        ? card.quiz
        : vocabPayload && vocabPayload.quiz.length > 0
          ? vocabPayload.quiz
        : mapStoredQuizToRevisionQuizQuestions(card.content.quiz),
    audioScript: card.audioScript ?? vocabPayload?.audioScript ?? null,
  };
}

function toComprehensionQuestion(
  question: ComprehensionQuestion,
  index: number,
): ComprehensionQuestion | null {
  const normalizedQuestion = normalizeText(question.question);
  if (!normalizedQuestion) {
    return null;
  }

  const choices = normalizeUniqueList(question.choices);
  if (choices.length < 2) {
    return null;
  }

  const resolved = resolveAnswer(choices, question.answer);
  const finalChoices =
    resolved.answerIndex !== null && resolved.answerIndex >= choices.length && resolved.answer
      ? [...choices, resolved.answer]
      : choices;
  const answer =
    finalChoices.find(
      (choice) => choice.toLocaleLowerCase() === resolved.answer.toLocaleLowerCase(),
    ) ?? finalChoices[0] ?? resolved.answer;

  return {
    id: question.id || `comprehension-q-${index + 1}`,
    question: normalizedQuestion,
    choices: finalChoices,
    answer,
  };
}

export function mapStoredCardToComprehensionCard(
  card: StoredRevisionCardViewModel,
): ComprehensionCard | null {
  const cardType = card.type ?? card.content.kind;
  if (cardType !== "comprehension") {
    return null;
  }

  const comprehensionPayload = card.content.comprehension;
  const fallbackQuiz = mapStoredQuizToRevisionQuizQuestions(card.content.quiz);
  const rawQuestions =
    card.comprehensionQuestions && card.comprehensionQuestions.length > 0
      ? card.comprehensionQuestions
      : comprehensionPayload && comprehensionPayload.questions.length > 0
        ? comprehensionPayload.questions
      : fallbackQuiz.map((question) => ({
          id: question.id,
          question: question.question,
          choices: question.choices,
          answer: question.answer,
        }));
  const questions = rawQuestions
    .map((question, index) => toComprehensionQuestion(question, index))
    .filter((question): question is ComprehensionQuestion => question !== null);

  const fromComprehensionText = card.comprehensionText?.trim() ?? comprehensionPayload?.text?.trim();
  const fromExamples = normalizeUniqueList(card.content.examples).join("\n\n");
  const fromSummary = card.content.summary?.trim() ?? "";
  const text =
    fromComprehensionText && fromComprehensionText.length > 0
      ? fromComprehensionText
      : fromExamples.length > 0
        ? fromExamples
        : fromSummary;

  const translation =
    card.comprehensionTextTranslation?.trim() ?? comprehensionPayload?.textTranslation?.trim();
  const openQuestions = normalizeUniqueList(
    card.comprehensionOpenQuestions ?? comprehensionPayload?.openQuestions ?? card.content.steps,
  );

  return {
    type: "comprehension",
    id: card.id,
    subject: card.subject,
    level: card.level ?? "",
    title: card.title,
    goal: card.goal ?? comprehensionPayload?.goal ?? card.content.summary ?? "",
    text,
    textTranslation: translation && translation.length > 0 ? translation : null,
    questions,
    openQuestions,
    quiz:
      card.quiz && card.quiz.length > 0
        ? card.quiz
        : comprehensionPayload && comprehensionPayload.quiz.length > 0
          ? comprehensionPayload.quiz
          : fallbackQuiz,
    audioScript: card.audioScript ?? comprehensionPayload?.audioScript ?? null,
  };
}

function mapConceptCardToStructuredContent(card: ConceptCard): StructuredRevisionContent {
  const examples = card.blocks.examples
    .map((example) => normalizeText(example))
    .filter((example) => example.length > 0)
    .map<StructuredExample>((example) => ({
      text: [plainTextToRichTextLine(example)],
    }));

  const summaryLine = plainTextToRichTextLine(card.blocks.jeRetiens);
  const tipLine = plainTextToRichTextLine(card.blocks.monTruc);

  return normalizeStructuredContent({
    ...(summaryLine.length > 0 ? { definition: summaryLine } : {}),
    ...(summaryLine.length > 0
      ? {
          jeRetiens: {
            items: [summaryLine],
          },
        }
      : {}),
    ...(examples.length > 0 ? { jeVois: { examples } } : {}),
    ...(tipLine.length > 0
      ? {
          monTruc: {
            bullets: [tipLine],
          },
        }
      : {}),
  });
}

export function mapStoredCardToStructuredRevisionContent(
  card: StoredRevisionCardViewModel,
): StructuredRevisionContent | null {
  const fromStorage = card.structured ?? card.content.structured;
  if (fromStorage) {
    const normalized = normalizeStructuredContent(fromStorage);
    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  const conceptCard = (() => {
    const cardType = card.type ?? card.content.kind;
    if (cardType !== "concept") {
      return null;
    }

    const conceptPayload = card.content.concept;
    const blockExamples = card.blocks?.examples ?? conceptPayload?.blocks.examples ?? [];
    const examples = blockExamples.length > 0 ? blockExamples : card.content.examples;
    const jeVoisHtml =
      card.blocks?.jeVoisHtml && card.blocks.jeVoisHtml.trim().length > 0
        ? card.blocks.jeVoisHtml
        : conceptPayload?.blocks.jeVoisHtml && conceptPayload.blocks.jeVoisHtml.trim().length > 0
          ? conceptPayload.blocks.jeVoisHtml
          : examples.map((example) => `<p>${escapeHtml(example)}</p>`).join("");

    return {
      type: "concept" as const,
      id: card.id,
      subject: card.subject,
      level: card.level ?? "",
      title: card.title,
      goal: card.goal ?? conceptPayload?.goal ?? card.content.summary ?? "",
      blocks: {
        jeRetiens: card.blocks?.jeRetiens ?? conceptPayload?.blocks.jeRetiens ?? card.content.summary ?? "",
        jeVoisHtml,
        monTruc: card.blocks?.monTruc ?? conceptPayload?.blocks.monTruc ?? card.content.tips[0] ?? "",
        examples,
      },
      exercises: card.exercises ?? conceptPayload?.exercises ?? card.content.steps,
      quiz:
        card.quiz && card.quiz.length > 0
          ? card.quiz
          : conceptPayload && conceptPayload.quiz.length > 0
            ? conceptPayload.quiz
            : mapStoredQuizToRevisionQuizQuestions(card.content.quiz),
      audioScript: card.audioScript ?? conceptPayload?.audioScript ?? null,
    };
  })();

  if (conceptCard) {
    return mapConceptCardToStructuredContent(conceptCard);
  }

  const procedureCard = mapStoredCardToProcedureCard(card);
  if (procedureCard) {
    const steps = procedureCard.stepsHtml
      .map((step) => stripHtmlToText(step))
      .filter((step) => step.length > 0)
      .map((step) => plainTextToRichTextLine(step, "keyword"));
    const exampleText = stripHtmlToText(procedureCard.exampleHtml);
    const tipLine = plainTextToRichTextLine(procedureCard.monTruc);
    return normalizeStructuredContent({
      ...(plainTextToRichTextLine(procedureCard.goal).length > 0
        ? { definition: plainTextToRichTextLine(procedureCard.goal) }
        : {}),
      ...(steps.length > 0 ? { jeRetiens: { items: steps } } : {}),
      ...(exampleText
        ? {
            jeVois: {
              examples: [
                {
                  text: [plainTextToRichTextLine(exampleText)],
                },
              ],
            },
          }
        : {}),
      ...(tipLine.length > 0
        ? {
            monTruc: {
              bullets: [tipLine],
            },
          }
        : {}),
    });
  }

  const vocabCard = mapStoredCardToVocabCard(card);
  if (vocabCard) {
    const items = vocabCard.items.map<RichTextLine>((item) => {
      const fragments: RichTextLine = [];
      if (item.term.trim().length > 0) {
        fragments.push({
          type: "highlight",
          tag: "term",
          text: normalizeText(item.term),
        });
      }
      if (item.translation.trim().length > 0) {
        fragments.push({
          type: "text",
          text: `: ${normalizeText(item.translation)}`,
        });
      }
      return fragments;
    });
    const examples = vocabCard.items
      .filter((item) => item.exampleSentence.trim().length > 0)
      .map<StructuredExample>((item) => ({
        ...(item.term ? { label: normalizeText(item.term) } : {}),
        ...(item.exampleTranslation ? { explanation: normalizeText(item.exampleTranslation) } : {}),
        text: [plainTextToRichTextLine(item.exampleSentence)],
      }));
    return normalizeStructuredContent({
      ...(plainTextToRichTextLine(vocabCard.goal).length > 0
        ? { definition: plainTextToRichTextLine(vocabCard.goal) }
        : {}),
      ...(items.length > 0 ? { jeRetiens: { items } } : {}),
      ...(examples.length > 0 ? { jeVois: { examples } } : {}),
      ...(vocabCard.activities.length > 0
        ? {
            monTruc: {
              bullets: vocabCard.activities.map((activity) => plainTextToRichTextLine(activity)),
            },
          }
        : {}),
    });
  }

  const comprehensionCard = mapStoredCardToComprehensionCard(card);
  if (comprehensionCard) {
    const readingParagraphs = comprehensionCard.text
      .split(/\n+/)
      .map((line) => normalizeText(line))
      .filter((line) => line.length > 0)
      .map((line) => plainTextToRichTextLine(line));
    const questionExamples = comprehensionCard.questions.map<StructuredExample>((question) => ({
      label: normalizeText(question.question),
      explanation: question.answer,
      text: question.choices.map((choice) => plainTextToRichTextLine(choice)),
    }));
    const openQuestionBullets = comprehensionCard.openQuestions.map((question) =>
      plainTextToRichTextLine(question),
    );
    return normalizeStructuredContent({
      ...(plainTextToRichTextLine(comprehensionCard.goal).length > 0
        ? { definition: plainTextToRichTextLine(comprehensionCard.goal) }
        : {}),
      ...(readingParagraphs.length > 0
        ? {
            jeRetiens: {
              items: readingParagraphs,
            },
          }
        : {}),
      ...(questionExamples.length > 0 ? { jeVois: { examples: questionExamples } } : {}),
      ...(openQuestionBullets.length > 0
        ? {
            monTruc: {
              bullets: openQuestionBullets,
            },
          }
        : {}),
    });
  }

  return null;
}

export interface ConceptEditorModel {
  id: string;
  title: string;
  subject: string;
  level: string | null;
  status: RevisionCardStatus;
  jeRetiens: string;
  jeVoisHtml: string;
  monTruc: string;
  exercises: string[];
  quiz: RevisionQuizQuestion[];
}

export interface ConceptCardPatchInput {
  blocks?: {
    jeRetiens?: string;
    jeVoisHtml?: string;
    monTruc?: string;
    examples?: string[];
  };
  exercises?: string[];
  quiz?: RevisionQuizQuestion[];
}

export function mapStoredCardToConceptEditorModel(card: StoredRevisionCard): ConceptEditorModel | null {
  if (card.content.kind !== "concept") {
    return null;
  }

  const conceptPayload = card.content.concept;
  const examples = normalizeUniqueList(conceptPayload?.blocks.examples ?? card.content.examples);
  const quiz =
    conceptPayload && conceptPayload.quiz.length > 0
      ? conceptPayload.quiz
      : mapStoredQuizToRevisionQuizQuestions(card.content.quiz);
  const jeVoisHtml =
    conceptPayload?.blocks.jeVoisHtml && conceptPayload.blocks.jeVoisHtml.trim().length > 0
      ? conceptPayload.blocks.jeVoisHtml
      : toHtmlParagraphs(examples);

  return {
    id: card.id,
    title: card.title,
    subject: card.subject,
    level: card.level,
    status: card.status,
    jeRetiens: conceptPayload?.blocks.jeRetiens ?? card.content.summary ?? "",
    jeVoisHtml,
    monTruc: conceptPayload?.blocks.monTruc ?? card.content.tips[0] ?? "",
    exercises: normalizeUniqueList(conceptPayload?.exercises ?? card.content.steps),
    quiz,
  };
}

export function mergeConceptCardPatchIntoStoredCard(
  card: StoredRevisionCard,
  patch: ConceptCardPatchInput,
): StoredRevisionCard {
  if (card.content.kind !== "concept") {
    return card;
  }

  const currentSummary = card.content.summary ?? "";
  const currentJeVoisHtml = toHtmlParagraphs(card.content.examples);
  const currentMonTruc = card.content.tips[0] ?? "";
  const currentExercises = normalizeUniqueList(card.content.steps);
  const currentQuiz = mapStoredQuizToRevisionQuizQuestions(card.content.quiz);
  const currentTrailingTips = normalizeUniqueList(card.content.tips.slice(1));

  const nextJeRetiens = normalizeText(patch.blocks?.jeRetiens ?? currentSummary);
  const nextJeVoisHtml = patch.blocks?.jeVoisHtml?.trim() ?? currentJeVoisHtml;
  const htmlExamples = extractExamplesFromHtml(nextJeVoisHtml);
  const explicitExamples = patch.blocks?.examples ? normalizeUniqueList(patch.blocks.examples) : [];
  const fallbackExamples = normalizeUniqueList(card.content.examples);
  const nextExamples =
    explicitExamples.length > 0
      ? explicitExamples
      : htmlExamples.length > 0
        ? htmlExamples
        : fallbackExamples;
  const nextMonTruc = normalizeText(patch.blocks?.monTruc ?? currentMonTruc);
  const nextExercises = patch.exercises ? normalizeUniqueList(patch.exercises) : currentExercises;
  const nextQuiz = patch.quiz ? patch.quiz : currentQuiz;
  const nextStoredQuiz = mapRevisionQuizToStoredChoicesQuiz(nextQuiz);

  const nextTips = normalizeUniqueList([nextMonTruc, ...currentTrailingTips]);

  const conceptPayload = card.content.concept;

  return {
    ...card,
    content: {
      kind: "concept",
      summary: nextJeRetiens || null,
      steps: nextExercises,
      examples: nextExamples,
      quiz: nextStoredQuiz,
      tips: nextTips,
      ...(card.content.source ? { source: card.content.source } : {}),
      ...(card.content.structured ? { structured: card.content.structured } : {}),
      ...(card.content.generatedExercises !== undefined
        ? { generatedExercises: card.content.generatedExercises }
        : {}),
      concept: {
        goal: conceptPayload?.goal ?? card.content.summary ?? null,
        blocks: {
          jeRetiens: nextJeRetiens,
          jeVoisHtml: nextJeVoisHtml,
          monTruc: nextMonTruc,
          examples: nextExamples,
        },
        exercises: nextExercises,
        quiz: nextQuiz,
        audioScript: conceptPayload?.audioScript ?? null,
      },
    },
  };
}
