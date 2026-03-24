import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissionDrawer } from "@/components/missions/MissionDrawer";
import type { MissionUI } from "@/components/missions/types";

type MissionWithDescription = MissionUI & { description?: string | null };

function createMission(overrides: Partial<MissionWithDescription> = {}): MissionWithDescription {
  return {
    id: overrides.id ?? "mission-1",
    title: overrides.title ?? "Lecture",
    iconKey: overrides.iconKey ?? "meal",
    colorKey: overrides.colorKey ?? "category-repas",
    startTime: overrides.startTime ?? "16:00",
    endTime: overrides.endTime ?? "16:20",
    estimatedMinutes: overrides.estimatedMinutes ?? 20,
    points: overrides.points ?? 5,
    status: overrides.status ?? "todo",
    sourceStatus: overrides.sourceStatus ?? "a_faire",
    instructionsHtml: overrides.instructionsHtml ?? "<p>Consigne simple.</p>",
    helpLinks: overrides.helpLinks ?? [],
    recommendedBlockId: overrides.recommendedBlockId ?? "home",
    recommendedBlockLabel: overrides.recommendedBlockLabel ?? "Maison",
    itemSubkind: overrides.itemSubkind ?? null,
    categoryName: overrides.categoryName ?? "Repas",
    microSteps: overrides.microSteps ?? [],
    description: overrides.description ?? null,
  };
}

function mockMatchMedia(matches: boolean): void {
  const listener = vi.fn();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: listener,
      removeListener: listener,
      addEventListener: listener,
      removeEventListener: listener,
      dispatchEvent: () => false,
    })),
  });
}

function renderDrawer(mission: MissionWithDescription): void {
  render(
    <MissionDrawer
      open
      missions={[mission]}
      selectedMissionId={mission.id}
      view="mission"
      onClose={vi.fn()}
      onSelectMission={vi.fn()}
      onViewChange={vi.fn()}
      onStart={vi.fn()}
      onPause={vi.fn()}
      onComplete={vi.fn()}
      onOpenFocus={vi.fn()}
    />,
  );
}

