import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistItemRow } from "@/components/child/checklists/checklist-item-row";

describe("ChecklistItemRow", () => {
  it("declenche onToggle au clic", () => {
    const onToggle = vi.fn();
    render(<ChecklistItemRow label="Mettre le cahier" isChecked={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mettre le cahier" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("affiche le style coche quand la ligne est validee", () => {
    render(<ChecklistItemRow label="Verifier la trousse" isChecked onToggle={() => undefined} />);
    const label = screen.getByText("Verifier la trousse");
    expect(label).toHaveClass("line-through");
  });
});
