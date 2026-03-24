import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParentModuleSubnav } from "@/components/layout/parent-module-subnav";

describe("ParentModuleSubnav", () => {
  it("renders learning tabs for revisions routes", () => {
    render(<ParentModuleSubnav pathname="/parent/revisions/new" />);

    expect(screen.getByRole("link", { name: "Bibliotheque" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Generer (IA)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Livres & fiches" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connaissances" })).toBeInTheDocument();
  });

  it("does not render for unrelated routes", () => {
    const { container } = render(<ParentModuleSubnav pathname="/auth/login" />);
    expect(container).toBeEmptyDOMElement();
  });
});