describe("MissionDrawer", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("renders header hierarchy, single white instructions block, and premium actions", () => {
    const mission = createMission({
      title: "Reviser la table de 9",
      itemSubkind: "Mathematiques",
      categoryName: "Ecole",
      instructionsHtml: [
        "<p>Lis la fiche.</p>",
        "<blockquote><p>Astuce: Souligne les verbes importants.</p></blockquote>",
        "<ul><li>Etape 1</li></ul>",
        "<p><a href=\"https://example.com\" target=\"_blank\">Aide</a></p>",
        "<script>alert('x')</script>",
      ].join(""),
    });

    renderDrawer(mission);

    const drawer = screen.getByRole("dialog", { name: "Details mission" });
    const header = within(drawer).getByTestId("drawer-header");
    expect(header).toBeInTheDocument();

    expect(within(header).getByRole("heading", { name: "Reviser la table de 9" })).toBeInTheDocument();
    const subkindPill = within(header).getByTestId("drawer-subkind-pill");
    expect(subkindPill).toHaveTextContent("Mathematiques");

    const categoryIconContainer = within(header).getByTestId("drawer-category-icon");
    expect(categoryIconContainer).toHaveAttribute("aria-label", expect.stringContaining("Ecole"));
    expect(within(drawer).queryByText(/Ecole/i)).not.toBeInTheDocument();

    const subjectIndex = (header.textContent ?? "").indexOf("Mathematiques");
    const titleIndex = (header.textContent ?? "").indexOf("Reviser la table de 9");
    expect(subjectIndex).toBeGreaterThanOrEqual(0);
    expect(subjectIndex).toBeGreaterThan(titleIndex);

    expect(within(header).getByText("Mission du jour")).toBeInTheDocument();
    expect((header.textContent ?? "").match(/Mission du jour/g)?.length ?? 0).toBe(1);

    const closeButton = within(header).getByTestId("drawer-close");
    expect(closeButton).toHaveAccessibleName("Fermer");
    expect(closeButton).toHaveTextContent("X");

    const timeChip = within(drawer).getByTestId("drawer-meta-time");
    expect(timeChip.textContent).toContain("\u23F1");
    expect(timeChip).toHaveTextContent(/20 min estim/i);
    expect(timeChip.className).toContain("mission-drawer-chip");
    expect(timeChip.className).toContain("mission-drawer-chip-time");

    const pointsChip = within(drawer).getByTestId("drawer-meta-points");
    expect(pointsChip.textContent).toContain(String.fromCodePoint(0x1f3c5));
    expect(pointsChip).toHaveTextContent("+5 pts");
    expect(pointsChip.className).toContain("mission-drawer-chip");
    expect(pointsChip.className).toContain("mission-drawer-chip-points");

    const statusChip = within(drawer).getByTestId("drawer-meta-status");
    expect(statusChip.className).toContain("mission-drawer-chip");
    expect(statusChip.className).toContain("mission-drawer-chip-status");

    const panel = within(drawer).getByTestId("drawer-instructions-panel");
    expect(panel).toBeInTheDocument();
    expect(panel.className).toContain("mission-drawer-instructions-panel");
    expect(within(drawer).getByTestId("drawer-instructions-icon")).toBeInTheDocument();
    expect(within(drawer).getByText("Ce que tu dois faire")).toBeInTheDocument();

    // New stable selector for the single white block container around main instructions.
    const whiteBlock = within(drawer).getByTestId("drawer-instructions-white-block");
    expect(whiteBlock.className).toContain("mission-drawer-instructions-white-block");
    expect(within(drawer).getByTestId("mission-drawer-instructions").className).toContain(
      "mission-drawer-richtext",
    );
    expect(within(drawer).getByTestId("mission-drawer-instructions").className).not.toContain(
      "mission-drawer-richtext-cards",
    );
    expect(within(drawer).getByText("Lis la fiche.")).toBeInTheDocument();
    expect(within(drawer).getByText("Etape 1")).toBeInTheDocument();
    expect(within(drawer).queryByText("alert('x')")).not.toBeInTheDocument();

    const tip = within(drawer).getByTestId("mission-drawer-tip");
    expect(tip).toHaveTextContent("Souligne les verbes importants.");

    const startCta = within(drawer).getByTestId("drawer-cta-start");
    expect(startCta).toHaveTextContent("Commencer la mission");
    expect(startCta.className).toContain("mission-drawer-cta-primary");
    expect(startCta.className).toContain("mission-drawer-cta-pill");
    expect(within(drawer).getByTestId("drawer-cta-start-icon")).toHaveTextContent("\u25B6");

    const focusCta = within(drawer).getByTestId("drawer-cta-focus");
    expect(focusCta).toHaveTextContent("Focus");
    expect(focusCta.className).toContain("mission-drawer-cta-secondary");
    expect(focusCta.className).toContain("mission-drawer-cta-pill");

    const cancelCta = within(drawer).getByTestId("drawer-cta-cancel");
    expect(cancelCta).toHaveTextContent("Annuler");
    expect(cancelCta.className).toContain("mission-drawer-cta-secondary");
    expect(cancelCta.className).toContain("mission-drawer-cta-pill");

    const link = within(drawer).getByRole("link", { name: "Aide" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("does not render category name as visible text when subkind is missing", () => {
    const mission = createMission({
      title: "Reviser la table de 9",
      itemSubkind: null,
      categoryName: "Ecole",
    });

    renderDrawer(mission);

    const header = within(screen.getByRole("dialog", { name: "Details mission" })).getByTestId("drawer-header");
    expect(within(header).queryByTestId("drawer-subkind-pill")).not.toBeInTheDocument();
    expect(within(header).queryByText(/Ecole/i)).not.toBeInTheDocument();
    expect(within(header).getByTestId("drawer-category-icon")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Ecole"),
    );
  });

  it("keeps sticky header/footer and uses only the middle body as scroll container", () => {
    const mission = createMission();
    renderDrawer(mission);

    const drawer = screen.getByRole("dialog", { name: "Details mission" });
    const header = within(drawer).getByTestId("drawer-header");
    const body = within(drawer).getByTestId("mission-drawer-scroll");
    const footer = within(drawer).getByTestId("mission-drawer-footer");

    expect(header.className).toContain("sticky");
    expect(header.className).toContain("top-0");
    expect(body.className).toContain("mission-drawer-body");
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("min-h-0");
    expect(footer.className).toContain("sticky");
    expect(footer.className).toContain("bottom-0");
  });

  it("renders bulb tip and revision as distinct sections outside instructions white block", () => {
    const mission = createMission({
      iconKey: "sport",
      colorKey: "category-sport",
      instructionsHtml: "<p>Fais les exercices 1 a 3.</p>",
      categoryName: "Sport",
      description: "Prends ton temps, ecris bien lisiblement !",
      helpLinks: [{ id: "h1", label: "Fiche 1", href: "/child/knowledge?card=1" }],
    });

    renderDrawer(mission);

    const drawer = screen.getByRole("dialog", { name: "Details mission" });
    expect(within(drawer).queryByTestId("mission-drawer-tip")).not.toBeInTheDocument();
    expect(within(drawer).getByTestId("drawer-bulb-tip")).toHaveTextContent(
      "Prends ton temps, ecris bien lisiblement !",
    );

    const revisionSection = within(drawer).getByTestId("drawer-revision-section");
    expect(revisionSection).toBeInTheDocument();
    expect(revisionSection.className).toContain("mission-drawer-revision-surface");

    const whiteBlock = within(drawer).getByTestId("drawer-instructions-white-block");
    expect(whiteBlock.contains(revisionSection)).toBe(false);

    const categoryIconContainer = within(drawer).getByTestId("drawer-category-icon");
    expect(categoryIconContainer).toHaveAttribute("aria-label", expect.stringContaining("Sport"));

    const categoryIcon = within(drawer).getByTestId("mission-drawer-category-icon");
    expect(categoryIcon).toHaveAttribute("data-icon-key", "sport");

    const categoryFrame = within(drawer).getByTestId("mission-drawer-category-frame");
    expect(categoryFrame.className).toContain("border-category-sport/45");
    expect(categoryFrame.className).toContain("bg-category-sport/16");
  });

  it("hides bulb tip and revision section when source data is missing", () => {
    const mission = createMission({
      description: null,
      helpLinks: [],
    });

    renderDrawer(mission);
    const drawer = screen.getByRole("dialog", { name: "Details mission" });

    expect(within(drawer).queryByTestId("drawer-bulb-tip")).not.toBeInTheDocument();
    expect(within(drawer).queryByTestId("drawer-revision-section")).not.toBeInTheDocument();
  });

  it("applies mobile and desktop responsive container classes", async () => {
    const mission = createMission();

    const mobile = render(
      <MissionDrawer
        open
        missions={[mission]}
        selectedMissionId={mission.id}
        view="mission"
        onClose={vi.fn()}
        onSelectMission={vi.fn()}
        onViewChange={vi.fn()}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onComplete={vi.fn()}
        onOpenFocus={vi.fn()}
      />,
    );

    const mobileDrawer = screen.getByTestId("mission-drawer");
    expect(mobileDrawer.className).toContain("w-[92vw]");
    expect(mobileDrawer.className).toContain("max-h-[80vh]");
    mobile.unmount();

    mockMatchMedia(true);
    render(
      <MissionDrawer
        open
        missions={[mission]}
        selectedMissionId={mission.id}
        view="mission"
        onClose={vi.fn()}
        onSelectMission={vi.fn()}
        onViewChange={vi.fn()}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onComplete={vi.fn()}
        onOpenFocus={vi.fn()}
      />,
    );
    const desktopDrawer = screen.getByTestId("mission-drawer");

    await waitFor(() => {
      expect(desktopDrawer.className).toContain("w-[clamp(480px,46vw,640px)]");
    });
  });
});
