import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AchievementBadge } from "@/components/child/achievements/achievement-badge";

describe("AchievementBadge", () => {
  it("affiche l'etat verrouille avec un indice", () => {
    render(
      <AchievementBadge
        icon="??"
        label="Routine"
        description="Description"
        isUnlocked={false}
        hint="Termine 3 routines d'affilee"
      />,
    );

    const lockedButton = screen.getByRole("button", { name: /Routine/i });
    expect(screen.getByText("Routine")).toBeInTheDocument();
    expect(screen.getByText("Termine 3 routines d'affilee")).toBeInTheDocument();
    expect(lockedButton).toBeDisabled();
    expect(lockedButton.querySelector("svg")).not.toBeNull();
  });

  it("ouvre le detail quand le badge est debloque", () => {
    render(
      <AchievementBadge
        icon="??"
        label="Routine"
        description="Tu as ete regulier toute la semaine."
        isUnlocked
        unlockedAt="2026-02-13"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Routine/i }));
    expect(screen.getByRole("dialog", { name: "Routine" })).toBeInTheDocument();
    expect(screen.getByText("Tu as ete regulier toute la semaine.")).toBeInTheDocument();
  });
});
