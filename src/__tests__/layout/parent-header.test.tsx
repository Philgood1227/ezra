import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ds";
import { ParentHeader } from "@/components/layout/parent-header";

describe("ParentHeader", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("affiche le breadcrumb, le titre et les actions", () => {
    render(
      <ParentHeader
        title="Tableau de bord parent"
        breadcrumb={[
          { label: "Tableau de bord", href: "/parent/dashboard" },
          { label: "Journees types", href: "/parent/day-templates" },
          { label: "Lundi" },
        ]}
        parentDisplayName="Parent Demo"
        sidebarCollapsed={false}
        actions={<Button size="sm">Ajouter une entree</Button>}
        onOpenMobileSidebar={() => undefined}
        onToggleSidebarCollapse={() => undefined}
        onLogout={() => undefined}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Fil d'ariane" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Journees types" })).toBeInTheDocument();
    expect(screen.getByText("Lundi")).toBeInTheDocument();
    expect(screen.getByText("Tableau de bord parent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter une entree" })).toBeInTheDocument();
  });

  it("declenche les callbacks de navigation et de deconnexion", () => {
    const onOpenMobileSidebar = vi.fn();
    const onToggleSidebarCollapse = vi.fn();
    const onLogout = vi.fn();

    render(
      <ParentHeader
        title="Tableau de bord"
        breadcrumb={[{ label: "Tableau de bord" }]}
        parentDisplayName="Parent Demo"
        sidebarCollapsed={false}
        onOpenMobileSidebar={onOpenMobileSidebar}
        onToggleSidebarCollapse={onToggleSidebarCollapse}
        onLogout={onLogout}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir la navigation parent" }));
    fireEvent.click(screen.getByRole("button", { name: /Replier la navigation|Déplier la navigation/i }));
    fireEvent.click(screen.getByRole("button", { name: /Deconnexion|Déconnexion/i }));

    expect(onOpenMobileSidebar).toHaveBeenCalledTimes(1);
    expect(onToggleSidebarCollapse).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("ouvre la vue enfant dans un nouvel onglet", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <ParentHeader
        title="Tableau de bord"
        breadcrumb={[{ label: "Tableau de bord" }]}
        parentDisplayName="Parent Demo"
        sidebarCollapsed={false}
        onOpenMobileSidebar={() => undefined}
        onToggleSidebarCollapse={() => undefined}
        onLogout={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Voir comme l'enfant" }));
    expect(openSpy).toHaveBeenCalledWith("/child", "_blank", "noopener,noreferrer");

    openSpy.mockRestore();
  });
});
