import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolsAndKnowledgeCard } from "@/components/child/home/tools-and-knowledge-card";

describe("ToolsAndKnowledgeCard", () => {
  it("renders exactly two tappable entries with icons and routes", () => {
    render(<ToolsAndKnowledgeCard />);

    const card = screen.getByTestId("tools-and-knowledge-card");
    const title = screen.getByRole("heading", { name: "Pour t'aider" });
    const knowledgeLink = screen.getByRole("link", { name: /Fiches/i });
    const toolsLink = screen.getByRole("link", { name: /Outils/i });
    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(2);
    expect(screen.getByTestId("tools-link-knowledge-icon")).toBeInTheDocument();
    expect(screen.getByTestId("tools-link-focus-icon")).toBeInTheDocument();
    expect(knowledgeLink).toHaveAttribute("href", "/child/knowledge");
    expect(toolsLink).toHaveAttribute("href", "/child/my-day");
    expect(knowledgeLink.className).toContain("h-touch-lg");
    expect(toolsLink.className).toContain("h-touch-lg");
    expect(knowledgeLink.className).toContain("bg-gradient-to-br");
    expect(toolsLink.className).toContain("bg-gradient-to-br");
    expect(card.className).toContain("md:p-3");
    expect(title.className).toContain("md:text-lg");
  });
});
