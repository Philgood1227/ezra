import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealCard } from "@/components/child/meals/meal-card";

describe("MealCard", () => {
  it("declenche la notation choisie", () => {
    const onRate = vi.fn();
    render(
      <MealCard
        mealType="dejeuner"
        description="Poulet riz"
        preparedByLabel="Papa"
        onRate={onRate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "J'adore" }));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it("affiche une note deja enregistree", () => {
    render(
      <MealCard
        mealType="diner"
        description="Soupe"
        preparedByLabel="Maman"
        rating={2}
        onRate={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Bon" })).toHaveClass("border-brand-primary");
  });
});
