"use client";

import * as React from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, HighlightChip } from "@/components/ds";
import {
  mapStoredCardToStructuredRevisionContent,
  mapStoredCardToComprehensionCard,
  mapStoredCardToProcedureCard,
  mapStoredCardToVocabCard,
  mapStoredQuizToRevisionQuizQuestions,
} from "@/lib/revisions/mappers";
import type {
  CardType,
  ComprehensionCard,
  ConceptCard,
  ExercisesPayload,
  HighlightTag,
  ProcedureCard,
  RichTextLine,
  RevisionCard,
  RevisionQuizQuestion,
  StoredRevisionCardViewModel,
  StructuredRevisionContent,
  VisualAid,
  VocabCard,
} from "@/lib/revisions/types";
import { cn } from "@/lib/utils";
import { RevisionQuiz } from "./RevisionQuiz";
import { SectionAccordion } from "./SectionAccordion";
import { StepSectionsNavigator } from "./StepSectionsNavigator";

export interface MarkReviewedActionState {
  success: boolean;
  message: string | null;
}

const noopMarkReviewedAction = async (): Promise<MarkReviewedActionState> => DEFAULT_ACTION_STATE;

interface RevisionCardViewProps {
  card: StoredRevisionCardViewModel;
  onMarkReviewedAction?: (
    previousState: MarkReviewedActionState,
    formData: FormData,
  ) => Promise<MarkReviewedActionState>;
  onGenerateExtraExercisesAction?: (input: {
    cardId: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    exercises?: ExercisesPayload;
  }>;
  initialActionState?: MarkReviewedActionState;
  showHeader?: boolean;
  showMarkReviewedControls?: boolean;
}

interface RevisionSection {
  id: string;
  title: string;
  teaser?: string;
  content: React.ReactNode;
  testId: string;
}

interface SheetBlock {
  id: string;
  title: string;
  icon: string;
  column: "left" | "right" | "full";
  testId: string;
  content: React.ReactNode;
  className?: string;
}

type SheetViewMode = "compact" | "enriched";
type GuidanceMode = "normal" | "guided";
type MotionMode = "full" | "reduced";

interface RevisionUxPreferences {
  guidanceMode: GuidanceMode;
  motionMode: MotionMode;
  sheetViewMode: SheetViewMode;
}

type JeRetiensRuntimeShape = {
  items?: RichTextLine[] | undefined;
  bullets?: RichTextLine[] | undefined;
};

const DEFAULT_ACTION_STATE: MarkReviewedActionState = {
  success: false,
  message: null,
};
const REVISION_UX_PREFS_STORAGE_KEY = "ezra:child:revisions:ux-prefs:v1";

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stripHtml(value: string): string {
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

function toTeaser(value: string, maxLength = 110): string {
  const text = value.trim();
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function renderRichTextLine(line: RichTextLine, keyPrefix: string): React.ReactNode {
  return line.map((fragment, index) => {
    const key = `${keyPrefix}-${index}`;
    const prefix = index > 0 ? " " : "";

    if (fragment.type === "highlight") {
      return (
        <React.Fragment key={key}>
          {prefix}
          <HighlightChip tag={fragment.tag}>{fragment.text}</HighlightChip>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={key}>
        {prefix}
        {fragment.text}
      </React.Fragment>
    );
  });
}

function renderRichTextLines(lines: RichTextLine[], keyPrefix: string): React.ReactNode {
  return lines.map((line, index) => (
    <p key={`${keyPrefix}-${index}`} className="reading text-base leading-relaxed text-text-primary">
      {renderRichTextLine(line, `${keyPrefix}-${index}`)}
    </p>
  ));
}

function toPlainLineText(line: RichTextLine): string {
  return line
    .map((fragment) => fragment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSheetList(lines: RichTextLine[], maxItems: number): RichTextLine[] {
  return lines.filter((line) => toPlainLineText(line).length > 0).slice(0, maxItems);
}

function isHighlightTag(value: unknown): value is HighlightTag {
  return value === "term" || value === "keyword" || value === "ending";
}

function normalizeRuntimeRichTextLines(value: unknown): RichTextLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: RichTextLine[] = [];
  value.forEach((line) => {
    if (!Array.isArray(line)) {
      return;
    }

    const nextLine: RichTextLine = [];
    line.forEach((fragment) => {
      if (!fragment || typeof fragment !== "object") {
        return;
      }

      const candidate = fragment as {
        type?: unknown;
        text?: unknown;
        tag?: unknown;
      };

      if (typeof candidate.text !== "string" || candidate.text.trim().length === 0) {
        return;
      }

      if (candidate.type === "highlight" && isHighlightTag(candidate.tag)) {
        nextLine.push({
          type: "highlight",
          tag: candidate.tag,
          text: candidate.text.trim(),
        });
        return;
      }

      nextLine.push({
        type: "text",
        text: candidate.text.trim(),
      });
    });

    if (nextLine.length > 0) {
      lines.push(nextLine);
    }
  });

  return lines;
}

function getRuntimeJeRetiensBullets(card: StoredRevisionCardViewModel): RichTextLine[] {
  const rawStructured = card.content.structured as unknown;
  if (!rawStructured || typeof rawStructured !== "object") {
    return [];
  }

  const rawJeRetiens = (rawStructured as { jeRetiens?: unknown }).jeRetiens;
  if (!rawJeRetiens || typeof rawJeRetiens !== "object") {
    return [];
  }

  const rawBullets = (rawJeRetiens as { bullets?: unknown }).bullets;
  return normalizeRuntimeRichTextLines(rawBullets);
}

function getJeRetiensLines(structured: StructuredRevisionContent): RichTextLine[] {
  const jeRetiens = structured.jeRetiens as JeRetiensRuntimeShape | undefined;
  const runtimeBullets = Array.isArray(jeRetiens?.bullets) ? jeRetiens.bullets : [];
  const runtimeItems = Array.isArray(jeRetiens?.items) ? jeRetiens.items : [];

  return normalizeSheetList(runtimeBullets.length > 0 ? runtimeBullets : runtimeItems, 5);
}

function getSheetMicroTestItems(structured: StructuredRevisionContent): string[] {
  const checklist = getJeRetiensLines(structured)
    .slice(0, 3)
    .map((line) => toPlainLineText(line))
    .filter((line) => hasText(line))
    .map((line) => `Je sais expliquer: ${line}`);

  const examples = (structured.jeVois?.examples ?? [])
    .map((example) => example.explanation ?? toPlainLineText(example.text[0] ?? []))
    .filter((value) => hasText(value))
    .slice(0, 2)
    .map((value) => `Je verifie avec: ${value}`);

  return [...checklist, ...examples].slice(0, 5);
}

function getVisualAidKindLabel(kind: VisualAid["kind"]): string {
  if (kind === "step_sequence") {
    return "Etapes";
  }
  if (kind === "column_operation") {
    return "Calcul en colonnes";
  }
  if (kind === "term_result_map") {
    return "Termes et resultat";
  }
  if (kind === "worked_example") {
    return "Exemple guide";
  }
  if (kind === "marked_shape") {
    return "Schema repere";
  }
  if (kind === "compare_table") {
    return "Tableau compare";
  }
  if (kind === "number_line") {
    return "Droite numerique";
  }
  if (kind === "classification_grid") {
    return "Grille de tri";
  }
  if (kind === "vocab_cards") {
    return "Cartes vocabulaire";
  }
  return "Conjugaison";
}

function InteractiveStepSequenceVisualAid({
  visualAid,
  reduceMotion,
}: {
  visualAid: Extract<VisualAid, { kind: "step_sequence" }>;
  reduceMotion: boolean;
}): React.JSX.Element {
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const stepsCount = visualAid.steps.length;
  const clampedIndex = Math.max(0, Math.min(activeStepIndex, Math.max(stepsCount - 1, 0)));
  const activeStep = visualAid.steps[clampedIndex] ?? null;
  const progressPercent = stepsCount > 0 ? Math.round(((clampedIndex + 1) / stepsCount) * 100) : 0;

  return (
    <div className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3" data-testid={`visual-aid-step-sequence-${visualAid.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        <Badge variant="neutral" className="text-xs">
          Etape {Math.min(clampedIndex + 1, Math.max(stepsCount, 1))}/{Math.max(stepsCount, 1)}
        </Badge>
      </div>
      {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}

      {activeStep ? (
        <div
          className={cn(
            "mt-2 rounded-radius-button border border-border-subtle bg-bg-elevated/65 px-3 py-2",
            reduceMotion ? "" : "transition-all duration-200",
          )}
        >
          <p className="reading text-sm leading-relaxed text-text-primary">
            {activeStep.label ? <span className="font-semibold">{activeStep.label} - </span> : null}
            {activeStep.text}
          </p>
        </div>
      ) : null}

      {stepsCount > 1 ? (
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-border-subtle/80">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary",
                reduceMotion ? "" : "transition-all duration-200",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={clampedIndex <= 0}
              onClick={() => {
                setActiveStepIndex((current) => Math.max(0, current - 1));
              }}
            >
              Etape precedente
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={clampedIndex >= stepsCount - 1}
              onClick={() => {
                setActiveStepIndex((current) => Math.min(stepsCount - 1, current + 1));
              }}
            >
              Etape suivante
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderVisualAid(
  visualAid: VisualAid,
  index: number,
  options: {
    reduceMotion: boolean;
  },
): React.ReactNode {
  if (visualAid.kind === "step_sequence") {
    return <InteractiveStepSequenceVisualAid key={`visual-aid-${visualAid.id}-${index}`} visualAid={visualAid} reduceMotion={options.reduceMotion} />;
  }

  if (visualAid.kind === "column_operation") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
          <Badge variant="neutral" className="text-xs">
            {visualAid.operation}
          </Badge>
        </div>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        {visualAid.placeHeaders.length > 0 ? (
          <p className="pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">
            {visualAid.placeHeaders.join("  ")}
          </p>
        ) : null}
        <div className="mt-2 inline-block rounded-radius-button border border-border-subtle bg-bg-elevated/70 px-3 py-2 font-mono text-lg text-text-primary">
          <p className="text-right">{visualAid.top}</p>
          <p className="text-right">+ {visualAid.bottom}</p>
          <p className="mt-1 border-t border-border-subtle pt-1 text-right font-semibold">
            {visualAid.result ?? "?"}
          </p>
        </div>
        {visualAid.hint ? <p className="pt-2 text-sm text-text-secondary">{visualAid.hint}</p> : null}
      </div>
    );
  }

  if (visualAid.kind === "term_result_map") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <p className="pt-2 text-lg font-semibold text-text-primary">{visualAid.expression}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-radius-button border border-border-subtle bg-status-info/10 px-3 py-2 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">Termes</p>
            <p className="font-semibold text-text-primary">{visualAid.termLabel}</p>
          </div>
          <div className="rounded-radius-button border border-border-subtle bg-status-success/10 px-3 py-2 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">Resultat</p>
            <p className="font-semibold text-text-primary">{visualAid.resultLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  if (visualAid.kind === "worked_example") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <p className="pt-2 text-sm text-text-secondary">Probleme</p>
        <p className="reading text-base text-text-primary">{visualAid.problem}</p>
        <ol className="mt-2 space-y-1.5 text-sm text-text-primary">
          {visualAid.steps.map((step, stepIndex) => (
            <li key={`${visualAid.id}-worked-step-${stepIndex}`} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-primary/15 px-1.5 text-[11px] font-semibold text-brand-primary">
                {stepIndex + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="pt-2 text-sm">
          <span className="font-semibold text-text-secondary">Reponse:</span>{" "}
          <span className="font-semibold text-status-success">{visualAid.answer}</span>
        </p>
      </div>
    );
  }

  if (visualAid.kind === "marked_shape") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <p className="pt-2 text-sm text-text-primary">{visualAid.statement}</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {visualAid.items.map((item, itemIndex) => (
            <li key={`${visualAid.id}-shape-${itemIndex}`} className="flex items-center gap-2">
              <span aria-hidden="true" className={cn("text-xs", item.hasMarker ? "text-status-success" : "text-text-tertiary")}>
                {item.hasMarker ? "■" : "□"}
              </span>
              <span className="text-text-primary">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (visualAid.kind === "compare_table") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <div className="mt-2 overflow-x-auto rounded-radius-button border border-border-subtle">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="bg-bg-elevated/70 text-text-secondary">
              <tr>
                <th className="px-3 py-2 font-semibold">{visualAid.columns[0]}</th>
                <th className="px-3 py-2 font-semibold">{visualAid.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {visualAid.rows.map((row, rowIndex) => (
                <tr key={`${visualAid.id}-compare-${rowIndex}`} className="border-t border-border-subtle">
                  <td className="px-3 py-2 text-text-primary">{row.left}</td>
                  <td className="px-3 py-2 text-text-primary">
                    {row.right}
                    {row.note ? <p className="pt-1 text-xs text-text-secondary">{row.note}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (visualAid.kind === "number_line") {
    const denominator = Math.max(1, visualAid.end - visualAid.start);
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <div className="mt-3 rounded-radius-button border border-border-subtle bg-bg-elevated/60 px-3 py-4">
          <div className="relative h-1 rounded-full bg-border-subtle">
            {visualAid.marks.map((mark, markIndex) => {
              const offset = ((mark - visualAid.start) / denominator) * 100;
              return (
                <span
                  key={`${visualAid.id}-mark-${markIndex}`}
                  className={cn(
                    "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg-surface",
                    mark === visualAid.highlight ? "bg-status-warning" : "bg-brand-primary/70",
                  )}
                  style={{ left: `${Math.max(0, Math.min(100, offset))}%` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
            <span>{visualAid.start}</span>
            <span>{visualAid.end}</span>
          </div>
        </div>
      </div>
    );
  }

  if (visualAid.kind === "classification_grid") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {visualAid.categories.map((category, categoryIndex) => (
            <div key={`${visualAid.id}-cat-${categoryIndex}`} className="rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2">
              <p className="text-sm font-semibold text-text-primary">{category.label}</p>
              <ul className="mt-1 space-y-1 text-sm text-text-secondary">
                {category.items.map((item, itemIndex) => (
                  <li key={`${visualAid.id}-cat-${categoryIndex}-item-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visualAid.kind === "vocab_cards") {
    return (
      <div
        key={`visual-aid-${visualAid.id}-${index}`}
        className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
        {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {visualAid.cards.map((card, cardIndex) => (
            <div key={`${visualAid.id}-vocab-${cardIndex}`} className="rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2">
              <p className="text-sm font-semibold text-text-primary">{card.term}</p>
              <p className="text-sm text-text-secondary">{card.meaning}</p>
              {card.example ? <p className="pt-1 text-xs text-text-secondary">{card.example}</p> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      key={`visual-aid-${visualAid.id}-${index}`}
      className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
    >
      <p className="text-sm font-semibold text-text-primary">{visualAid.title}</p>
      {visualAid.note ? <p className="pt-1 text-xs text-text-secondary">{visualAid.note}</p> : null}
      <p className="pt-2 text-sm text-text-secondary">
        {visualAid.verb} - {visualAid.tense}
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="text-text-secondary">
            <tr>
              <th className="px-2 py-1.5 font-semibold">Pronom</th>
              <th className="px-2 py-1.5 font-semibold">Radical</th>
              <th className="px-2 py-1.5 font-semibold">Terminaison</th>
            </tr>
          </thead>
          <tbody>
            {visualAid.rows.map((row, rowIndex) => (
              <tr key={`${visualAid.id}-row-${rowIndex}`} className="border-t border-border-subtle">
                <td className="px-2 py-1.5 text-text-primary">{row.pronoun}</td>
                <td className="px-2 py-1.5 text-text-primary">{row.stem}</td>
                <td className="px-2 py-1.5">
                  <HighlightChip tag="ending">{row.ending}</HighlightChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getSheetBlocks(
  structured: StructuredRevisionContent,
  options: {
    viewMode: SheetViewMode;
    reduceMotion: boolean;
  },
): SheetBlock[] {
  const blocks: SheetBlock[] = [];
  const isCompact = options.viewMode === "compact";
  const jeRetiensItems = getJeRetiensLines(structured).slice(0, isCompact ? 3 : 5);

  if (jeRetiensItems.length > 0) {
    blocks.push({
      id: "sheet-je-retiens",
      title: "Je retiens",
      icon: "\u{1F4A1}",
      column: "left",
      testId: "revision-sheet-je-retiens",
      content: (
        <ul className="space-y-2" data-testid="revision-sheet-je-retiens-list">
          {jeRetiensItems.map((line, index) => (
            <li
              key={`sheet-keep-${index}`}
              className="flex items-start gap-2 rounded-radius-button border border-border-subtle bg-bg-surface/90 px-3 py-2"
            >
              <span aria-hidden="true" className="pt-1 text-xs text-brand-primary">
                {"\u2022"}
              </span>
              <span className="reading break-words text-base leading-relaxed text-text-primary">
                {renderRichTextLine(line, `sheet-keep-${index}`)}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  const jeVoisExamples = (structured.jeVois?.examples ?? []).slice(0, isCompact ? 2 : 3);
  if (jeVoisExamples.length > 0) {
    blocks.push({
      id: "sheet-je-vois",
      title: "Je vois",
      icon: "\u{1F50D}",
      column: "right",
      testId: "revision-sheet-je-vois",
      content: (
        <div className="space-y-3">
          {jeVoisExamples.map((example, index) => (
            <div
              key={`sheet-example-${index}`}
              className="mission-drawer-instructions-white-block border-border-subtle/80"
              data-testid={`revision-sheet-je-vois-example-${index}`}
            >
              {example.label ? (
                <p className="text-sm font-semibold text-text-secondary">{example.label}</p>
              ) : null}
              <div className="space-y-1">{renderRichTextLines(example.text, `sheet-example-line-${index}`)}</div>
              {example.explanation ? (
                <p className="pt-1 text-sm font-medium text-status-info">{example.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ),
    });
  }

  const monTrucBullets = normalizeSheetList(structured.monTruc?.bullets ?? [], isCompact ? 2 : 3);
  const monTrucExample = structured.monTruc?.example;
  if (monTrucBullets.length > 0 || monTrucExample) {
    blocks.push({
      id: "sheet-mon-truc",
      title: "Mon truc",
      icon: "\u{1F9E0}",
      column: "right",
      testId: "revision-sheet-mon-truc",
      className: "border-status-warning/35 bg-status-warning/10",
      content: (
        <div className="space-y-3">
          {monTrucBullets.length > 0 ? (
            <ul className="space-y-2">
              {monTrucBullets.map((line, index) => (
                <li
                  key={`sheet-tip-${index}`}
                  className="mission-drawer-tip-row border-status-warning/30 bg-status-warning/10"
                >
                  <span className="reading text-base leading-relaxed text-text-primary">
                    {renderRichTextLine(line, `sheet-tip-${index}`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {monTrucExample ? (
            <div className="rounded-radius-button border border-border-subtle bg-bg-surface/85 px-3 py-2.5">
              {monTrucExample.label ? (
                <p className="text-sm font-semibold text-text-secondary">{monTrucExample.label}</p>
              ) : null}
              <div className="space-y-1">{renderRichTextLines(monTrucExample.text, "sheet-mon-truc-example")}</div>
              {monTrucExample.explanation ? (
                <p className="pt-1 text-sm font-medium text-status-info">{monTrucExample.explanation}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    });
  }

  const microTestItems = getSheetMicroTestItems(structured).slice(0, isCompact ? 3 : 5);
  if (microTestItems.length > 0) {
    blocks.push({
      id: "sheet-je-me-teste-micro",
      title: "Je me teste (micro)",
      icon: "\u{1F52C}",
      column: "left",
      testId: "revision-sheet-je-me-teste-micro",
      content: (
        <ul className="space-y-2">
          {microTestItems.map((item, index) => (
            <li
              key={`sheet-micro-test-${index}`}
              className="flex items-start gap-2 rounded-radius-button border border-border-subtle bg-bg-surface/85 px-3 py-2"
            >
              <span aria-hidden="true" className="pt-0.5 text-status-success">
                {"\u2713"}
              </span>
              <span className="reading text-sm leading-relaxed text-text-primary">{item}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  const conjugation = structured.conjugation ?? [];
  if (conjugation.length > 0) {
    blocks.push({
      id: "sheet-conjugation",
      title: "Conjugaison",
      icon: "\u{1F9E9}",
      column: "full",
      testId: "revision-sheet-conjugation",
      content: (
        <div className="space-y-3 overflow-x-auto">
          {conjugation.map((block, index) => (
            <div
              key={`sheet-conjugation-${index}`}
              className="rounded-radius-button border border-border-subtle bg-bg-surface/88"
            >
              <div className="border-b border-border-subtle bg-bg-elevated/80 px-3 py-2">
                <p className="text-sm font-semibold text-text-primary">
                  {block.verb} - {block.tense}
                  {block.group ? ` (${block.group})` : ""}
                </p>
              </div>
              <table className="w-full min-w-[340px] text-left text-sm">
                <thead className="bg-bg-surface/80 text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Pronom</th>
                    <th className="px-3 py-2 font-semibold">Radical</th>
                    <th className="px-3 py-2 font-semibold">Terminaison</th>
                  </tr>
                </thead>
                <tbody>
                  {block.persons.map((person, personIndex) => (
                    <tr
                      key={`sheet-conjugation-row-${index}-${personIndex}`}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-3 py-2 text-text-primary">{person.pronoun}</td>
                      <td className="px-3 py-2 text-text-primary">{person.stem}</td>
                      <td className="px-3 py-2">
                        <HighlightChip tag="ending">{person.ending}</HighlightChip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ),
    });
  }

  const visualAids = structured.visualAids ?? [];
  if (visualAids.length > 0) {
    blocks.push({
      id: "sheet-visual-aids",
      title: "Schemas explicatifs",
      icon: "\u{1F4CA}",
      column: "full",
      testId: "revision-sheet-visual-aids",
      content: (
        <div className="grid gap-3 md:grid-cols-2">
          {visualAids.slice(0, isCompact ? 2 : 6).map((visualAid, index) => (
            <div
              key={`${visualAid.id}-${index}`}
              className="space-y-2 rounded-radius-button border border-border-subtle/70 bg-bg-surface/75 p-2"
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                  {getVisualAidKindLabel(visualAid.kind)}
                </p>
              </div>
              {renderVisualAid(visualAid, index, { reduceMotion: options.reduceMotion })}
            </div>
          ))}
        </div>
      ),
    });
  }

  return blocks;
}

function inferCardType(card: StoredRevisionCardViewModel): CardType | null {
  if (
    card.type === "concept" ||
    card.type === "procedure" ||
    card.type === "vocab" ||
    card.type === "comprehension"
  ) {
    return card.type;
  }

  if (
    card.content.kind === "concept" ||
    card.content.kind === "procedure" ||
    card.content.kind === "vocab" ||
    card.content.kind === "comprehension"
  ) {
    return card.content.kind;
  }

  return null;
}

function toConceptCard(card: StoredRevisionCardViewModel): ConceptCard | null {
  const type = inferCardType(card);
  if (type !== "concept") {
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
        : examples.map((example) => `<p>${example}</p>`).join("");

  return {
    type: "concept",
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
}

function toDomainCard(card: StoredRevisionCardViewModel): RevisionCard | null {
  const conceptCard = toConceptCard(card);
  if (conceptCard) {
    return conceptCard;
  }

  const procedureCard = mapStoredCardToProcedureCard(card);
  if (procedureCard) {
    return procedureCard;
  }

  const vocabCard = mapStoredCardToVocabCard(card);
  if (vocabCard) {
    return vocabCard;
  }

  return mapStoredCardToComprehensionCard(card);
}

function getCardTypeLabel(type: CardType | null): string {
  if (type === "concept") {
    return "Concept";
  }

  if (type === "procedure") {
    return "Procedure";
  }

  if (type === "vocab") {
    return "Vocabulaire";
  }

  if (type === "comprehension") {
    return "Comprehension";
  }

  return "Fiche";
}

function getCardStatusLabel(status: StoredRevisionCardViewModel["status"]): string {
  return status === "published" ? "Publiee" : "Brouillon";
}

function getHeaderSurfaceClass(cardType: CardType | null): string {
  if (cardType === "concept") {
    return "bg-gradient-to-br from-brand-primary/12 via-bg-surface/95 to-bg-surface";
  }

  if (cardType === "procedure") {
    return "bg-gradient-to-br from-status-info/12 via-bg-surface/95 to-bg-surface";
  }

  if (cardType === "vocab") {
    return "bg-gradient-to-br from-status-warning/12 via-bg-surface/95 to-bg-surface";
  }

  if (cardType === "comprehension") {
    return "bg-gradient-to-br from-status-success/12 via-bg-surface/95 to-bg-surface";
  }

  return "";
}

function getViewModeLabel(viewMode: "sheet" | "practice"): string {
  return viewMode === "sheet" ? "Mode fiche" : "Mode entrainement";
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = (): void => {
      setIsDesktop(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return isDesktop;
}

function getConceptSections(conceptCard: ConceptCard): RevisionSection[] {
  const sections: RevisionSection[] = [];
  const exercises = conceptCard.exercises.filter((exercise) => hasText(exercise));

  if (hasText(conceptCard.blocks.jeRetiens)) {
    sections.push({
      id: "je-retiens",
      title: "Je retiens",
      teaser: toTeaser(conceptCard.blocks.jeRetiens),
      testId: "revision-concept-je-retiens",
      content: <p className="reading text-lg leading-relaxed text-text-primary">{conceptCard.blocks.jeRetiens}</p>,
    });
  }

  const jeVoisText = stripHtml(conceptCard.blocks.jeVoisHtml);
  if (hasText(jeVoisText)) {
    sections.push({
      id: "je-vois",
      title: "Je vois",
      teaser: toTeaser(jeVoisText),
      testId: "revision-concept-je-vois",
      content: (
        <div
          className="reading space-y-2 text-lg leading-relaxed text-text-primary [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: conceptCard.blocks.jeVoisHtml }}
        />
      ),
    });
  }

  if (hasText(conceptCard.blocks.monTruc)) {
    sections.push({
      id: "mon-truc",
      title: "Mon truc",
      teaser: toTeaser(conceptCard.blocks.monTruc),
      testId: "revision-concept-mon-truc",
      content: <p className="reading text-base leading-relaxed text-text-primary">{conceptCard.blocks.monTruc}</p>,
    });
  }

  if (exercises.length > 0) {
    sections.push({
      id: "a-toi",
      title: "A toi !",
      teaser: toTeaser(exercises[0] ?? ""),
      testId: "revision-concept-a-toi",
      content: (
        <ol className="reading list-decimal space-y-2 pl-5 text-lg leading-relaxed text-text-primary">
          {exercises.map((exercise, index) => (
            <li key={`${exercise}-${index}`}>{exercise}</li>
          ))}
        </ol>
      ),
    });
  }

  sections.push({
    id: "je-me-teste",
    title: "Je me teste",
    teaser: conceptCard.quiz.length > 0 ? toTeaser(conceptCard.quiz[0]?.question ?? "") : "Quiz",
    testId: "revision-concept-je-me-teste",
    content: <RevisionQuiz questions={conceptCard.quiz} />, 
  });

  return sections;
}

function getProcedureSections(procedureCard: ProcedureCard): RevisionSection[] {
  const sections: RevisionSection[] = [];

  if (procedureCard.stepsHtml.length > 0) {
    sections.push({
      id: "je-retiens",
      title: "Je retiens",
      teaser: toTeaser(stripHtml(procedureCard.stepsHtml[0] ?? "")),
      testId: "revision-procedure-etapes",
      content: (
        <ol className="space-y-3" data-testid="revision-procedure-steps-list">
          {procedureCard.stepsHtml.map((stepHtml, index) => (
            <li key={`procedure-step-${index}`} className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-sm font-bold text-brand-primary">
                {index + 1}
              </span>
              <div className="flex-1 border-l border-border-subtle pl-3">
                <div
                  className="reading space-y-2 text-lg leading-relaxed text-text-primary [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: stepHtml }}
                />
              </div>
            </li>
          ))}
        </ol>
      ),
    });
  }

  if (hasText(stripHtml(procedureCard.exampleHtml))) {
    sections.push({
      id: "je-vois",
      title: "Je vois",
      teaser: toTeaser(stripHtml(procedureCard.exampleHtml)),
      testId: "revision-procedure-exemple",
      content: (
        <div
          className="reading space-y-2 text-lg leading-relaxed text-text-primary [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: procedureCard.exampleHtml }}
        />
      ),
    });
  }

  if (hasText(procedureCard.monTruc)) {
    sections.push({
      id: "mon-truc",
      title: "Mon truc",
      teaser: toTeaser(procedureCard.monTruc),
      testId: "revision-procedure-mon-truc",
      content: <p className="reading text-base leading-relaxed text-text-primary">{procedureCard.monTruc}</p>,
    });
  }

  if (procedureCard.exercises.length > 0) {
    sections.push({
      id: "a-toi",
      title: "A toi !",
      teaser: toTeaser(procedureCard.exercises[0]?.instruction ?? ""),
      testId: "revision-procedure-a-toi",
      content: (
        <ol className="space-y-3" data-testid="revision-procedure-exercises-list">
          {procedureCard.exercises.map((exercise, index) => (
            <li key={exercise.id || `procedure-exercise-${index}`} className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-status-info/15 text-sm font-bold text-status-info">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2 border-l border-border-subtle pl-3">
                <p className="reading text-lg leading-relaxed text-text-primary">{exercise.instruction}</p>
                {exercise.supportHtml ? (
                  <div
                    className="rounded-radius-button border border-border-subtle bg-bg-surface/80 px-3 py-2 text-base"
                    dangerouslySetInnerHTML={{ __html: exercise.supportHtml }}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ),
    });
  }

  sections.push({
    id: "je-me-teste",
    title: "Je me teste",
    teaser: procedureCard.quiz.length > 0 ? toTeaser(procedureCard.quiz[0]?.question ?? "") : "Quiz",
    testId: "revision-procedure-je-me-teste",
    content: <RevisionQuiz questions={procedureCard.quiz} />, 
  });

  return sections;
}

function getVocabSections(
  vocabCard: VocabCard,
  options: {
    revealedItems: Record<string, boolean>;
    onToggleItem: (itemId: string) => void;
    monTruc: string | null;
  },
): RevisionSection[] {
  const sections: RevisionSection[] = [];

  if (vocabCard.items.length > 0) {
    sections.push({
      id: "je-retiens",
      title: "Je retiens",
      teaser: toTeaser(vocabCard.items[0]?.term ?? ""),
      testId: "revision-vocab-mots",
      content: (
        <div className="space-y-3" data-testid="revision-vocab-items-list">
          <p className="text-sm font-semibold text-text-secondary">Flashcards de vocabulaire</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {vocabCard.items.map((item, index) => {
              const itemId = item.id || `vocab-item-${index}`;
              const isRevealed = options.revealedItems[itemId] === true;

              return (
                <button
                  key={itemId}
                  type="button"
                  aria-expanded={isRevealed}
                  onClick={() => {
                    options.onToggleItem(itemId);
                  }}
                  className={cn(
                    "rounded-radius-button border px-4 py-3 text-left transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                    isRevealed
                      ? "border-brand-primary/35 bg-brand-primary/10 shadow-card"
                      : "border-border-subtle bg-bg-surface/80 hover:bg-bg-surface",
                  )}
                  data-testid={`revision-vocab-item-${index}`}
                >
                  <p className="text-lg font-bold text-text-primary">{item.term}</p>
                  {isRevealed ? (
                    <p className="reading pt-1 text-base leading-relaxed text-text-primary">
                      {item.translation || "Traduction a completer"}
                    </p>
                  ) : (
                    <p className="pt-1 text-sm font-medium text-text-secondary">
                      Appuie pour reveler la traduction
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ),
    });
  }

  const itemsWithExamples = vocabCard.items.filter(
    (item) => hasText(item.exampleSentence) || hasText(item.exampleTranslation),
  );

  if (itemsWithExamples.length > 0) {
    sections.push({
      id: "je-vois",
      title: "Je vois",
      teaser: toTeaser(itemsWithExamples[0]?.exampleSentence ?? itemsWithExamples[0]?.term ?? ""),
      testId: "revision-vocab-exemples",
      content: (
        <div className="space-y-3">
          {itemsWithExamples.map((item, index) => (
            <div
              key={`vocab-example-${item.id || index}`}
              className="rounded-radius-button border border-border-subtle bg-bg-elevated/80 px-4 py-3"
            >
              <p className="text-sm font-semibold text-text-secondary">{item.term}</p>
              {hasText(item.exampleSentence) ? (
                <p className="reading text-base leading-relaxed text-text-primary">Exemple: {item.exampleSentence}</p>
              ) : null}
              {hasText(item.exampleTranslation) ? (
                <p className="reading text-sm leading-relaxed text-text-secondary">
                  Traduction: {item.exampleTranslation}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ),
    });
  }

  if (hasText(options.monTruc ?? "")) {
    sections.push({
      id: "mon-truc",
      title: "Mon truc",
      teaser: toTeaser(options.monTruc ?? ""),
      testId: "revision-vocab-mon-truc",
      content: <p className="reading text-base leading-relaxed text-text-primary">{options.monTruc}</p>,
    });
  }

  if (vocabCard.activities.length > 0) {
    sections.push({
      id: "a-toi",
      title: "A toi !",
      teaser: toTeaser(vocabCard.activities[0] ?? ""),
      testId: "revision-vocab-activites",
      content: (
        <ul className="reading list-disc space-y-2 pl-5 text-base leading-relaxed text-text-primary">
          {vocabCard.activities.map((activity, index) => (
            <li key={`${activity}-${index}`}>{activity}</li>
          ))}
        </ul>
      ),
    });
  }

  sections.push({
    id: "je-me-teste",
    title: "Je me teste",
    teaser: vocabCard.quiz.length > 0 ? toTeaser(vocabCard.quiz[0]?.question ?? "") : "Quiz",
    testId: "revision-vocab-je-me-teste",
    content: <RevisionQuiz questions={vocabCard.quiz} />, 
  });

  return sections;
}

function getComprehensionSections(
  comprehensionCard: ComprehensionCard,
  options: {
    monTruc: string | null;
    openQuestions: Record<string, boolean>;
    onToggleQuestion: (questionId: string) => void;
  },
): RevisionSection[] {
  const sections: RevisionSection[] = [];

  if (hasText(comprehensionCard.text)) {
    sections.push({
      id: "je-retiens",
      title: "Je retiens",
      teaser: toTeaser(comprehensionCard.text),
      testId: "revision-comprehension-texte",
      content: (
        <p className="reading whitespace-pre-line text-lg leading-relaxed text-text-primary">{comprehensionCard.text}</p>
      ),
    });
  }

  if (comprehensionCard.questions.length > 0 || hasText(comprehensionCard.textTranslation ?? "")) {
    sections.push({
      id: "je-vois",
      title: "Je vois",
      teaser: hasText(comprehensionCard.textTranslation ?? "")
        ? toTeaser(comprehensionCard.textTranslation ?? "")
        : toTeaser(comprehensionCard.questions[0]?.question ?? ""),
      testId: "revision-comprehension-questions",
      content: (
        <div className="space-y-4">
          {hasText(comprehensionCard.textTranslation ?? "") ? (
            <div className="rounded-radius-button border border-border-subtle bg-bg-elevated/80 px-3 py-2">
              <p className="reading text-sm leading-relaxed text-text-secondary">
                Traduction: {comprehensionCard.textTranslation}
              </p>
            </div>
          ) : null}

          {comprehensionCard.questions.map((question, questionIndex) => {
            const questionId = question.id || `comprehension-question-${questionIndex}`;
            const isOpen = options.openQuestions[questionId] === true;

            return (
              <div
                key={questionId}
                className="rounded-radius-button border border-border-subtle bg-bg-surface/80"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    options.onToggleQuestion(questionId);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                >
                  <p className="text-base font-semibold text-text-primary">{question.question}</p>
                  <span className="text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
                    {isOpen ? "Masquer" : "Voir"}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-border-subtle px-3 py-3">
                    <ul className="reading list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-secondary">
                      {question.choices.map((choice, choiceIndex) => (
                        <li key={`${questionId}-choice-${choiceIndex}`}>{choice}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ),
    });
  }

  if (hasText(options.monTruc ?? "")) {
    sections.push({
      id: "mon-truc",
      title: "Mon truc",
      teaser: toTeaser(options.monTruc ?? ""),
      testId: "revision-comprehension-mon-truc",
      content: <p className="reading text-base leading-relaxed text-text-primary">{options.monTruc}</p>,
    });
  }

  if (comprehensionCard.openQuestions.length > 0) {
    sections.push({
      id: "a-toi",
      title: "A toi !",
      teaser: toTeaser(comprehensionCard.openQuestions[0] ?? ""),
      testId: "revision-comprehension-open-questions",
      content: (
        <ol className="reading list-decimal space-y-2 pl-5 text-base leading-relaxed text-text-primary">
          {comprehensionCard.openQuestions.map((question, index) => (
            <li key={`${question}-${index}`}>{question}</li>
          ))}
        </ol>
      ),
    });
  }

  sections.push({
    id: "je-me-teste",
    title: "Je me teste",
    teaser:
      comprehensionCard.quiz.length > 0 ? toTeaser(comprehensionCard.quiz[0]?.question ?? "") : "Quiz",
    testId: "revision-comprehension-je-me-teste",
    content: <RevisionQuiz questions={comprehensionCard.quiz} />, 
  });

  return sections;
}

function getFallbackSections(
  card: StoredRevisionCardViewModel,
  fallbackQuizQuestions: RevisionQuizQuestion[],
): RevisionSection[] {
  const sections: RevisionSection[] = [];

  if (hasText(card.content.summary)) {
    sections.push({
      id: "je-retiens",
      title: "Je retiens",
      teaser: toTeaser(card.content.summary),
      testId: "revision-summary-section",
      content: <p className="reading text-lg leading-relaxed text-text-primary">{card.content.summary}</p>,
    });
  }

  if (card.content.examples.length > 0) {
    sections.push({
      id: "je-vois",
      title: "Je vois",
      teaser: toTeaser(card.content.examples[0] ?? ""),
      testId: "revision-examples-section",
      content: (
        <div className="space-y-2" data-testid="revision-examples-list">
          {card.content.examples.map((example, index) => (
            <div
              key={`${example}-${index}`}
              className="rounded-radius-button border border-border-subtle bg-bg-surface/80 px-4 py-3"
            >
              <p className="reading text-lg leading-relaxed text-text-primary">{example}</p>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (card.content.tips.length > 0) {
    sections.push({
      id: "mon-truc",
      title: "Mon truc",
      teaser: toTeaser(card.content.tips[0] ?? ""),
      testId: "revision-tips-section",
      content: (
        <ul className="reading list-disc space-y-2 pl-5 text-base leading-relaxed text-text-primary" data-testid="revision-tips-list">
          {card.content.tips.map((tip, index) => (
            <li key={`${tip}-${index}`}>{tip}</li>
          ))}
        </ul>
      ),
    });
  }

  if (card.content.steps.length > 0) {
    sections.push({
      id: "a-toi",
      title: "A toi !",
      teaser: toTeaser(card.content.steps[0] ?? ""),
      testId: "revision-steps-section",
      content: (
        <ol className="reading list-decimal space-y-2 pl-5 text-lg leading-relaxed text-text-primary" data-testid="revision-steps-list">
          {card.content.steps.map((step, index) => (
            <li key={`${step}-${index}`}>{step}</li>
          ))}
        </ol>
      ),
    });
  }

  sections.push({
    id: "je-me-teste",
    title: "Je me teste",
    teaser: fallbackQuizQuestions.length > 0 ? toTeaser(fallbackQuizQuestions[0]?.question ?? "") : "Quiz",
    testId: "revision-generic-je-me-teste",
    content: <RevisionQuiz questions={fallbackQuizQuestions} />, 
  });

  return sections;
}

function getSectionsForCard(args: {
  card: StoredRevisionCardViewModel;
  domainCard: RevisionCard | null;
  fallbackQuizQuestions: RevisionQuizQuestion[];
  revealedVocabItems: Record<string, boolean>;
  onToggleVocabItem: (itemId: string) => void;
  revealedComprehensionQuestions: Record<string, boolean>;
  onToggleComprehensionQuestion: (questionId: string) => void;
}): RevisionSection[] {
  const {
    card,
    domainCard,
    fallbackQuizQuestions,
    revealedVocabItems,
    onToggleVocabItem,
    revealedComprehensionQuestions,
    onToggleComprehensionQuestion,
  } = args;

  if (domainCard?.type === "concept") {
    return getConceptSections(domainCard);
  }

  if (domainCard?.type === "procedure") {
    return getProcedureSections(domainCard);
  }

  if (domainCard?.type === "vocab") {
    return getVocabSections(domainCard, {
      revealedItems: revealedVocabItems,
      onToggleItem: onToggleVocabItem,
      monTruc: card.content.tips[0] ?? null,
    });
  }

  if (domainCard?.type === "comprehension") {
    return getComprehensionSections(domainCard, {
      monTruc: card.content.tips[0] ?? null,
      openQuestions: revealedComprehensionQuestions,
      onToggleQuestion: onToggleComprehensionQuestion,
    });
  }

  return getFallbackSections(card, fallbackQuizQuestions);
}

interface PracticeEncouragement {
  title: string;
  subtitle: string;
}

function getPracticeEncouragement(completedCount: number, totalSteps: number): PracticeEncouragement | null {
  if (totalSteps <= 0) {
    return null;
  }

  if (completedCount >= totalSteps) {
    return {
      title: "Bravo, parcours termine !",
      subtitle: "Tu peux refaire un mini test ou revenir a la fiche.",
    };
  }

  if (completedCount <= 1) {
    return {
      title: "Bon debut !",
      subtitle: "Continue pas a pas, tu progresses deja.",
    };
  }

  if (completedCount === totalSteps - 1) {
    return {
      title: "Presque fini !",
      subtitle: "Encore une etape pour terminer ton entrainement.",
    };
  }

  return {
    title: "Tu avances bien !",
    subtitle: "Garde le rythme jusqu'au quiz final.",
  };
}

function getPracticeStepTip(sectionId: string | null): string | null {
  if (sectionId === "a-toi") {
    return "Astuce: commence sans regarder la correction.";
  }

  if (sectionId === "mini-test-rapide") {
    return "Mini defi: fais ces questions d'un seul trait.";
  }

  if (sectionId === "je-me-teste") {
    return "Lis chaque choix calmement avant de verifier.";
  }

  return null;
}

function toChildFriendlyExercisesError(rawError: string | null | undefined): string {
  const normalized = rawError?.toLowerCase() ?? "";
  if (!normalized) {
    return "Oups, je n'ai pas pu preparer de nouveaux exercices pour le moment.";
  }

  if (
    normalized.includes("openai") ||
    normalized.includes("schema") ||
    normalized.includes("invalid") ||
    normalized.includes("http_400")
  ) {
    return "Oups, je n'ai pas pu preparer les exercices cette fois. Reessaie dans un instant.";
  }

  if (normalized.includes("fetch") || normalized.includes("network") || normalized.includes("timeout")) {
    return "La connexion semble lente. Reessaie dans quelques secondes.";
  }

  return rawError ?? "Oups, je n'ai pas pu preparer de nouveaux exercices pour le moment.";
}

function getPracticeStageLabel(completedCount: number, totalSteps: number): "Maintenant" | "Ensuite" | "Fini" {
  if (totalSteps <= 0) {
    return "Maintenant";
  }

  if (completedCount >= totalSteps) {
    return "Fini";
  }

  return completedCount <= 1 ? "Maintenant" : "Ensuite";
}

function getPracticeRecapPoints(
  structured: StructuredRevisionContent | null,
  domainCard: RevisionCard | null,
  fallbackQuizQuestions: RevisionQuizQuestion[],
): string[] {
  const recap: string[] = [];

  if (structured) {
    recap.push(
      ...getJeRetiensLines(structured)
        .map((line) => toPlainLineText(line))
        .filter((line) => hasText(line))
        .slice(0, 2),
    );

    const monTrucLine = structured.monTruc?.bullets?.[0];
    if (monTrucLine) {
      const tip = toPlainLineText(monTrucLine);
      if (hasText(tip)) {
        recap.push(tip);
      }
    }
  } else if (domainCard?.type === "concept") {
    if (hasText(domainCard.blocks.jeRetiens)) {
      recap.push(domainCard.blocks.jeRetiens);
    }
    if (hasText(domainCard.blocks.monTruc)) {
      recap.push(domainCard.blocks.monTruc);
    }
  } else if (domainCard?.type === "procedure") {
    const firstStep = domainCard.stepsHtml[0];
    if (firstStep) {
      const stepText = stripHtml(firstStep);
      if (hasText(stepText)) {
        recap.push(stepText);
      }
    }
    if (hasText(domainCard.monTruc)) {
      recap.push(domainCard.monTruc);
    }
  } else if (domainCard?.type === "vocab") {
    const firstItem = domainCard.items[0];
    if (firstItem) {
      const firstText = hasText(firstItem.translation)
        ? `${firstItem.term}: ${firstItem.translation}`
        : firstItem.term;
      recap.push(firstText);
    }
    const firstActivity = domainCard.activities[0];
    if (hasText(firstActivity)) {
      recap.push(firstActivity);
    }
  } else if (domainCard?.type === "comprehension") {
    if (hasText(domainCard.text)) {
      recap.push(domainCard.text);
    }
    const firstOpen = domainCard.openQuestions[0];
    if (hasText(firstOpen)) {
      recap.push(firstOpen);
    }
  } else {
    const firstStep = fallbackQuizQuestions[0]?.question;
    if (hasText(firstStep)) {
      recap.push(firstStep);
    }
  }

  return recap
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, index, array) => hasText(line) && array.indexOf(line) === index)
    .slice(0, 3);
}

export function RevisionCardView({
  card,
  onMarkReviewedAction = noopMarkReviewedAction,
  onGenerateExtraExercisesAction,
  initialActionState = DEFAULT_ACTION_STATE,
  showHeader = true,
  showMarkReviewedControls = true,
}: RevisionCardViewProps): React.JSX.Element {
  const [actionState, submitAction, isPending] = React.useActionState(onMarkReviewedAction, initialActionState);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [optimisticDone, setOptimisticDone] = React.useState(false);
  const [revealedVocabItems, setRevealedVocabItems] = React.useState<Record<string, boolean>>({});
  const [revealedComprehensionQuestions, setRevealedComprehensionQuestions] = React.useState<
    Record<string, boolean>
  >({});
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<"sheet" | "practice">("sheet");
  const [sheetViewMode, setSheetViewMode] = React.useState<SheetViewMode>("enriched");
  const [guidanceMode, setGuidanceMode] = React.useState<GuidanceMode>("normal");
  const [motionMode, setMotionMode] = React.useState<MotionMode>("full");
  const [generatedExercises, setGeneratedExercises] = React.useState<ExercisesPayload | null>(null);
  const [generateExercisesError, setGenerateExercisesError] = React.useState<string | null>(null);
  const [pendingPracticeJumpTarget, setPendingPracticeJumpTarget] = React.useState<
    "mini-test-rapide" | "je-me-teste" | null
  >(null);
  const [visitedPracticeSectionIds, setVisitedPracticeSectionIds] = React.useState<string[]>([]);
  const [isGeneratingExtraExercises, startGenerateExtraExercisesTransition] = React.useTransition();
  const hasHydratedUxPrefs = React.useRef(false);
  const isDesktop = useIsDesktop();

  React.useEffect(() => {
    if (!hasSubmitted || isPending) {
      return;
    }

    if (!actionState.success) {
      setOptimisticDone(false);
    }
  }, [actionState.success, hasSubmitted, isPending]);

  const isReviewed = optimisticDone || actionState.success;

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(REVISION_UX_PREFS_STORAGE_KEY);
      if (storedValue) {
        const parsed = JSON.parse(storedValue) as Partial<RevisionUxPreferences>;
        if (parsed.guidanceMode === "normal" || parsed.guidanceMode === "guided") {
          setGuidanceMode(parsed.guidanceMode);
        }
        if (parsed.motionMode === "full" || parsed.motionMode === "reduced") {
          setMotionMode(parsed.motionMode);
        }
        if (parsed.sheetViewMode === "compact" || parsed.sheetViewMode === "enriched") {
          setSheetViewMode(parsed.sheetViewMode);
        }
      } else if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMotionMode("reduced");
      }
    } catch {
      // Ignore localStorage failures; defaults are safe.
    } finally {
      hasHydratedUxPrefs.current = true;
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedUxPrefs.current) {
      return;
    }

    const payload: RevisionUxPreferences = {
      guidanceMode,
      motionMode,
      sheetViewMode,
    };

    try {
      window.localStorage.setItem(REVISION_UX_PREFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore persistence failures to avoid blocking child flow.
    }
  }, [guidanceMode, motionMode, sheetViewMode]);

  const domainCard = React.useMemo(() => toDomainCard(card), [card]);
  const cardType = domainCard?.type ?? inferCardType(card);
  const structuredContent = React.useMemo(() => {
    const mappedStructured = mapStoredCardToStructuredRevisionContent(card);
    if (!mappedStructured) {
      return null;
    }

    const runtimeBullets = normalizeSheetList(getRuntimeJeRetiensBullets(card), 5);
    if (runtimeBullets.length === 0) {
      return mappedStructured;
    }

    return {
      ...mappedStructured,
      jeRetiens: {
        ...(mappedStructured.jeRetiens?.title ? { title: mappedStructured.jeRetiens.title } : {}),
        items: runtimeBullets,
      },
    };
  }, [card]);
  const sheetBlocks = React.useMemo(
    () =>
      structuredContent
        ? getSheetBlocks(structuredContent, { viewMode: sheetViewMode, reduceMotion: motionMode === "reduced" })
        : [],
    [structuredContent, sheetViewMode, motionMode],
  );
  const fallbackQuizQuestions = React.useMemo(
    () => mapStoredQuizToRevisionQuizQuestions(card.content.quiz),
    [card.content.quiz],
  );

  const sections = React.useMemo(() => {
    const baseSections = getSectionsForCard({
      card,
      domainCard,
      fallbackQuizQuestions,
      revealedVocabItems,
      onToggleVocabItem: (itemId) => {
        setRevealedVocabItems((current) => ({
          ...current,
          [itemId]: !current[itemId],
        }));
      },
      revealedComprehensionQuestions,
      onToggleComprehensionQuestion: (questionId) => {
        setRevealedComprehensionQuestions((current) => ({
          ...current,
          [questionId]: !current[questionId],
        }));
      },
    });

    if (!generatedExercises) {
      return baseSections;
    }

    const nextSections = [...baseSections];
    const quizSectionIndex = nextSections.findIndex((section) => section.id === "je-me-teste");
    if (quizSectionIndex >= 0) {
      const currentQuizSection = nextSections[quizSectionIndex];
      if (currentQuizSection) {
        const nextTeaser =
          generatedExercises.quiz.length > 0
            ? toTeaser(generatedExercises.quiz[0]?.question ?? "")
            : currentQuizSection.teaser;
        nextSections[quizSectionIndex] = {
          ...currentQuizSection,
          ...(nextTeaser ? { teaser: nextTeaser } : {}),
          content: <RevisionQuiz questions={generatedExercises.quiz} />,
        };
      }
    }

    if (generatedExercises.miniTest.length > 0) {
      const miniTestSection: RevisionSection = {
        id: "mini-test-rapide",
        title: "Mini test rapide",
        teaser: toTeaser(generatedExercises.miniTest[0] ?? ""),
        testId: "revision-mini-test-section",
        content: (
          <ol className="reading list-decimal space-y-2 pl-5 text-base leading-relaxed text-text-primary">
            {generatedExercises.miniTest.map((exercise, index) => (
              <li key={`mini-test-${index}`}>{exercise}</li>
            ))}
          </ol>
        ),
      };
      if (!nextSections.some((section) => section.id === miniTestSection.id)) {
        const insertAt = quizSectionIndex >= 0 ? quizSectionIndex : nextSections.length;
        nextSections.splice(insertAt, 0, miniTestSection);
      }
    }

    return nextSections;
  }, [
    card,
    domainCard,
    fallbackQuizQuestions,
    revealedVocabItems,
    revealedComprehensionQuestions,
    generatedExercises,
  ]);

  const sectionsSignature = React.useMemo(
    () => sections.map((section) => section.id).join("|"),
    [sections],
  );
  const sectionIds = React.useMemo(
    () =>
      sectionsSignature.length > 0
        ? sectionsSignature.split("|").filter((value) => value.length > 0)
        : [],
    [sectionsSignature],
  );
  const practiceSections = React.useMemo(() => {
    const sectionOrder = ["a-toi", "mini-test-rapide", "je-me-teste"];
    const byId = new Map(sections.map((section) => [section.id, section]));
    const filtered = sectionOrder
      .map((sectionId) => byId.get(sectionId))
      .filter((section): section is RevisionSection => Boolean(section));

    return filtered;
  }, [sections]);

  React.useEffect(() => {
    setActiveSectionIndex(0);
    setRevealedVocabItems({});
    setRevealedComprehensionQuestions({});
    setGeneratedExercises(null);
    setGenerateExercisesError(null);
    setPendingPracticeJumpTarget(null);
    setVisitedPracticeSectionIds([]);
    setViewMode("sheet");
  }, [card.id, card.updatedAt]);

  React.useEffect(() => {
    if (sectionIds.length === 0) {
      return;
    }

    const initialState: Record<string, boolean> = {};
    sectionIds.forEach((sectionId, index) => {
      initialState[sectionId] = isDesktop && index === 0 && sectionId !== "je-me-teste";
    });

    setExpandedSections(initialState);
  }, [card.id, card.updatedAt, isDesktop, sectionIds]);

  React.useEffect(() => {
    setActiveSectionIndex((current) => {
      if (practiceSections.length === 0) {
        return 0;
      }

      if (current < practiceSections.length) {
        return current;
      }

      return practiceSections.length - 1;
    });
  }, [practiceSections.length]);

  React.useEffect(() => {
    setVisitedPracticeSectionIds((current) =>
      current.filter((sectionId) => practiceSections.some((section) => section.id === sectionId)),
    );
  }, [practiceSections]);

  const setActiveStep = React.useCallback(
    (nextIndex: number) => {
      if (practiceSections.length === 0) {
        return;
      }

      const clampedIndex = Math.max(0, Math.min(nextIndex, practiceSections.length - 1));
      const nextSection = practiceSections[clampedIndex];
      if (!nextSection) {
        return;
      }

      setActiveSectionIndex(clampedIndex);
      setExpandedSections((current) => ({
        ...current,
        [nextSection.id]: current[nextSection.id] ?? (isDesktop && nextSection.id !== "je-me-teste"),
      }));
    },
    [practiceSections, isDesktop],
  );

  const activeSection = practiceSections[activeSectionIndex] ?? null;

  React.useEffect(() => {
    if (viewMode !== "practice") {
      return;
    }

    if (!activeSection) {
      return;
    }

    setVisitedPracticeSectionIds((current) =>
      current.includes(activeSection.id) ? current : [...current, activeSection.id],
    );
  }, [viewMode, activeSection]);

  const toggleActiveSection = React.useCallback(() => {
    if (!activeSection) {
      return;
    }

    setExpandedSections((current) => ({
      ...current,
      [activeSection.id]: !current[activeSection.id],
    }));
  }, [activeSection]);

  const scrollToSection = React.useCallback((sectionId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    let attempts = 0;
    const maxAttempts = 4;

    const tryScroll = (): void => {
      const target = document.getElementById(`revision-section-${sectionId}`);
      if (target) {
        if (typeof target.scrollIntoView === "function") {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      attempts += 1;
      if (attempts <= maxAttempts) {
        window.setTimeout(tryScroll, 50);
      }
    };

    tryScroll();
  }, []);

  const jumpToQuiz = React.useCallback(() => {
    setViewMode("practice");
    setPendingPracticeJumpTarget("je-me-teste");
  }, []);

  React.useEffect(() => {
    if (!pendingPracticeJumpTarget || viewMode !== "practice") {
      return;
    }

    const requestedIndex = practiceSections.findIndex((section) => section.id === pendingPracticeJumpTarget);
    const fallbackQuizIndex = practiceSections.findIndex((section) => section.id === "je-me-teste");
    const targetIndex = requestedIndex >= 0 ? requestedIndex : fallbackQuizIndex;
    if (targetIndex < 0) {
      setPendingPracticeJumpTarget(null);
      return;
    }

    const targetSection = practiceSections[targetIndex];
    if (!targetSection) {
      setPendingPracticeJumpTarget(null);
      return;
    }

    setActiveStep(targetIndex);
    setExpandedSections((current) => ({
      ...current,
      [targetSection.id]: true,
    }));
    scrollToSection(targetSection.id);
    setPendingPracticeJumpTarget(null);
  }, [pendingPracticeJumpTarget, viewMode, practiceSections, setActiveStep, scrollToSection]);

  const handleGenerateExtraExercises = React.useCallback(() => {
    if (!onGenerateExtraExercisesAction) {
      return;
    }

    setGenerateExercisesError(null);
    startGenerateExtraExercisesTransition(() => {
      void (async () => {
        try {
          const result = await onGenerateExtraExercisesAction({ cardId: card.id });
          if (!result.success || !result.exercises) {
            setGenerateExercisesError(toChildFriendlyExercisesError(result.error));
            return;
          }

          setGeneratedExercises(result.exercises);
          setViewMode("practice");
          setPendingPracticeJumpTarget(
            result.exercises.miniTest.length > 0 ? "mini-test-rapide" : "je-me-teste",
          );
        } catch {
          setGenerateExercisesError(toChildFriendlyExercisesError("network"));
        }
      })();
    });
  }, [card.id, onGenerateExtraExercisesAction, startGenerateExtraExercisesTransition]);

  const headerGoal = domainCard?.goal ?? card.goal ?? card.content.summary ?? "";
  const sheetDefinition = React.useMemo(
    () => (structuredContent?.definition ? toPlainLineText(structuredContent.definition) : ""),
    [structuredContent],
  );
  const sheetLeftBlocks = React.useMemo(
    () => sheetBlocks.filter((block) => block.column === "left"),
    [sheetBlocks],
  );
  const sheetRightBlocks = React.useMemo(
    () => sheetBlocks.filter((block) => block.column === "right"),
    [sheetBlocks],
  );
  const sheetFullBlocks = React.useMemo(
    () => sheetBlocks.filter((block) => block.column === "full"),
    [sheetBlocks],
  );
  const generatedExercisesSummary = React.useMemo(() => {
    if (!generatedExercises) {
      return null;
    }

    const quizCount = generatedExercises.quiz.length;
    const miniTestCount = generatedExercises.miniTest.length;
    if (quizCount <= 0 && miniTestCount <= 0) {
      return null;
    }

    return {
      quizCount,
      miniTestCount,
    };
  }, [generatedExercises]);
  const visitedPracticeCount = React.useMemo(
    () =>
      practiceSections.reduce(
        (count, section) => (visitedPracticeSectionIds.includes(section.id) ? count + 1 : count),
        0,
      ),
    [practiceSections, visitedPracticeSectionIds],
  );
  const practiceStageLabel = React.useMemo(
    () => getPracticeStageLabel(visitedPracticeCount, practiceSections.length),
    [visitedPracticeCount, practiceSections.length],
  );
  const practiceEncouragement = React.useMemo(
    () => getPracticeEncouragement(visitedPracticeCount, practiceSections.length),
    [visitedPracticeCount, practiceSections.length],
  );
  const hasCompletedPracticeFlow = practiceSections.length > 0 && visitedPracticeCount === practiceSections.length;
  const isReducedMotion = motionMode === "reduced";
  const maxSelectablePracticeIndex = React.useMemo(() => {
    if (guidanceMode !== "guided") {
      return undefined;
    }

    return Math.max(0, Math.min(practiceSections.length - 1, visitedPracticeCount));
  }, [guidanceMode, practiceSections.length, visitedPracticeCount]);
  const currentPracticeStepTip = React.useMemo(
    () => getPracticeStepTip(activeSection?.id ?? null),
    [activeSection],
  );
  const practiceRecapPoints = React.useMemo(
    () => getPracticeRecapPoints(structuredContent, domainCard, fallbackQuizQuestions),
    [structuredContent, domainCard, fallbackQuizQuestions],
  );
  const canGenerateExtraExercises = Boolean(
    onGenerateExtraExercisesAction &&
      structuredContent &&
      practiceSections.some((section) => section.id === "je-me-teste"),
  );
  const handleRestartPractice = React.useCallback(() => {
    setGenerateExercisesError(null);
    setVisitedPracticeSectionIds([]);
    setActiveStep(0);
  }, [setActiveStep]);

  return (
    <main
      className={cn(
        "w-full pb-8 pt-5 md:pt-8",
        isReducedMotion ? "[&_*]:!transition-none [&_*]:!duration-0 [&_*]:!animate-none" : "",
      )}
      data-testid="revision-card-view"
      data-guidance-mode={guidanceMode}
      data-motion-mode={motionMode}
      data-sheet-view-mode={sheetViewMode}
    >
      <article className="space-y-4">
        {showHeader && viewMode !== "sheet" ? (
          <Card
            className={cn("mission-panel-surface", getHeaderSurfaceClass(cardType))}
            data-testid={`revision-${cardType ?? "generic"}-header`}
          >
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{card.subject}</Badge>
                {card.level ? <Badge variant="neutral">{card.level}</Badge> : null}
                <Badge variant="neutral">{getCardTypeLabel(cardType)}</Badge>
                <Badge variant={card.status === "published" ? "success" : "warning"}>
                  {getCardStatusLabel(card.status)}
                </Badge>
                <Badge variant="neutral">{getViewModeLabel(viewMode)}</Badge>
              </div>

              <CardTitle className="text-3xl leading-tight md:text-4xl">{card.title}</CardTitle>

              {hasText(headerGoal) ? (
                <p className="reading text-base leading-relaxed text-text-secondary">{headerGoal}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setViewMode("sheet");
                  }}
                  data-testid="revision-practice-to-sheet"
                >
                  Voir la fiche
                </Button>
                {practiceSections.some((section) => section.id === "je-me-teste") ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={jumpToQuiz}
                    data-testid="revision-jump-to-quiz"
                  >
                    Aller a Je me teste
                  </Button>
                ) : null}
              </div>
            </CardHeader>
          </Card>
        ) : null}

        <Card className="mission-panel-surface" data-testid="revision-ux-preferences">
          <CardContent className="space-y-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Personnalise ton experience
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">Guidage</p>
                <div className="inline-flex items-center gap-1 rounded-radius-pill border border-border-subtle bg-bg-surface/85 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={guidanceMode === "normal" ? "primary" : "secondary"}
                    onClick={() => {
                      setGuidanceMode("normal");
                    }}
                    data-testid="revision-pref-guidance-normal"
                  >
                    Normal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={guidanceMode === "guided" ? "primary" : "secondary"}
                    onClick={() => {
                      setGuidanceMode("guided");
                    }}
                    data-testid="revision-pref-guidance-guided"
                  >
                    Guide
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">Animations</p>
                <div className="inline-flex items-center gap-1 rounded-radius-pill border border-border-subtle bg-bg-surface/85 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={motionMode === "full" ? "primary" : "secondary"}
                    onClick={() => {
                      setMotionMode("full");
                    }}
                    data-testid="revision-pref-motion-full"
                  >
                    Standard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={motionMode === "reduced" ? "primary" : "secondary"}
                    onClick={() => {
                      setMotionMode("reduced");
                    }}
                    data-testid="revision-pref-motion-reduced"
                  >
                    Reduites
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === "sheet" ? (
          sheetBlocks.length > 0 ? (
            <Card className="mission-card-surface mission-drawer-shell overflow-hidden" data-testid="revision-sheet-mode">
              <CardHeader className="space-y-4 border-b border-border-subtle/80 bg-gradient-to-br from-brand-primary/10 via-bg-surface/95 to-bg-surface px-4 pb-5 pt-5 md:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{card.subject}</Badge>
                  {card.level ? <Badge variant="neutral">{card.level}</Badge> : null}
                  <Badge variant="neutral">{getCardTypeLabel(cardType)}</Badge>
                  <Badge variant={card.status === "published" ? "success" : "warning"}>
                    {getCardStatusLabel(card.status)}
                  </Badge>
                  <Badge variant="neutral">{getViewModeLabel(viewMode)}</Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-[clamp(1.7rem,2.2vw,2.4rem)] leading-tight">{card.title}</CardTitle>
                  {hasText(sheetDefinition) ? (
                    <p
                      className="reading max-w-3xl overflow-hidden text-base leading-relaxed text-text-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                      data-testid="revision-sheet-definition"
                    >
                      {sheetDefinition}
                    </p>
                  ) : hasText(headerGoal) ? (
                    <p className="reading max-w-3xl text-base leading-relaxed text-text-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                      {headerGoal}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setViewMode("practice");
                    }}
                    data-testid="revision-sheet-to-practice"
                  >
                    Je m&apos;entraine
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={jumpToQuiz} data-testid="revision-jump-to-quiz">
                    Aller a Je me teste
                  </Button>
                </div>
                <div
                  className="inline-flex w-fit items-center gap-1 rounded-radius-pill border border-border-subtle bg-bg-surface/85 p-1"
                  data-testid="revision-sheet-view-toggle"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={sheetViewMode === "compact" ? "primary" : "secondary"}
                    onClick={() => {
                      setSheetViewMode("compact");
                    }}
                    data-testid="revision-sheet-view-compact"
                  >
                    Lecture compacte
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sheetViewMode === "enriched" ? "primary" : "secondary"}
                    onClick={() => {
                      setSheetViewMode("enriched");
                    }}
                    data-testid="revision-sheet-view-enriched"
                  >
                    Visuel enrichi
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4 md:px-6 md:py-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4" data-testid="revision-sheet-column-left">
                    {sheetLeftBlocks.map((block) => (
                      <Card
                        key={block.id}
                        className={cn("mission-drawer-surface border-border-subtle/80", block.className)}
                        data-testid={block.testId}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <span aria-hidden="true">{block.icon}</span>
                            <span>{block.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>{block.content}</CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-4" data-testid="revision-sheet-column-right">
                    {sheetRightBlocks.map((block) => (
                      <Card
                        key={block.id}
                        className={cn("mission-drawer-surface border-border-subtle/80", block.className)}
                        data-testid={block.testId}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <span aria-hidden="true">{block.icon}</span>
                            <span>{block.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>{block.content}</CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                {sheetFullBlocks.length > 0 ? (
                  <div className="space-y-4" data-testid="revision-sheet-full-width">
                    {sheetFullBlocks.map((block) => (
                      <Card
                        key={block.id}
                        className={cn("mission-drawer-surface border-border-subtle/80", block.className)}
                        data-testid={block.testId}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <span aria-hidden="true">{block.icon}</span>
                            <span>{block.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>{block.content}</CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="mission-panel-surface" data-testid="revision-sheet-empty">
              <CardContent className="space-y-3 p-4">
                <p className="reading text-base leading-relaxed text-text-secondary">
                  Cette fiche n&apos;a pas encore de contenu structure. Passe en mode pratique pour continuer.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setViewMode("practice");
                  }}
                  data-testid="revision-sheet-to-practice"
                >
                  Ouvrir Je m&apos;entraine
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="space-y-3" data-testid="revision-practice-mode">
            {practiceSections.length > 1 ? (
              <Card className="mission-panel-surface">
                <CardContent className="space-y-1 p-4 md:p-5">
                  <StepSectionsNavigator
                    sections={practiceSections.map((section) => ({
                      id: section.id,
                      title: section.title,
                    }))}
                    activeIndex={activeSectionIndex}
                    isDesktop={isDesktop}
                    completedSectionIds={visitedPracticeSectionIds}
                    showCompletionProgress
                    completionLabel="etapes vues"
                    reduceMotion={isReducedMotion}
                    {...(maxSelectablePracticeIndex !== undefined
                      ? { maxSelectableIndex: maxSelectablePracticeIndex }
                      : {})}
                    onSelect={(index) => {
                      setActiveStep(index);
                    }}
                    onPrevious={() => {
                      setActiveStep(activeSectionIndex - 1);
                    }}
                    onNext={() => {
                      setActiveStep(activeSectionIndex + 1);
                    }}
                  />
                </CardContent>
              </Card>
            ) : null}

            {guidanceMode === "guided" ? (
              <Card className="mission-panel-surface" data-testid="revision-guided-mode-note">
                <CardContent className="py-3">
                  <p className="text-sm font-semibold text-text-primary">
                    Mode guide actif: avance etape par etape pour garder le rythme.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {currentPracticeStepTip ? (
              <Card className="mission-panel-surface" data-testid="revision-practice-step-tip">
                <CardContent className="py-3">
                  <p className="text-sm font-semibold text-text-primary">{currentPracticeStepTip}</p>
                </CardContent>
              </Card>
            ) : null}

            {practiceSections.length > 0 ? (
              <Card className="mission-panel-surface" data-testid="revision-practice-progress-summary">
                <CardContent className="space-y-1 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary" data-testid="revision-practice-stage-label">
                    Phase: {practiceStageLabel}
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    Parcours: {visitedPracticeCount} / {practiceSections.length} etapes vues
                  </p>
                  {practiceEncouragement ? (
                    <>
                      <p className="text-sm font-semibold text-brand-primary" data-testid="revision-practice-feedback-title">
                        {practiceEncouragement.title}
                      </p>
                      <p className="text-sm text-text-secondary">{practiceEncouragement.subtitle}</p>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card className="mission-panel-surface">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <p className="text-sm font-semibold text-text-secondary" data-testid="revision-extra-exercises-hint">
                  {canGenerateExtraExercises
                    ? "Genere de nouveaux exercices bases uniquement sur cette fiche."
                    : "Nouveaux exercices indisponibles pour cette fiche."}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateExtraExercises}
                  loading={isGeneratingExtraExercises}
                  disabled={!canGenerateExtraExercises}
                  data-testid="revision-generate-extra-exercises"
                >
                  Nouveaux exercices
                </Button>
              </CardContent>
            </Card>

            {generatedExercisesSummary ? (
              <Card className="border-status-success/40 bg-status-success/10" data-testid="revision-extra-exercises-success">
                <CardContent className="space-y-1 py-3">
                  <p className="text-sm font-semibold text-status-success">Super, de nouveaux exercices sont prets !</p>
                  <p className="text-sm text-text-secondary">
                    {generatedExercisesSummary.quizCount > 0
                      ? `${generatedExercisesSummary.quizCount} question(s) de quiz`
                      : "Aucune question de quiz"}{" "}
                    -{" "}
                    {generatedExercisesSummary.miniTestCount > 0
                      ? `${generatedExercisesSummary.miniTestCount} mini test(s)`
                      : "Aucun mini test"}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {generateExercisesError ? (
              <Card className="border-status-error/40">
                <CardContent className="space-y-3 py-3">
                  <p className="text-sm font-semibold text-status-error">{generateExercisesError}</p>
                  <p className="pt-1 text-sm text-text-secondary">
                    Tu peux reessayer maintenant ou continuer avec les exercices deja affiches.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleGenerateExtraExercises}
                      loading={isGeneratingExtraExercises}
                      disabled={!canGenerateExtraExercises}
                      data-testid="revision-generate-extra-exercises-retry"
                    >
                      Reessayer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setViewMode("sheet");
                      }}
                      data-testid="revision-generate-extra-exercises-back-to-sheet"
                    >
                      Revoir la fiche
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {hasCompletedPracticeFlow ? (
              <Card className="border-status-success/40 bg-status-success/10" data-testid="revision-practice-completion">
                <CardContent className="space-y-3 py-3">
                  <p className="text-sm font-semibold text-status-success">
                    Bravo, tu as termine ton entrainement.
                  </p>
                  <p className="text-sm text-text-secondary">
                    Tu as revise {practiceSections.length} etape(s) cles. Tu peux revoir la fiche ou recommencer.
                  </p>
                  {practiceRecapPoints.length > 0 ? (
                    <div className="rounded-radius-button border border-status-success/30 bg-bg-surface/85 px-3 py-2" data-testid="revision-practice-recap">
                      <p className="text-sm font-semibold text-text-primary">3 points a retenir</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                        {practiceRecapPoints.map((point, index) => (
                          <li key={`practice-recap-${index}`}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setViewMode("sheet");
                      }}
                      data-testid="revision-practice-completion-to-sheet"
                    >
                      Revoir la fiche
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleRestartPractice}
                      data-testid="revision-practice-completion-restart"
                    >
                      Recommencer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection ? (
              <div className="space-y-2" id={`revision-section-${activeSection.id}`} data-testid="revision-active-section">
                <SectionAccordion
                  id={`revision-section-${activeSection.id}`}
                  title={activeSection.title}
                  teaser={activeSection.teaser}
                  isOpen={expandedSections[activeSection.id] === true}
                  isActive
                  reduceMotion={isReducedMotion}
                  onToggle={toggleActiveSection}
                  testId={activeSection.testId}
                >
                  {activeSection.content}
                </SectionAccordion>
              </div>
            ) : (
              <Card className="mission-panel-surface" data-testid="revision-practice-empty">
                <CardContent className="space-y-3 p-4">
                  <p className="reading text-base leading-relaxed text-text-secondary">
                    Aucun exercice n&apos;est disponible pour le moment.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setViewMode("sheet");
                    }}
                  >
                    Revenir a la fiche
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {showMarkReviewedControls ? (
          <Card className="mission-panel-surface">
            <CardContent className="space-y-3 p-4 md:p-5">
              <form
                action={submitAction}
                onSubmit={() => {
                  setHasSubmitted(true);
                  setOptimisticDone(true);
                }}
                className="space-y-3"
                data-testid="revision-mark-reviewed-form"
              >
                <input type="hidden" name="cardId" value={card.id} />
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={isPending}
                  disabled={isReviewed}
                  className="rounded-radius-pill text-lg"
                  data-testid="revision-mark-reviewed-button"
                >
                  {isReviewed ? "Revision enregistree" : "J'ai revise"}
                </Button>
              </form>

              {actionState.message ? (
                <p
                  className={`text-sm font-semibold ${
                    actionState.success ? "text-status-success" : "text-status-error"
                  }`}
                  data-testid="revision-mark-reviewed-message"
                >
                  {actionState.message}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </article>
    </main>
  );
}

