import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildShell } from "@/components/layout/child-shell";

let mockedPathname = "/child";
const mockedPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
  useRouter: () => ({
    prefetch: mockedPrefetch,
  }),
}));

vi.mock("@/features/alarms/components", () => ({
  ChildAlarmCenter: () => null,
}));

describe("ChildShell navigation", () => {
  beforeEach(() => {
    mockedPathname = "/child";
    mockedPrefetch.mockClear();
  });

  it("affiche des onglets lisibles avec icones et badge checklists", () => {
    render(
      <ChildShell checklistBadgeCount={3}>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    const homeLink = screen.getByRole("link", { name: /Accueil/i });
    const myDayLink = screen.getByRole("link", { name: /Ma journ\u00E9e/i });
    const checklistsLink = screen.getByRole("link", { name: /^Checklists/ });
    const fichesLink = screen.getByRole("link", { name: /Fiches/i });

    expect(homeLink).toBeInTheDocument();
    expect(myDayLink).toBeInTheDocument();
    expect(checklistsLink).toBeInTheDocument();
    expect(fichesLink).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plus/i })).toBeInTheDocument();
    expect(screen.getByLabelText("3 notifications non lues")).toBeInTheDocument();

    expect(homeLink).toHaveClass("text-sm");
    expect(myDayLink).toHaveClass("text-sm");

    expect(homeLink.querySelector('[data-slot="tab-icon"] svg')).not.toBeNull();
    expect(myDayLink.querySelector('[data-slot="tab-icon"] svg')).not.toBeNull();
    expect(checklistsLink.querySelector('[data-slot="tab-icon"] svg')).not.toBeNull();
    expect(fichesLink.querySelector('[data-slot="tab-icon"] svg')).not.toBeNull();
  });

  it("met en avant l'onglet actif", () => {
    const { rerender } = render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    expect(screen.getByRole("link", { name: /Accueil/i })).toHaveAttribute("aria-current", "page");

    mockedPathname = "/child/my-day";
    rerender(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );
    expect(screen.getByRole("link", { name: /Ma journ\u00E9e/i })).toHaveAttribute("aria-current", "page");
  });

  it("ouvre le menu plus et affiche les destinations", () => {
    render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Plus/i }));
    expect(screen.getByRole("link", { name: /Succ\u00E8s/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cin\u00E9ma/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\u00C9motions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Repas/i })).toBeInTheDocument();
  });
});
