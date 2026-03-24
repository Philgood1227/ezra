import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ParentLearningPage from "@/app/(parent)/parent/learning/page";

describe("ParentLearningPage", () => {
  it("renders the learning hub cards", () => {
    render(<ParentLearningPage />);

    expect(screen.getByRole("heading", { name: "Modules apprentissages" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir la bibliothèque" })).toHaveAttribute(
      "href",
      "/parent/revisions",
    );
    expect(screen.getByRole("link", { name: "Ouvrir la génération IA" })).toHaveAttribute(
      "href",
      "/parent/revisions/generate",
    );
    expect(screen.getByRole("link", { name: "Ouvrir les ressources" })).toHaveAttribute(
      "href",
      "/parent/resources/books",
    );
    expect(screen.getByRole("link", { name: "Ouvrir connaissances" })).toHaveAttribute(
      "href",
      "/parent/knowledge",
    );
  });
});
