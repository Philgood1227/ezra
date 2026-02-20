import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmotionPicker } from "@/components/child/emotions/emotion-picker";

describe("EmotionPicker", () => {
  it("active l'enregistrement apres selection d'une emotion", () => {
    const onSelect = vi.fn();
    render(<EmotionPicker moment="matin" isCompleted={false} onSelect={onSelect} />);

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Tres content" }));
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);
    expect(onSelect).toHaveBeenCalledWith("tres_content", null);
  });

  it("transmet la note optionnelle", () => {
    const onSelect = vi.fn();
    render(<EmotionPicker moment="soir" isCompleted={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    fireEvent.change(screen.getByPlaceholderText("Note courte (optionnel)"), { target: { value: "Bonne soiree" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSelect).toHaveBeenCalledWith("content", "Bonne soiree");
  });
});
