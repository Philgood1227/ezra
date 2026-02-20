import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistCard } from "@/components/child/checklists/checklist-card";
import type { ChecklistInstanceItemSummary } from "@/lib/day-templates/types";

function buildItems(checkedIds: string[] = []): ChecklistInstanceItemSummary[] {
  return [
    {
      id: "item-1",
      checklistInstanceId: "check-1",
      label: "Gourde",
      isChecked: checkedIds.includes("item-1"),
      sortOrder: 0,
    },
    {
      id: "item-2",
      checklistInstanceId: "check-1",
      label: "Chaussures",
      isChecked: checkedIds.includes("item-2"),
      sortOrder: 1,
    },
  ];
}

describe("ChecklistCard", () => {
  it("affiche la progression et peut se replier", () => {
    render(
      <ChecklistCard
        label="Checklist sport"
        type="sortie"
        items={buildItems(["item-1"])}
        progress={50}
        onToggleItem={() => undefined}
      />,
    );

    const toggleButton = screen.getByRole("button", { name: /Checklist sport/i });
    expect(screen.getByText("1/2 etapes")).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
  });

  it("declenche onToggleItem sur une ligne", () => {
    const onToggleItem = vi.fn();
    render(
      <ChecklistCard
        label="Checklist piscine"
        type="piscine"
        items={buildItems()}
        progress={0}
        onToggleItem={onToggleItem}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Gourde" }));
    expect(onToggleItem).toHaveBeenCalledWith("item-1", true);
  });

  it("affiche l'etat de celebration quand tout est pret", () => {
    render(
      <ChecklistCard
        label="Checklist complete"
        type="quotidien"
        items={buildItems(["item-1", "item-2"])}
        progress={100}
        onToggleItem={() => undefined}
      />,
    );

    expect(screen.getByText("Tout est pret")).toBeInTheDocument();
  });
});
