import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MovieOptionCard } from "@/components/child/cinema/movie-option-card";

describe("MovieOptionCard", () => {
  it("permet de voter quand la carte n'est pas choisie", () => {
    const onVote = vi.fn();
    render(
      <MovieOptionCard
        title="Ratatouille"
        platform="Disney+"
        durationMinutes={110}
        description="Un film gourmand"
        isSelected={false}
        isChosen={false}
        onVote={onVote}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Choisir ce film" }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it("affiche l'etat vote", () => {
    render(
      <MovieOptionCard
        title="Ratatouille"
        isSelected
        isChosen={false}
        onVote={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Mon choix" })).toBeInTheDocument();
  });

  it("affiche l'etat film choisi", () => {
    render(
      <MovieOptionCard
        title="Ratatouille"
        isSelected={false}
        isChosen
        onVote={() => undefined}
      />,
    );

    expect(screen.getByText("Film choisi")).toBeInTheDocument();
  });
});
