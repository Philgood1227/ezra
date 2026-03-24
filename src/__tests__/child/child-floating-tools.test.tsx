import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChildShell } from "@/components/layout/child-shell";

let mockedPathname = "/child/my-day";
const mockedPrefetch = vi.fn();
const mockedPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
  useRouter: () => ({
    prefetch: mockedPrefetch,
    push: mockedPush,
  }),
}));

vi.mock("@/features/alarms/components", () => ({
  ChildAlarmCenter: () => null,
}));

vi.mock("@/components/onboarding/child-onboarding-overlay", () => ({
  ChildOnboardingOverlay: () => null,
}));

describe("Child floating tools", () => {
  beforeEach(() => {
    mockedPathname = "/child/my-day";
    mockedPrefetch.mockClear();
    mockedPush.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            id: "card-1",
            title: "Fractions rapides",
            subject: "Maths",
            level: "6P",
            type: "concept",
            status: "published",
            updatedAt: "2026-03-01T10:00:00.000Z",
            lastReviewedAt: null,
            progressStatus: "unseen",
            stars: 0,
          },
        ],
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the floating tools FAB on regular child pages", () => {
    render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    expect(screen.getByTestId("child-floating-tools-fab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir les outils" })).toBeInTheDocument();
  });

  it("does not render FAB when page explicitly disables floating tools", () => {
    render(
      <ChildShell hideFloatingTools>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    expect(screen.queryByTestId("child-floating-tools-fab")).not.toBeInTheDocument();
  });

  it("opens tools drawer and shows Fiches entry", async () => {
    render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir les outils" }));

    expect(await screen.findByRole("dialog", { name: "Outils" })).toBeInTheDocument();
    expect(screen.getByTestId("child-tools-drawer-root")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fiches/i })).toBeInTheDocument();
    expect(screen.getByText("Voir / choisir une fiche")).toBeInTheDocument();
  });

  it("opens fiche picker, renders list, and navigates to selected card", async () => {
    render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir les outils" }));
    fireEvent.click(await screen.findByRole("button", { name: /Fiches/i }));

    expect(await screen.findByTestId("child-tools-drawer-cards")).toBeInTheDocument();
    expect(await screen.findByTestId("child-tools-cards-list")).toBeInTheDocument();
    expect(screen.getByText("Fractions rapides")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Fractions rapides/i }));

    expect(mockedPush).toHaveBeenCalledWith("/child/revisions/card-1");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Outils" })).not.toBeInTheDocument();
    });
  });
});
