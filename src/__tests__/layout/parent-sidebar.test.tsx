import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ParentSidebar } from "@/components/layout/parent-sidebar";
import { parentNavFooterItems, parentNavSections } from "@/config/parent-nav";
import type { ParentNavBadges } from "@/lib/navigation/parent-nav-badges";

const baseBadges: ParentNavBadges = {
  notifications: 0,
  schoolDiary: 0,
  checklists: 0,
  alarms: 0,
};

function renderSidebar(overrides?: Partial<ComponentProps<typeof ParentSidebar>>) {
  const onCloseMobile = vi.fn();
  const onToggleCollapsed = vi.fn();
  const onLogout = vi.fn();

  const view = render(
    <ParentSidebar
      currentPath="/parent/dashboard"
      badges={baseBadges}
      collapsed={false}
      mobileOpen={false}
      parentDisplayName="Parent Demo"
      onCloseMobile={onCloseMobile}
      onToggleCollapsed={onToggleCollapsed}
      onLogout={onLogout}
      {...overrides}
    />,
  );

  return {
    ...view,
    onCloseMobile,
    onToggleCollapsed,
    onLogout,
  };
}

describe("ParentSidebar", () => {
  it("affiche toutes les sections et les liens de navigation", async () => {
    const user = userEvent.setup();
    renderSidebar();

    for (const section of parentNavSections) {
      expect(screen.getAllByText(section.label).length).toBeGreaterThan(0);
      const sectionToggle = screen.queryByRole("button", { name: section.label });
      if (sectionToggle && sectionToggle.getAttribute("aria-expanded") === "false") {
        await user.click(sectionToggle);
      }

      for (const item of section.items) {
        if (item.href) {
          expect(screen.getByRole("link", { name: item.label })).toBeInTheDocument();
        }
      }
    }

    for (const item of parentNavFooterItems) {
      if (item.href) {
        expect(screen.getByRole("link", { name: item.label })).toBeInTheDocument();
      }
    }
  });

  it("met en avant la route active", () => {
    renderSidebar({ currentPath: "/parent/checklists" });

    expect(screen.getByRole("link", { name: "Modules organisation" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tableau de bord" })).not.toHaveAttribute("aria-current");
  });

  it("active Modules apprentissages sur /parent/revisions", () => {
    renderSidebar({ currentPath: "/parent/revisions" });

    expect(screen.getByRole("link", { name: "Modules apprentissages" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tableau de bord" })).not.toHaveAttribute("aria-current");
  });

  it("active Modules apprentissages sur /parent/revisions/generate", () => {
    renderSidebar({ currentPath: "/parent/revisions/generate" });

    expect(screen.getByRole("link", { name: "Modules apprentissages" })).toHaveAttribute("aria-current", "page");
  });

  it("mappe /parent/revisions/<uuid> sur Modules apprentissages", () => {
    renderSidebar({ currentPath: "/parent/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6" });

    expect(screen.getByRole("link", { name: "Modules apprentissages" })).toHaveAttribute("aria-current", "page");
  });

  it("active Modules apprentissages sur /parent/resources/books", () => {
    renderSidebar({ currentPath: "/parent/resources/books" });

    expect(screen.getByRole("link", { name: "Modules apprentissages" })).toHaveAttribute("aria-current", "page");
  });

  it("affiche les badges quand les compteurs sont > 0", async () => {
    const user = userEvent.setup();
    renderSidebar({
      badges: {
        notifications: 7,
        schoolDiary: 6,
        checklists: 5,
        alarms: 4,
      },
    });

    for (const section of parentNavSections) {
      const sectionToggle = screen.queryByRole("button", { name: section.label });
      if (sectionToggle && sectionToggle.getAttribute("aria-expanded") === "false") {
        await user.click(sectionToggle);
      }
    }

    expect(screen.getByLabelText(/7\s+element\(s\) en attente|7\s+élément\(s\) en attente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/5\s+element\(s\) en attente|5\s+élément\(s\) en attente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/4\s+element\(s\) en attente|4\s+élément\(s\) en attente/i)).toBeInTheDocument();
  });

  it("rend les variantes depliee et repliee", () => {
    const { asFragment, rerender } = renderSidebar();
    expect(asFragment()).toMatchSnapshot("expanded");

    rerender(
      <ParentSidebar
        currentPath="/parent/dashboard"
        badges={baseBadges}
        collapsed
        mobileOpen={false}
        parentDisplayName="Parent Demo"
        onCloseMobile={() => undefined}
        onToggleCollapsed={() => undefined}
        onLogout={() => undefined}
      />,
    );

    expect(asFragment()).toMatchSnapshot("collapsed");
  });
});

