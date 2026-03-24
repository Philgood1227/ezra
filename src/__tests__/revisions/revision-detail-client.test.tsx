import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevisionDetailClient } from "@/components/parent/revisions/revision-detail-client";
import type { StoredRevisionCard } from "@/lib/revisions/types";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

function buildCard(overrides: Partial<StoredRevisionCard> = {}): StoredRevisionCard {
  return {
    id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Fractions",
    subject: "Maths",
    level: "CM1",
    tags: ["fractions"],
    status: "draft",
    content: {
      kind: "generic",
      summary: "Comparer les fractions de meme denominateur.",
      steps: ["Observer", "Comparer"],
      examples: ["1/2 est plus grand que 1/3"],
      quiz: [],
      tips: ["Dessiner un schema"],
    },
    createdAt: "2026-02-28T10:00:00.000Z",
    updatedAt: "2026-02-28T12:00:00.000Z",
    ...overrides,
  };
}

describe("RevisionDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders read-only preview sections and draft visibility warning", async () => {
    const user = userEvent.setup();
    render(
      <RevisionDetailClient
        card={buildCard()}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    expect(screen.getByRole("heading", { name: "Fractions" })).toBeInTheDocument();
    expect(screen.getByTestId("revision-sheet-empty")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ouvrir Je m'entraine" }));
    expect(screen.getByRole("tab", { name: /Etape 1: A toi !/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Etape 2: Je me teste/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Je retiens/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Je vois/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Mon truc/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editer" })).toHaveAttribute(
      "href",
      "/parent/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6/edit",
    );
    expect(screen.queryByRole("button", { name: "J'ai revise" })).not.toBeInTheDocument();
    expect(screen.getByText("L'enfant voit uniquement les fiches publiees.")).toBeInTheDocument();
  });

  it("publishes and refreshes", async () => {
    const setStatusAction = vi.fn(async () => ({ success: true }));

    render(
      <RevisionDetailClient
        card={buildCard({ status: "draft" })}
        onSetStatusAction={setStatusAction}
        onDeleteAction={vi.fn(async () => ({ success: true }))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => {
      expect(setStatusAction).toHaveBeenCalledWith({
        cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
        status: "published",
      });
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("deletes with confirmation and redirects to library", async () => {
    const deleteAction = vi.fn(async () => ({ success: true }));

    render(
      <RevisionDetailClient
        card={buildCard()}
        onSetStatusAction={vi.fn(async () => ({ success: true }))}
        onDeleteAction={deleteAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer la fiche" }));

    await waitFor(() => {
      expect(deleteAction).toHaveBeenCalledWith({
        cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/parent/revisions");
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
