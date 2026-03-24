import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ParentBooksResourcesPage,
  type CreateBookFormResult,
} from "@/components/parent/books/parent-books-resources-page";
import type { Book } from "@/lib/books/types";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const useSearchParamsMock = vi.hoisted(() => vi.fn(() => new URLSearchParams()));
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastWarningMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
    replace: replaceMock,
  }),
  usePathname: () => "/parent/resources/books",
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/components/ds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ds")>();
  return {
    ...actual,
    useToast: () => ({
      success: toastSuccessMock,
      error: toastErrorMock,
      info: vi.fn(),
      warning: toastWarningMock,
      dismiss: vi.fn(),
    }),
  };
});

function buildBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    subject: "french",
    level: "6P",
    title: "Francais 6P",
    schoolYear: null,
    fileName: "francais6p.pdf",
    filePath: "family-1/book.pdf",
    status: "indexed",
    errorMessage: null,
    indexedText: "Indexed text",
    createdAt: "2026-03-02T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("ParentBooksResourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("renders books list with status labels", () => {
    render(
      <ParentBooksResourcesPage
        books={[
          buildBook(),
          buildBook({
            id: "book-2",
            title: "Maths 6P",
            subject: "maths",
            status: "uploaded",
          }),
        ]}
        onCreateBookAction={vi.fn(async () => ({ success: true, bookId: "book-3" }))}
        onStartBookIndexingAction={vi.fn(async () => ({ success: true }))}
        onDeleteBookAction={vi.fn(async () => ({ success: true }))}
        onGenerateRevisionFromBookAction={vi.fn(async () => ({ success: true, cardId: "card-1" }))}
      />,
    );

    expect(screen.getByText("Francais 6P")).toBeInTheDocument();
    expect(screen.getByText("Maths 6P")).toBeInTheDocument();
    expect(screen.getAllByText("Indexe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Non indexe").length).toBeGreaterThan(0);
  });

  it("submits generation from indexed book and redirects to edit page", async () => {
    const generateAction = vi.fn(async () => ({
      success: true,
      cardId: "card-generated-1",
    }));

    render(
      <ParentBooksResourcesPage
        books={[buildBook()]}
        onCreateBookAction={vi.fn(async () => ({ success: true, bookId: "book-3" }))}
        onStartBookIndexingAction={vi.fn(async () => ({ success: true }))}
        onDeleteBookAction={vi.fn(async () => ({ success: true }))}
        onGenerateRevisionFromBookAction={generateAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fiches depuis les livres" }));
    fireEvent.change(screen.getByLabelText("Notion / titre de fiche"), {
      target: { value: "Complement de nom" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generer une fiche depuis ce livre" }));

    await waitFor(() => {
      expect(generateAction).toHaveBeenCalledWith({
        bookId: "book-1",
        type: "concept",
        topic: "Complement de nom",
      });
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/parent/revisions/card-generated-1/edit");
      expect(refreshMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Fiche creee depuis le manuel.");
    });
  });

  it("creates a book even when client-side PDF read fails", async () => {
    const createAction = vi.fn<(input: unknown) => Promise<CreateBookFormResult>>(
      async (input: unknown) => {
        void input;
        return {
          success: true,
          bookId: "book-created-1",
        };
      },
    );

    const originalFileReader = globalThis.FileReader;
    class FailingFileReader {
      public result: string | ArrayBuffer | null = null;
      public onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsDataURL(): void {
        this.onerror?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    }
    globalThis.FileReader = FailingFileReader as unknown as typeof FileReader;
    try {
      render(
        <ParentBooksResourcesPage
          books={[buildBook({ id: "book-existing" })]}
          onCreateBookAction={createAction}
          onStartBookIndexingAction={vi.fn(async () => ({ success: true }))}
          onDeleteBookAction={vi.fn(async () => ({ success: true }))}
          onGenerateRevisionFromBookAction={vi.fn(async () => ({ success: true, cardId: "card-1" }))}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Ajouter un livre" }));
      fireEvent.change(screen.getByLabelText("Titre du manuel"), {
        target: { value: "Nouveau manuel" },
      });
      fireEvent.change(screen.getByLabelText("PDF"), {
        target: {
          files: [new File(["pdf"], "manuel.pdf", { type: "application/pdf" })],
        },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Ajouter$/ }));

      await waitFor(() => {
        expect(createAction).toHaveBeenCalled();
        const payload = (createAction.mock.calls[0]?.[0] ??
          null) as Record<string, unknown> | null;
        expect(payload).not.toBeNull();
        if (!payload) {
          return;
        }
        expect(payload).toEqual(
          expect.objectContaining({
            fileName: "manuel.pdf",
          }),
        );
        expect("fileBase64" in payload).toBe(false);
      });
      await waitFor(() => {
        expect(toastWarningMock).toHaveBeenCalledWith(
          "Livre ajoute, mais le PDF n'a pas pu etre envoye. Lancez l'indexation pour verifier le fichier.",
        );
        expect(refreshMock).toHaveBeenCalled();
      });
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it("does not create metadata-only book when server action fetch fails with PDF payload", async () => {
    const createAction = vi
      .fn<(input: unknown) => Promise<CreateBookFormResult>>()
      .mockRejectedValueOnce(new Error("Failed to fetch"));

    render(
      <ParentBooksResourcesPage
        books={[buildBook({ id: "book-existing-2" })]}
        onCreateBookAction={createAction}
        onStartBookIndexingAction={vi.fn(async () => ({ success: true }))}
        onDeleteBookAction={vi.fn(async () => ({ success: true }))}
        onGenerateRevisionFromBookAction={vi.fn(async () => ({ success: true, cardId: "card-1" }))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ajouter un livre" }));
    fireEvent.change(screen.getByLabelText("Titre du manuel"), {
      target: { value: "Manuel fallback" },
    });
    fireEvent.change(screen.getByLabelText("PDF"), {
      target: {
        files: [new File(["pdf"], "fallback.pdf", { type: "application/pdf" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Ajouter$/ }));

    await waitFor(() => {
      expect(createAction).toHaveBeenCalledTimes(1);
    });
    const firstPayload = createAction.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(firstPayload).toEqual(expect.objectContaining({ fileName: "fallback.pdf" }));
    expect("fileBase64" in firstPayload).toBe(true);
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Unable to upload PDF due to a network error. Please retry.",
      );
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("deletes a book after confirmation", async () => {
    const deleteAction = vi.fn(async () => ({ success: true }));

    render(
      <ParentBooksResourcesPage
        books={[buildBook({ id: "book-delete-1", title: "A supprimer" })]}
        onCreateBookAction={vi.fn(async () => ({ success: true, bookId: "book-3" }))}
        onStartBookIndexingAction={vi.fn(async () => ({ success: true }))}
        onDeleteBookAction={deleteAction}
        onGenerateRevisionFromBookAction={vi.fn(async () => ({ success: true, cardId: "card-1" }))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    const deleteButtons = screen.getAllByRole("button", { name: /^Supprimer$/ });
    const confirmDeleteButton = deleteButtons[1];
    expect(confirmDeleteButton).toBeDefined();
    if (!confirmDeleteButton) {
      throw new Error("Confirm delete button not found.");
    }
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(deleteAction).toHaveBeenCalledWith({ bookId: "book-delete-1" });
      expect(toastSuccessMock).toHaveBeenCalledWith("Livre supprime.");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("updates query params when books filters change", async () => {
    render(
      <ParentBooksResourcesPage
        books={[
          buildBook({ id: "book-a", subject: "french", status: "uploaded" }),
          buildBook({ id: "book-b", subject: "maths", status: "indexed" }),
        ]}
        onCreateBookAction={vi.fn(async () => ({ success: true, bookId: "book-3" }))}
        onStartBookIndexingAction={vi.fn(async () => ({ success: true }))}
        onDeleteBookAction={vi.fn(async () => ({ success: true }))}
        onGenerateRevisionFromBookAction={vi.fn(async () => ({ success: true, cardId: "card-1" }))}
      />,
    );

    fireEvent.change(screen.getByLabelText("Matiere"), { target: { value: "maths" } });
    fireEvent.change(screen.getByLabelText("Statut"), { target: { value: "indexed" } });
    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "Maths" } });

    await waitFor(() => {
      const hrefCalls = replaceMock.mock.calls.map((call) => String(call[0]));
      expect(hrefCalls.some((href) => href.includes("bookSubject=maths"))).toBe(true);
      expect(hrefCalls.some((href) => href.includes("bookStatus=indexed"))).toBe(true);
      expect(hrefCalls.some((href) => href.includes("bookQuery=Maths"))).toBe(true);
      expect(replaceMock.mock.calls.every((call) => call[1]?.scroll === false)).toBe(true);
    });
  });

  it("supports bulk selection shortcuts and bulk indexing", async () => {
    const startIndexingAction = vi.fn(async () => ({ success: true }));

    render(
      <ParentBooksResourcesPage
        books={[
          buildBook({ id: "book-uploaded", status: "uploaded", title: "Book Uploaded" }),
          buildBook({ id: "book-indexed", status: "indexed", title: "Book Indexed" }),
        ]}
        onCreateBookAction={vi.fn(async () => ({ success: true, bookId: "book-3" }))}
        onStartBookIndexingAction={startIndexingAction}
        onDeleteBookAction={vi.fn(async () => ({ success: true }))}
        onGenerateRevisionFromBookAction={vi.fn(async () => ({ success: true, cardId: "card-1" }))}
      />,
    );

    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    expect(screen.getByText("2 livre(s) selectionne(s)")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "i" });

    await waitFor(() => {
      expect(startIndexingAction).toHaveBeenCalledTimes(1);
      expect(startIndexingAction).toHaveBeenCalledWith({ bookId: "book-uploaded" });
    });

    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByLabelText("Recherche")).toHaveFocus();
  });
});
