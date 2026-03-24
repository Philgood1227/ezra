import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RevisionLibraryClient,
  type ParentRevisionListFilters,
} from "@/components/parent/revisions/revision-library-client";
import { REVISION_LIBRARY_STATUS_FILTERS } from "@/lib/revisions/constants";
import type { RevisionCardLibraryItem } from "@/lib/revisions/types";

const refreshMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const useSearchParamsMock = vi.hoisted(() => vi.fn(() => new URLSearchParams()));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => "/parent/revisions",
  useSearchParams: () => useSearchParamsMock(),
}));

function buildCard(overrides: Partial<RevisionCardLibraryItem> = {}): RevisionCardLibraryItem {
  return {
    id: "card-1",
    title: "Table de 9",
    subject: "Maths",
    level: "CM1",
    tags: ["tables"],
    kind: "generic",
    status: "draft",
    createdByProfileId: "parent-1",
    createdAt: "2026-02-28T10:00:00.000Z",
    updatedAt: "2026-02-28T12:00:00.000Z",
    ...overrides,
  };
}

const defaultFilters: ParentRevisionListFilters = {};

describe("RevisionLibraryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("renders revision rows and badges", () => {
    render(
      <RevisionLibraryClient
        cards={[
          buildCard({ id: "card-1", status: "published", kind: "procedure" }),
          buildCard({ id: "card-2", title: "Fractions", status: "draft", kind: "generic" }),
        ]}
        filters={defaultFilters}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    expect(screen.getByText("Table de 9")).toBeInTheDocument();
    expect(screen.getByText("Fractions")).toBeInTheDocument();
    expect(screen.getAllByText("published").length).toBeGreaterThan(0);
    expect(screen.getAllByText("draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Procedure").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Generic").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Edit" }).length).toBeGreaterThan(0);
  });

  it("calls publish action with the expected next status", async () => {
    const setStatusAction = vi.fn(async () => ({ success: true }));

    render(
      <RevisionLibraryClient
        cards={[buildCard({ id: "card-10", status: "draft" })]}
        filters={defaultFilters}
        onSetStatusAction={setStatusAction}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => {
      expect(setStatusAction).toHaveBeenCalledWith({
        cardId: "card-10",
        status: "published",
      });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("renders subject/type/level/status filters", () => {
    render(
      <RevisionLibraryClient
        cards={[buildCard()]}
        filters={defaultFilters}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Level")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();

    const statusSelect = screen.getByLabelText("Status") as HTMLSelectElement;
    const statusValues = Array.from(statusSelect.options).map((option) => option.value);
    expect(statusValues).toEqual([...REVISION_LIBRARY_STATUS_FILTERS]);
  });

  it("updates query params when filters change", async () => {
    render(
      <RevisionLibraryClient
        cards={[
          buildCard({ subject: "Maths", level: "6P", kind: "concept" }),
          buildCard({ id: "card-2", subject: "Francais", level: "7P", kind: "vocab" }),
        ]}
        filters={defaultFilters}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Maths" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "concept" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "6P" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "draft" } });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
      const hrefCalls = replaceMock.mock.calls.map((call) => String(call[0]));
      expect(hrefCalls.some((href) => href === "/parent/revisions?subject=Maths")).toBe(true);
      expect(hrefCalls.some((href) => href === "/parent/revisions?type=concept")).toBe(true);
      expect(hrefCalls.some((href) => href === "/parent/revisions?level=6P")).toBe(true);
      expect(hrefCalls.some((href) => href === "/parent/revisions?status=draft")).toBe(true);
      expect(replaceMock.mock.calls.every((call) => call[1]?.scroll === false)).toBe(true);
    });
  });

  it("requires delete confirmation before calling delete action", async () => {
    const deleteAction = vi.fn(async () => ({ success: true }));

    render(
      <RevisionLibraryClient
        cards={[buildCard({ id: "card-20", title: "Fractions" })]}
        filters={defaultFilters}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={deleteAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer la fiche" }));

    await waitFor(() => {
      expect(deleteAction).toHaveBeenCalledWith({ cardId: "card-20" });
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows manual and AI creation CTAs in empty state", () => {
    render(
      <RevisionLibraryClient
        cards={[]}
        filters={defaultFilters}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    expect(screen.getByRole("button", { name: "Nouvelle fiche" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generer une fiche" })).toBeInTheDocument();
  });

  it("supports keyboard shortcuts for bulk selection and publish", async () => {
    const setStatusAction = vi.fn(async () => ({ success: true }));

    render(
      <RevisionLibraryClient
        cards={[
          buildCard({ id: "card-11", status: "draft" }),
          buildCard({ id: "card-12", title: "Card 2", status: "draft" }),
        ]}
        filters={defaultFilters}
        onSetStatusAction={setStatusAction}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    expect(screen.getByText("2 fiche(s) selectionnee(s)")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "p" });

    await waitFor(() => {
      expect(setStatusAction).toHaveBeenCalledWith({ cardId: "card-11", status: "published" });
      expect(setStatusAction).toHaveBeenCalledWith({ cardId: "card-12", status: "published" });
    });

    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByLabelText("Quick search")).toHaveFocus();
  });
});
