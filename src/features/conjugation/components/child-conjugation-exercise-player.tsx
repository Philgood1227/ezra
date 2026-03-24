"use client";

import Link from "next/link";
import * as React from "react";
import { submitConjugationExerciseAttemptAction } from "@/lib/actions/conjugation";
import {
  type ConjugationAttemptAnswer,
  type ConjugationChildExerciseListItem,
  type ConjugationExerciseContent,
  type ConjugationTimeDefinition,
} from "@/lib/conjugation/types";
import { Badge, Button, Card, CardContent, Select } from "@/components/ds";

interface ChildConjugationExercisePlayerProps {
  item: ConjugationChildExerciseListItem;
  timeDefinition: ConjugationTimeDefinition;
}

interface SubmissionResultState {
  score: number;
  totalQuestions: number;
  answers: ConjugationAttemptAnswer[];
}

function getExerciseTypeLabel(type: ConjugationExerciseContent["type"]): string {
  if (type === "qcm") {
    return "QCM";
  }
  if (type === "fill_blank") {
    return "Phrases a trous";
  }
  if (type === "match") {
    return "Associer";
  }
  return "Transformer";
}

function normalizeExistingAnswers(
  latestAnswers: ConjugationAttemptAnswer[] | null,
): Record<string, string> {
  if (!latestAnswers) {
    return {};
  }

  return latestAnswers.reduce<Record<string, string>>((accumulator, answer) => {
    accumulator[answer.questionId] = answer.userAnswer;
    return accumulator;
  }, {});
}

