import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParentQuickActionsDrawer } from "@/components/layout/parent-quick-actions-drawer";

describe("ParentQuickActionsDrawer", () => {
  it("renders shortcuts and closes on overlay click", async () => {
    const onClose = vi.fn();

    render(
      <ParentQuickActionsDrawer open pathname="/parent/revisions" onClose={onClose} />,
    );

    expect(screen.getByRole("heading", { name: "Actions rapides" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bibliotheque" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fermer les actions rapides" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(3);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Actions rapides parent" })).toBeInTheDocument();
    });
  });
});
