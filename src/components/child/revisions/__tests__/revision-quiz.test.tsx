import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevisionQuiz } from "@/components/child/revisions/RevisionQuiz";
import type { RevisionQuizQuestion } from "@/lib/revisions/types";

describe("RevisionQuiz", () => {
  it("renders empty state when there are no questions", () => {
    render(<RevisionQuiz questions={[]} />);

    expect(screen.getByTestId("revision-quiz-empty")).toBeInTheDocument();
    expect(screen.getByText("Aucun quiz pour le moment.")).toBeInTheDocument();
  });

  it("renders questions and verifies answers with semantic feedback", () => {
    const questions: RevisionQuizQuestion[] = [
      {
        id: "q1",
        question: "Combien font 9 x 7 ?",
        choices: ["54", "63"],
        answer: "63",
      },
      {
        id: "q2",
        question: "Combien font 9 x 3 ?",
        choices: ["27", "21"],
        answer: "27",
      },
    ];

    render(<RevisionQuiz questions={questions} />);

    const firstQuestion = screen.getByTestId("revision-quiz-question-0");
    expect(within(firstQuestion).getByText("Combien font 9 x 7 ?")).toBeInTheDocument();
    expect(within(firstQuestion).queryByTestId("revision-quiz-feedback-0")).not.toBeInTheDocument();

    fireEvent.click(within(firstQuestion).getByLabelText("54"));
    fireEvent.click(within(firstQuestion).getByTestId("revision-quiz-verify-0"));
    expect(within(firstQuestion).getByTestId("revision-quiz-feedback-0")).toHaveTextContent("Mauvaise reponse.");
    expect(firstQuestion.className).toContain("status-error");
    expect(within(firstQuestion).getByText("Bonne reponse: 63")).toBeInTheDocument();

    fireEvent.click(within(firstQuestion).getByLabelText("63"));
    fireEvent.click(within(firstQuestion).getByTestId("revision-quiz-verify-0"));
    expect(within(firstQuestion).getByTestId("revision-quiz-feedback-0")).toHaveTextContent("Bonne reponse.");
    expect(firstQuestion.className).toContain("status-success");

    const secondQuestion = screen.getByTestId("revision-quiz-question-1");
    expect(within(secondQuestion).getByText("Combien font 9 x 3 ?")).toBeInTheDocument();
    expect(within(secondQuestion).getAllByRole("radio")).toHaveLength(2);
  });
});
