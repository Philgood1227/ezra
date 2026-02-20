import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ProgressBar,
  Select,
  TabBarItem,
  TextArea,
} from "@/components/ds";

describe("Design System components", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("rend un bouton primaire avec classes semantiques", () => {
    render(<Button>Valider</Button>);
    const button = screen.getByRole("button", { name: "Valider" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("from-brand-primary");
  });

  it("rend une carte glassmorphism", () => {
    render(<Card>Contenu</Card>);
    const card = screen.getByText("Contenu");
    expect(card).toHaveClass("bg-bg-surface/80");
    expect(card).toHaveClass("backdrop-blur-sm");
  });

  it("rend un badge categorie", () => {
    render(<Badge variant="routine">Routine</Badge>);
    expect(screen.getByText("Routine")).toHaveClass("bg-category-routine/20");
  });

  it("applique les etats erreur et succes pour les champs", () => {
    render(
      <div>
        <Input aria-invalid errorMessage="Erreur" />
        <Select successMessage="OK">
          <option>Option</option>
        </Select>
        <TextArea errorMessage="Champ requis" />
      </div>,
    );

    expect(screen.getByText("Erreur")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("Champ requis")).toBeInTheDocument();
  });

  it("rend un item de tabbar avec badge", () => {
    render(<TabBarItem label="Alertes" isActive badgeCount={3} onClick={() => undefined} />);
    expect(screen.getByLabelText("3 notifications non lues")).toBeInTheDocument();
  });

  it("rend un modal et ferme via Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Confirmer">
        <p>Contenu de test</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Confirmer" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("met a jour la largeur de la barre de progression", () => {
    const { container } = render(<ProgressBar value={40} max={80} />);
    const fill = container.querySelector(".h-full");
    expect(fill).toHaveStyle({ width: "50%" });
  });

  it("affiche les initiales pour un avatar sans image", () => {
    render(<Avatar name="Luca Martin" />);
    expect(screen.getByText("LM")).toBeInTheDocument();
  });
});
