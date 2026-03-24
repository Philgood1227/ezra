"use client";

import * as React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import type { RevisionQuizQuestion } from "@/lib/revisions/types";
import { cn } from "@/lib/utils";

interface RevisionQuizProps {
  questions: RevisionQuizQuestion[];
}

export function RevisionQuiz({ questions }: RevisionQuizProps): React.JSX.Element {
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string>>({});
  const [showCorrection, setShowCorrection] = React.useState<Record<string, boolean>>({});

  if (questions.length === 0) {
    return (
      <Card className="mission-panel-surface" data-testid="revision-quiz-empty">
        <CardHeader className="mb-0">
          <CardTitle className="text-xl">Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="reading text-base leading-relaxed text-text-secondary">
            Aucun quiz pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mission-panel-surface" data-testid="revision-quiz-section">
      <CardHeader className="mb-0">
        <CardTitle className="text-xl">Quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, index) => {
          const selectedAnswer = selectedAnswers[question.id];
          const hasSelectedAnswer = typeof selectedAnswer === "string" && selectedAnswer.length > 0;
          const hasChecked = showCorrection[question.id] === true;
          const isCorrect = hasChecked && selectedAnswer === question.answer;
          const isIncorrect = hasChecked && selectedAnswer !== question.answer;

          return (
            <section
              key={question.id}
              className={cn(
                "rounded-radius-button border p-4 transition-all duration-200 ease-out",
                isCorrect && "scale-[1.01] border-status-success/35 bg-status-success/10 shadow-card",
                isIncorrect && "scale-[1.005] border-status-error/35 bg-status-error/10 shadow-card",
                !hasChecked && "border-border-subtle bg-bg-surface/80",
              )}
              data-testid={`revision-quiz-question-${index}`}
            >
              <h3 className="text-lg font-bold text-text-primary">{question.question}</h3>
              <fieldset className="mt-3 space-y-2">
                <legend className="sr-only">Choix de reponse</legend>
                {question.choices.map((choice, choiceIndex) => (
                  <label
                    key={`${question.id}-${choiceIndex}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-radius-button border px-3 py-2 transition-all duration-150",
                      selectedAnswer === choice
                        ? "border-brand-primary/50 bg-bg-surface shadow-card"
                        : "border-border-subtle bg-bg-elevated/80",
                    )}
                  >
                    <input
                      type="radio"
                      name={`revision-quiz-choice-${question.id}`}
                      checked={selectedAnswer === choice}
                      onChange={() => {
                        setSelectedAnswers((current) => ({
                          ...current,
                          [question.id]: choice,
                        }));
                        setShowCorrection((current) => ({
                          ...current,
                          [question.id]: false,
                        }));
                      }}
                    />
                    <span className="reading text-base leading-relaxed text-text-primary">{choice}</span>
                  </label>
                ))}
              </fieldset>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!hasSelectedAnswer}
                  onClick={() => {
                    setShowCorrection((current) => ({
                      ...current,
                      [question.id]: true,
                    }));
                  }}
                  data-testid={`revision-quiz-verify-${index}`}
                >
                  Verifier
                </Button>
              </div>

              {hasChecked ? (
                <p
                  className={cn(
                    "mt-3 text-sm font-semibold",
                    isCorrect ? "text-status-success" : "text-status-error",
                  )}
                  data-testid={`revision-quiz-feedback-${index}`}
                >
                  {isCorrect ? "Bonne reponse." : "Mauvaise reponse."}
                </p>
              ) : null}

              {isIncorrect ? (
                <p className="mt-1 reading text-sm leading-relaxed text-text-secondary">
                  Bonne reponse: {question.answer}
                </p>
              ) : null}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
