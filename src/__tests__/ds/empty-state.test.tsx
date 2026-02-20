import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/ds";

describe("EmptyState", () => {
  it("affiche le titre et la description", () => {
    render(<EmptyState title="Aucune donnee" description="Ajoutez un element pour continuer." />);

    expect(screen.getByText("Aucune donnee")).toBeInTheDocument();
    expect(screen.getByText("Ajoutez un element pour continuer.")).toBeInTheDocument();
  });

  it("execute l'action quand le bouton est clique", () => {
    const onClick = vi.fn();
    render(<EmptyState title="Vide" action={{ label: "Ajouter", onClick }} />);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