export function ChildConjugationExercisePlayer({
  item,
  timeDefinition,
}: ChildConjugationExercisePlayerProps): React.JSX.Element {
  const content = item.exercise.content;
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmissionResultState | null>(null);
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>(() =>
    normalizeExistingAnswers(item.latestAttempt?.answers ?? null),
  );
  const [matchAnswers, setMatchAnswers] = React.useState<Record<string, Record<string, string>>>(
    {},
  );

  function submitExercise(): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    const answersPayload =
      content.type === "match"
        ? content.questions.map((question) => ({
            questionId: question.id,
            matches: matchAnswers[question.id] ?? {},
          }))
        : content.questions.map((question) => ({
            questionId: question.id,
            value: textAnswers[question.id] ?? "",
          }));

    startTransition(async () => {
      const response = await submitConjugationExerciseAttemptAction({
        exerciseId: item.exercise.id,
        answers: answersPayload,
      });

      if (!response.success || !response.data) {
        setErrorMessage(response.error ?? "Impossible d'envoyer ton exercice.");
        return;
      }

      setResult({
        score: response.data.score,
        totalQuestions: response.data.totalQuestions,
        answers: response.data.answers,
      });
      setSuccessMessage("Exercice envoye a Papa/Maman.");
    });
  }

  const displayedResult: SubmissionResultState | null =
    result ??
    (item.latestAttempt
      ? {
          score: item.latestAttempt.score,
          totalQuestions: item.latestAttempt.totalQuestions,
          answers: item.latestAttempt.answers,
        }
      : null);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Conjugaison</Badge>
          <Badge variant="neutral">{timeDefinition.title}</Badge>
          <Badge variant="warning">{getExerciseTypeLabel(content.type)}</Badge>
          {item.isCompleted ? <Badge variant="success">Deja termine</Badge> : null}
        </div>
        <h1 className="text-2xl font-black text-text-primary">{item.exercise.title}</h1>
        <p className="text-sm text-text-secondary">
          Lis chaque question puis clique sur "Terminer et envoyer a Papa/Maman".
        </p>
      </header>

      {content.type === "qcm" ? (
        <div className="space-y-3">
          {content.questions.map((question, index) => (
            <Card key={question.id} className="border-border-default bg-bg-surface/95 shadow-card">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold text-text-primary">
                  {index + 1}. {question.prompt}
                </p>
                <div className="space-y-2">
                  {question.choices.map((choice, choiceIndex) => (
                    <label
                      key={`${question.id}-${choiceIndex}`}
                      className="flex cursor-pointer items-center gap-2 rounded-radius-button border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary"
                    >
                      <input
                        type="radio"
                        name={`qcm-${question.id}`}
                        value={choice}
                        checked={(textAnswers[question.id] ?? "") === choice}
                        onChange={(event) =>
                          setTextAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {content.type === "fill_blank" ? (
        <div className="space-y-3">
          {content.questions.map((question, index) => (
            <Card key={question.id} className="border-border-default bg-bg-surface/95 shadow-card">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold text-text-primary">
                  {index + 1}. {question.prompt}
                </p>
                <input
                  type="text"
                  value={textAnswers[question.id] ?? ""}
                  onChange={(event) =>
                    setTextAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  className="h-touch-md w-full rounded-radius-button border border-border-default bg-bg-surface px-3 text-sm text-text-primary outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-brand-primary"
                  placeholder="Ta reponse"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {content.type === "transform" ? (
        <div className="space-y-3">
          {content.questions.map((question, index) => (
            <Card key={question.id} className="border-border-default bg-bg-surface/95 shadow-card">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-semibold text-text-primary">{index + 1}. {question.instruction}</p>
                <p className="rounded-radius-button border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
                  {question.prompt}
                </p>
                <input
                  type="text"
                  value={textAnswers[question.id] ?? ""}
                  onChange={(event) =>
                    setTextAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  className="h-touch-md w-full rounded-radius-button border border-border-default bg-bg-surface px-3 text-sm text-text-primary outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-brand-primary"
                  placeholder="Ecris la phrase transformee"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {content.type === "match" ? (
        <div className="space-y-3">
          {content.questions.map((question, index) => {
            const options = question.pairs.map((pair) => pair.right);
            return (
              <Card key={question.id} className="border-border-default bg-bg-surface/95 shadow-card">
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {index + 1}. {question.instruction}
                  </p>
                  <div className="space-y-2">
                    {question.pairs.map((pair) => (
                      <div
                        key={pair.id}
                        className="grid items-center gap-2 rounded-radius-button border border-border-default bg-bg-elevated px-3 py-2 sm:grid-cols-[140px_minmax(0,1fr)]"
                      >
                        <p className="text-sm font-semibold text-text-primary">{pair.left}</p>
                        <Select
                          value={matchAnswers[question.id]?.[pair.left] ?? ""}
                          onChange={(event) =>
                            setMatchAnswers((current) => ({
                              ...current,
                              [question.id]: {
                                ...(current[question.id] ?? {}),
                                [pair.left]: event.target.value,
                              },
                            }))
                          }
                        >
                          <option value="">Choisir...</option>
                          {options.map((option, optionIndex) => (
                            <option key={`${pair.id}-option-${optionIndex}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/child/conjugaison/exercises?time=${item.exercise.timeKey}`}
          className="inline-flex h-touch-md items-center justify-center rounded-radius-button border border-border-default bg-bg-elevated px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-bg-surface-hover"
        >
          Retour a la liste
        </Link>
        <Button type="button" variant="primary" onClick={submitExercise} loading={isPending}>
          Terminer et envoyer a Papa/Maman
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-status-error/40 bg-status-error/10">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-status-error">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {successMessage ? (
        <Card className="border-status-success/40 bg-status-success/10">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-status-success">{successMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {displayedResult ? (
        <Card className="border-border-default bg-bg-surface/95 shadow-card">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-lg font-black text-text-primary">
              Resultat: {displayedResult.score}% ({displayedResult.totalQuestions} question(s))
            </h2>
            <div className="space-y-2">
              {displayedResult.answers.map((answer) => (
                <div
                  key={answer.questionId}
                  className="rounded-radius-button border border-border-default bg-bg-elevated px-3 py-2"
                >
                  <p className="text-xs font-semibold text-text-primary">{answer.prompt}</p>
                  <p className="text-xs text-text-secondary">
                    Ta reponse:{" "}
                    <span className={answer.isCorrect ? "text-status-success" : "text-status-error"}>
                      {answer.userAnswer || "(vide)"}
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    Bonne reponse: <span className="font-semibold text-text-primary">{answer.correctAnswer}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
