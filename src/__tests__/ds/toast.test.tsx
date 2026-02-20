import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/ds";

function ToastHarness(): React.JSX.Element {
  const toast = useToast();

  return (
    <button type="button" onClick={() => toast.success("Tache terminee !")}>
      Afficher
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("affiche puis masque automatiquement une notification", () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Afficher" }));
    expect(screen.getByText("Tache terminee !")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Tache terminee !")).not.toBeInTheDocument();
  });
});
