import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoreMenu } from "@/components/layout/more-menu";

function MoreMenuHarness(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <MoreMenu
        open={open}
        onClose={() => setOpen(false)}
        items={[
          { href: "/child/achievements", label: "Succes", icon: "🏆" },
          { href: "/child/cinema", label: "Cinema", icon: "🎬" },
          { href: "/child/emotions", label: "Emotions", icon: "💛" },
          { href: "/child/meals", label: "Repas", icon: "🍽️" },
        ]}
      />
    </div>
  );
}

describe("MoreMenu", () => {
  it("ouvre et ferme le panneau", async () => {
    render(<MoreMenuHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(screen.getByRole("link", { name: /Succes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cinema/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Emotions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Repas/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fermer le menu plus" }));
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /Succes/i })).not.toBeInTheDocument();
    });
  });

  it("se ferme avec la touche Escape", async () => {
    render(<MoreMenuHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /Succes/i })).not.toBeInTheDocument();
    });
  });
});
