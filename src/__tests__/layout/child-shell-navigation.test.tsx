import { render, screen } from "@testing-library/react";
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

  it("n'affiche plus de navigation basse", () => {
    render(
      <ChildShell checklistBadgeCount={3}>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    expect(screen.queryByRole("navigation", { name: /Navigation enfant/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Aujourd'hui/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Check-lists/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Succes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Outils/i })).not.toBeInTheDocument();
  });

  it("prefetch les destinations principales de la navigation simplifiee", () => {
    render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    expect(mockedPrefetch).toHaveBeenCalledWith("/child/checklists");
    expect(mockedPrefetch).toHaveBeenCalledWith("/child/achievements");
    expect(mockedPrefetch).toHaveBeenCalledWith("/child/tools");
  });

  it("utilise une largeur full-bleed sur la route /child", () => {
    const { container } = render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    const shell = container.firstElementChild;
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("px-[var(--page-x)]");
    expect(shell?.className).not.toContain("max-w-[1320px]");
  });

  it("conserve une largeur contrainee sur les autres routes enfant", () => {
    mockedPathname = "/child/checklists";

    const { container } = render(
      <ChildShell>
        <div>Contenu enfant</div>
      </ChildShell>,
    );

    const shell = container.firstElementChild;
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("max-w-[1080px]");
  });

  it("aligne la route revision sur le gabarit home et masque Reglages", () => {
    mockedPathname = "/child/revisions/revision-card-1";

    const { container } = render(
      <ChildShell>
        <div>Contenu revision</div>
      </ChildShell>,
    );

    const shell = container.firstElementChild;
    expect(shell).not.toBeNull();
    expect(shell?.className).not.toContain("max-w-[1080px]");
    expect(screen.queryByRole("button", { name: /Reglages|R\u00E9glages/i })).not.toBeInTheDocument();
  });
});
