import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KnowledgeCardTile } from "@/components/child/knowledge/knowledge-card-tile";

describe("KnowledgeCardTile", () => {
  it("declenche le toggle favori", () => {
    const onFavoriteToggle = vi.fn();
    render(
      <KnowledgeCardTile
        title="Les fractions"
        summary="Comprendre numerateur et denominateur"
        difficulty="CM1"
        isFavorite={false}
        onFavoriteToggle={onFavoriteToggle}
        onOpen={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ajouter aux favoris" }));
    expect(onFavoriteToggle).toHaveBeenCalledTimes(1);
  });

  it("ouvre la fiche depuis le bouton d'action", () => {
    const onOpen = vi.fn();
    render(
      <KnowledgeCardTile
        title="Le verbe etre"
        summary="Conjugaison au present"
        difficulty="CE2"
        isFavorite
        onFavoriteToggle={() => undefined}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir la fiche" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
