"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  useToast,
} from "@/components/ds";
import {
  BOOK_LEVEL_OPTIONS,
  BOOK_STATUS_LABELS,
  BOOK_SUBJECT_LABELS,
  BOOK_SUBJECT_OPTIONS,
} from "@/lib/books/constants";
import type { Book, Subject } from "@/lib/books/types";
import type { ParentRevisionAIType } from "@/lib/revisions/parent-drafts";

type ResourceTab = "books" | "revisions-from-books";
type ListDensity = "compact" | "comfortable";
const MAX_BOOK_FILE_BYTES = 50 * 1024 * 1024;
const BOOK_FILTER_ALL_VALUE = "__all__";
type BookStatusFilter = Book["status"] | typeof BOOK_FILTER_ALL_VALUE;

export interface CreateBookFormInput {
  subject: Subject;
  level: string;
  title: string;
  schoolYear: string;
  fileName: string;
  fileMimeType?: string;
  fileBase64?: string;
}

export interface CreateBookFormResult {
  success: boolean;
  error?: string;
  bookId?: string;
  fieldErrors?: Partial<Record<keyof CreateBookFormInput, string>>;
}

export interface StartBookIndexingResult {
  success: boolean;
  error?: string;
}

export interface DeleteBookResult {
  success: boolean;
  error?: string;
}

export interface GenerateRevisionFromBookInput {
  bookId: string;
  type: ParentRevisionAIType;
  topic: string;
}

export interface GenerateRevisionFromBookResult {
  success: boolean;
  error?: string;
  cardId?: string;
  fieldErrors?: Partial<Record<keyof GenerateRevisionFromBookInput, string>>;
}

interface ParentBooksResourcesPageProps {
  books: Book[];
  onCreateBookAction: (input: CreateBookFormInput) => Promise<CreateBookFormResult>;
  onStartBookIndexingAction: (input: { bookId: string }) => Promise<StartBookIndexingResult>;
  onDeleteBookAction: (input: { bookId: string }) => Promise<DeleteBookResult>;
  onGenerateRevisionFromBookAction: (
    input: GenerateRevisionFromBookInput,
  ) => Promise<GenerateRevisionFromBookResult>;
}

const GENERATION_TYPES: ParentRevisionAIType[] = ["concept", "procedure"];

function toResourceTab(value: string | null): ResourceTab {
  return value === "revisions-from-books" ? "revisions-from-books" : "books";
}

function toBookSubjectFilter(value: string | null): Subject | typeof BOOK_FILTER_ALL_VALUE {
  if (value && BOOK_SUBJECT_OPTIONS.includes(value as Subject)) {
    return value as Subject;
  }
  return BOOK_FILTER_ALL_VALUE;
}

function toBookStatusFilter(value: string | null): BookStatusFilter {
  if (value === "uploaded" || value === "indexing" || value === "indexed" || value === "error") {
    return value;
  }
  return BOOK_FILTER_ALL_VALUE;
}

function sanitizeBookQuery(value: string | null): string {
  return value ? value.replace(/\s+/g, " ").trim() : "";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusVariant(status: Book["status"]): "warning" | "info" | "success" | "danger" {
  switch (status) {
    case "indexed":
      return "success";
    case "indexing":
      return "info";
    case "error":
      return "danger";
    default:
      return "warning";
  }
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error("Unable to read file."));
    };
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file result."));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function toCreateActionTransportErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (/body exceeded|413|payload too large/i.test(rawMessage)) {
    return "Unable to upload PDF: the file is too large for a single request.";
  }

  if (/failed to fetch|network/i.test(rawMessage)) {
    return "Unable to upload PDF due to a network error. Please retry.";
  }

  return "Unable to create book.";
}

function formatBookErrorMessage(message: string | null): string | null {
  if (!message) {
    return null;
  }

  if (/storage download failed|file not found in storage|resource.*not found|status code 404/i.test(message)) {
    return "Le fichier PDF est introuvable dans le stockage. Supprimez ce livre puis reimportez-le.";
  }

  if (/unable to upload pdf|payload is missing/i.test(message)) {
    return "Le PDF n'a pas pu etre envoye. Supprimez ce livre puis reimportez-le.";
  }

  if (/bucket.*missing|bucket.*not found/i.test(message)) {
    return "Le stockage des livres n'est pas configure (bucket revision-books manquant).";
  }

  if (/permission denied|forbidden|unauthorized|status code 403|status code 401/i.test(message)) {
    return "Acces refuse au stockage PDF. Verifiez les politiques de securite Supabase.";
  }

  if (/^\{\"url\":\"https?:\/\//i.test(message.trim())) {
    return "Le fichier PDF est introuvable ou inaccessible dans le stockage.";
  }

  return message;
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLocaleLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function ParentBooksResourcesPage({
  books,
  onCreateBookAction,
  onStartBookIndexingAction,
  onDeleteBookAction,
  onGenerateRevisionFromBookAction,
}: ParentBooksResourcesPageProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const indexedBooks = React.useMemo(
    () => books.filter((book) => book.status === "indexed"),
    [books],
  );

  const [activeTab, setActiveTab] = React.useState<ResourceTab>(() => toResourceTab(searchParams.get("tab")));
  const [bookSubjectFilter, setBookSubjectFilter] = React.useState<Subject | typeof BOOK_FILTER_ALL_VALUE>(() =>
    toBookSubjectFilter(searchParams.get("bookSubject")),
  );
  const [bookStatusFilter, setBookStatusFilter] = React.useState<BookStatusFilter>(() =>
    toBookStatusFilter(searchParams.get("bookStatus")),
  );
  const [bookQuery, setBookQuery] = React.useState<string>(() => sanitizeBookQuery(searchParams.get("bookQuery")));
  const [listDensity, setListDensity] = React.useState<ListDensity>("compact");
  const [selectedBookIds, setSelectedBookIds] = React.useState<string[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);
  const [createErrorMessage, setCreateErrorMessage] = React.useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = React.useState<
    Partial<Record<keyof CreateBookFormInput, string>>
  >({});
  const [subject, setSubject] = React.useState<Subject>(BOOK_SUBJECT_OPTIONS[0]);
  const [level, setLevel] = React.useState<string>("6P");
  const [title, setTitle] = React.useState<string>("");
  const [schoolYear, setSchoolYear] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const [generationType, setGenerationType] = React.useState<ParentRevisionAIType>("concept");
  const [selectedBookId, setSelectedBookId] = React.useState<string>(indexedBooks[0]?.id ?? "");
  const [topic, setTopic] = React.useState<string>("");
  const [generationErrorMessage, setGenerationErrorMessage] = React.useState<string | null>(null);
  const [generationFieldErrors, setGenerationFieldErrors] = React.useState<
    Partial<Record<keyof GenerateRevisionFromBookInput, string>>
  >({});

  const [pendingIndexBookId, setPendingIndexBookId] = React.useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = React.useState<Book | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isCreatePending, startCreateTransition] = React.useTransition();
  const [isBulkIndexPending, startBulkIndexTransition] = React.useTransition();
  const [isDeletePending, startDeleteTransition] = React.useTransition();
  const [isGeneratePending, startGenerateTransition] = React.useTransition();

  const hasBookFilters =
    bookSubjectFilter !== BOOK_FILTER_ALL_VALUE ||
    bookStatusFilter !== BOOK_FILTER_ALL_VALUE ||
    bookQuery.length > 0;

  const replaceQuery = React.useCallback(
    (nextValues: {
      tab?: ResourceTab;
      bookSubject?: Subject | typeof BOOK_FILTER_ALL_VALUE;
      bookStatus?: BookStatusFilter;
      bookQuery?: string;
    }) => {
      const next = new URLSearchParams(searchParams.toString());

      if (nextValues.tab !== undefined) {
        if (nextValues.tab === "books") {
          next.delete("tab");
        } else {
          next.set("tab", nextValues.tab);
        }
      }

      if (nextValues.bookSubject !== undefined) {
        if (nextValues.bookSubject === BOOK_FILTER_ALL_VALUE) {
          next.delete("bookSubject");
        } else {
          next.set("bookSubject", nextValues.bookSubject);
        }
      }

      if (nextValues.bookStatus !== undefined) {
        if (nextValues.bookStatus === BOOK_FILTER_ALL_VALUE) {
          next.delete("bookStatus");
        } else {
          next.set("bookStatus", nextValues.bookStatus);
        }
      }

      if (nextValues.bookQuery !== undefined) {
        const normalized = sanitizeBookQuery(nextValues.bookQuery);
        if (!normalized) {
          next.delete("bookQuery");
        } else {
          next.set("bookQuery", normalized);
        }
      }

      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    setActiveTab(toResourceTab(searchParams.get("tab")));
  }, [searchParams]);

  React.useEffect(() => {
    setBookSubjectFilter(toBookSubjectFilter(searchParams.get("bookSubject")));
  }, [searchParams]);

  React.useEffect(() => {
    setBookStatusFilter(toBookStatusFilter(searchParams.get("bookStatus")));
  }, [searchParams]);

  React.useEffect(() => {
    setBookQuery(sanitizeBookQuery(searchParams.get("bookQuery")));
  }, [searchParams]);

  React.useEffect(() => {
    if (selectedBookId && indexedBooks.some((book) => book.id === selectedBookId)) {
      return;
    }
    setSelectedBookId(indexedBooks[0]?.id ?? "");
  }, [indexedBooks, selectedBookId]);

  const selectedIndexedBook = React.useMemo(
    () => indexedBooks.find((book) => book.id === selectedBookId) ?? null,
    [indexedBooks, selectedBookId],
  );
  const filteredBooks = React.useMemo(() => {
    const normalizedQuery = bookQuery.toLocaleLowerCase();
    return books.filter((book) => {
      if (bookSubjectFilter !== BOOK_FILTER_ALL_VALUE && book.subject !== bookSubjectFilter) {
        return false;
      }

      if (bookStatusFilter !== BOOK_FILTER_ALL_VALUE && book.status !== bookStatusFilter) {
        return false;
      }

      if (normalizedQuery) {
        const searchable = `${book.title} ${book.fileName} ${book.level}`.toLocaleLowerCase();
        if (!searchable.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [bookQuery, bookStatusFilter, bookSubjectFilter, books]);
  const selectedBooks = React.useMemo(
    () => filteredBooks.filter((book) => selectedBookIds.includes(book.id)),
    [filteredBooks, selectedBookIds],
  );
  const hasBookSelection = selectedBooks.length > 0;
  const allVisibleBooksSelected = filteredBooks.length > 0 && selectedBooks.length === filteredBooks.length;

  React.useEffect(() => {
    setSelectedBookIds((previousSelectedBookIds) =>
      previousSelectedBookIds.filter((bookId) => filteredBooks.some((book) => book.id === bookId)),
    );
  }, [filteredBooks]);

  function resetCreateForm(): void {
    setSubject(BOOK_SUBJECT_OPTIONS[0]);
    setLevel("6P");
    setTitle("");
    setSchoolYear("");
    setSelectedFile(null);
    setCreateErrorMessage(null);
    setCreateFieldErrors({});
  }

  function handleCloseCreateModal(): void {
    if (isCreatePending) {
      return;
    }
    setCreateModalOpen(false);
    resetCreateForm();
  }

  function handleCreateBookSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCreateErrorMessage(null);
    setCreateFieldErrors({});

    if (!selectedFile) {
      setCreateErrorMessage("A PDF file is required.");
      setCreateFieldErrors({ fileName: "A PDF file is required." });
      return;
    }

    if (selectedFile.size > MAX_BOOK_FILE_BYTES) {
      const message = "PDF must be 50 MB or less.";
      setCreateErrorMessage(message);
      setCreateFieldErrors({ fileName: message });
      return;
    }

    startCreateTransition(() => {
      void (async () => {
        let fileBase64: string | null = null;
        let submittedWithoutPdf = false;
        try {
          fileBase64 = await toBase64(selectedFile);
        } catch (error) {
          submittedWithoutPdf = true;
          console.warn("[books] pdf_read_failed_during_upload", {
            fileName: selectedFile.name,
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }

        const createPayload: CreateBookFormInput = {
          subject,
          level,
          title,
          schoolYear,
          fileName: selectedFile.name,
          fileMimeType: selectedFile.type || "application/pdf",
          ...(fileBase64 ? { fileBase64 } : {}),
        };

        let result: CreateBookFormResult;
        try {
          result = await onCreateBookAction(createPayload);
        } catch (error) {
          console.warn("[books] create_book_action_failed_with_pdf_payload", {
            fileName: selectedFile.name,
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          const message = toCreateActionTransportErrorMessage(error);
          setCreateErrorMessage(message);
          setCreateFieldErrors({ fileName: message });
          toast.error(message);
          return;
        }

        if (!result.success) {
          setCreateErrorMessage(result.error ?? "Unable to create book.");
          setCreateFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error ?? "Unable to create book.");
          return;
        }

        if (submittedWithoutPdf || !fileBase64) {
          toast.warning(
            "Livre ajoute, mais le PDF n'a pas pu etre envoye. Lancez l'indexation pour verifier le fichier.",
          );
        } else {
          toast.success("Livre ajoute. Lancez l'indexation pour l'utiliser.");
        }
        handleCloseCreateModal();
        router.refresh();
      })();
    });
  }

  function handleStartIndexing(bookId: string): void {
    setPendingIndexBookId(bookId);
    void (async () => {
      const result = await onStartBookIndexingAction({ bookId });
      if (!result.success) {
        toast.error(result.error ?? "Unable to start indexing.");
        setPendingIndexBookId(null);
        router.refresh();
        return;
      }

      toast.success("Indexation terminee.");
      setPendingIndexBookId(null);
      router.refresh();
    })();
  }

  function handleRequestDelete(book: Book): void {
    if (isDeletePending) {
      return;
    }
    setBookToDelete(book);
  }

  function handleCancelDelete(): void {
    if (isDeletePending) {
      return;
    }
    setBookToDelete(null);
  }

  function handleConfirmDelete(): void {
    if (!bookToDelete) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        const result = await onDeleteBookAction({ bookId: bookToDelete.id });
        if (!result.success) {
          toast.error(result.error ?? "Unable to delete book.");
          return;
        }

        toast.success("Livre supprime.");
        setBookToDelete(null);
        router.refresh();
      })();
    });
  }

  function toggleBookSelection(bookId: string): void {
    setSelectedBookIds((previousSelectedBookIds) =>
      previousSelectedBookIds.includes(bookId)
        ? previousSelectedBookIds.filter((existingId) => existingId !== bookId)
        : [...previousSelectedBookIds, bookId],
    );
  }

  function toggleSelectAllVisibleBooks(): void {
    setSelectedBookIds(allVisibleBooksSelected ? [] : filteredBooks.map((book) => book.id));
  }

  function clearBookSelection(): void {
    setSelectedBookIds([]);
  }

  const handleBulkIndex = React.useCallback((): void => {
    if (!hasBookSelection) {
      return;
    }

    startBulkIndexTransition(() => {
      void (async () => {
        const booksToIndex = selectedBooks.filter((book) => book.status !== "indexed");
        if (booksToIndex.length === 0) {
          toast.warning("La selection est deja indexee.");
          return;
        }

        for (const book of booksToIndex) {
          const result = await onStartBookIndexingAction({ bookId: book.id });
          if (!result.success) {
            toast.error(result.error ?? "Unable to start indexing.");
            router.refresh();
            return;
          }
        }

        toast.success(`${booksToIndex.length} livre(s) indexes.`);
        setSelectedBookIds([]);
        router.refresh();
      })();
    });
  }, [hasBookSelection, onStartBookIndexingAction, router, selectedBooks, toast]);

  function handleBulkDelete(): void {
    if (!hasBookSelection) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        for (const book of selectedBooks) {
          const result = await onDeleteBookAction({ bookId: book.id });
          if (!result.success) {
            toast.error(result.error ?? "Unable to delete book.");
            return;
          }
        }

        toast.success(`${selectedBooks.length} livre(s) supprimes.`);
        setBulkDeleteDialogOpen(false);
        setSelectedBookIds([]);
        router.refresh();
      })();
    });
  }

  function handleGenerateSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setGenerationErrorMessage(null);
    setGenerationFieldErrors({});

    startGenerateTransition(() => {
      void (async () => {
        const result = await onGenerateRevisionFromBookAction({
          bookId: selectedBookId,
          type: generationType,
          topic,
        });

        if (!result.success) {
          setGenerationErrorMessage(result.error ?? "Unable to generate revision.");
          setGenerationFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error ?? "Unable to generate revision.");
          return;
        }

        if (!result.cardId) {
          setGenerationErrorMessage("Generation succeeded but no card id was returned.");
          toast.error("Generation succeeded but no card id was returned.");
          return;
        }

        toast.success("Fiche creee depuis le manuel.");
        router.push(`/parent/revisions/${result.cardId}/edit`);
        router.refresh();
      })();
    });
  }

  function handleResetBookFilters(): void {
    setBookSubjectFilter(BOOK_FILTER_ALL_VALUE);
    setBookStatusFilter(BOOK_FILTER_ALL_VALUE);
    setBookQuery("");
    replaceQuery({
      bookSubject: BOOK_FILTER_ALL_VALUE,
      bookStatus: BOOK_FILTER_ALL_VALUE,
      bookQuery: "",
    });
  }

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (activeTab !== "books") {
        return;
      }

      if (isTextInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLocaleLowerCase();
      const hasMeta = event.ctrlKey || event.metaKey;

      if (hasMeta && key === "a") {
        event.preventDefault();
        setSelectedBookIds(filteredBooks.map((book) => book.id));
        return;
      }

      if (key === "/") {
        event.preventDefault();
        const searchInput = document.getElementById("books-filter-search");
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (key === "escape" && hasBookSelection) {
        event.preventDefault();
        clearBookSelection();
        return;
      }

      if (key === "d") {
        event.preventDefault();
        setListDensity((previousDensity) => (previousDensity === "compact" ? "comfortable" : "compact"));
        return;
      }

      if (!hasBookSelection) {
        return;
      }

      if (key === "i") {
        event.preventDefault();
        handleBulkIndex();
        return;
      }

      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        setBulkDeleteDialogOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTab, filteredBooks, hasBookSelection, handleBulkIndex, selectedBooks]);

  return (
    <div className="space-y-4">
      <Card className="sticky top-3 z-20 border-brand-100/45 bg-bg-base/95 backdrop-blur supports-[backdrop-filter]:bg-bg-base/85">
        <CardContent className="space-y-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={activeTab === "books" ? "premium" : "secondary"}
              onClick={() => {
                setActiveTab("books");
                replaceQuery({ tab: "books" });
              }}
            >
              Livres
            </Button>
            <Button
              type="button"
              variant={activeTab === "revisions-from-books" ? "premium" : "secondary"}
              onClick={() => {
                setActiveTab("revisions-from-books");
                replaceQuery({ tab: "revisions-from-books" });
              }}
            >
              Fiches depuis les livres
            </Button>
          </div>

          {activeTab === "books" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
              <div className="space-y-1.5">
                <label htmlFor="books-filter-subject" className="text-sm font-semibold text-text-primary">
                  Matiere
                </label>
                <Select
                  id="books-filter-subject"
                  value={bookSubjectFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value !== BOOK_FILTER_ALL_VALUE && !BOOK_SUBJECT_OPTIONS.includes(value as Subject)) {
                      return;
                    }
                    const nextValue = value as Subject | typeof BOOK_FILTER_ALL_VALUE;
                    setBookSubjectFilter(nextValue);
                    replaceQuery({ bookSubject: nextValue });
                  }}
                >
                  <option value={BOOK_FILTER_ALL_VALUE}>Toutes les matieres</option>
                  {BOOK_SUBJECT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {BOOK_SUBJECT_LABELS[option]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="books-filter-status" className="text-sm font-semibold text-text-primary">
                  Statut
                </label>
                <Select
                  id="books-filter-status"
                  value={bookStatusFilter}
                  onChange={(event) => {
                    const nextValue = toBookStatusFilter(event.target.value);
                    setBookStatusFilter(nextValue);
                    replaceQuery({ bookStatus: nextValue });
                  }}
                >
                  <option value={BOOK_FILTER_ALL_VALUE}>Tous les statuts</option>
                  <option value="uploaded">{BOOK_STATUS_LABELS.uploaded}</option>
                  <option value="indexing">{BOOK_STATUS_LABELS.indexing}</option>
                  <option value="indexed">{BOOK_STATUS_LABELS.indexed}</option>
                  <option value="error">{BOOK_STATUS_LABELS.error}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="books-filter-search" className="text-sm font-semibold text-text-primary">
                  Recherche
                </label>
                <Input
                  id="books-filter-search"
                  value={bookQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setBookQuery(nextValue);
                    replaceQuery({ bookQuery: nextValue });
                  }}
                  placeholder="Titre, fichier ou niveau"
                />
              </div>
              <div className="flex items-end gap-2">
                <Badge variant="neutral">{filteredBooks.length} livre(s)</Badge>
                {hasBookFilters ? (
                  <Button type="button" variant="tertiary" size="sm" onClick={handleResetBookFilters}>
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "books" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <Select
                id="books-density"
                value={listDensity}
                onChange={(event) => {
                  const nextDensity = event.target.value;
                  if (nextDensity === "compact" || nextDensity === "comfortable") {
                    setListDensity(nextDensity);
                  }
                }}
                className="w-auto min-w-36"
              >
                <option value="compact">Compact table</option>
                <option value="comfortable">Comfortable rows</option>
              </Select>
              <span>Shortcuts: Ctrl/Cmd+A select all, I index, Delete remove, / search, D density.</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {activeTab === "books" ? (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Livres</CardTitle>
              <CardDescription>
                Upload PDF manuals and monitor indexing status before generating revision cards.
              </CardDescription>
            </div>
            <Button type="button" variant="premium" onClick={() => setCreateModalOpen(true)}>
              Ajouter un livre
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {books.length === 0 ? (
              <EmptyState
                icon="B"
                title="Aucun livre"
                description="Ajoutez un manuel PDF pour commencer la base de connaissance."
                action={{
                  label: "Ajouter un livre",
                  onClick: () => setCreateModalOpen(true),
                }}
              />
            ) : filteredBooks.length === 0 ? (
              <EmptyState
                icon="B"
                title="Aucun livre pour ces filtres"
                description="Ajustez vos filtres ou reinitialisez-les pour voir tous les livres."
                action={{
                  label: "Reset filters",
                  onClick: handleResetBookFilters,
                }}
              />
            ) : (
              <>
                {hasBookSelection ? (
                  <Card className="border-brand-200 bg-brand-50/50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <p className="text-sm font-semibold text-text-primary">
                        {selectedBooks.length} livre(s) selectionne(s)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={isBulkIndexPending}
                          disabled={isDeletePending}
                          onClick={handleBulkIndex}
                        >
                          Indexer selection
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={isDeletePending || isBulkIndexPending}
                          onClick={() => setBulkDeleteDialogOpen(true)}
                        >
                          Supprimer selection
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="tertiary"
                          disabled={isDeletePending || isBulkIndexPending}
                          onClick={clearBookSelection}
                        >
                          Effacer selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="overflow-x-auto rounded-radius-lg border border-border-subtle bg-bg-surface/80">
                  <table className="min-w-full text-sm">
                    <thead className="bg-bg-base/75 text-left text-xs uppercase tracking-wide text-text-secondary">
                      <tr>
                        <th className="w-10 px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label="Select all visible books"
                            checked={allVisibleBooksSelected}
                            onChange={toggleSelectAllVisibleBooks}
                          />
                        </th>
                        <th className="px-3 py-2">Titre</th>
                        <th className="px-3 py-2">Matiere</th>
                        <th className="px-3 py-2">Niveau</th>
                        <th className="px-3 py-2">Statut</th>
                        <th className="px-3 py-2">Ajout</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((book) => {
                        const isSelected = selectedBookIds.includes(book.id);
                        const rowPadding = listDensity === "compact" ? "py-2" : "py-3.5";
                        return (
                          <tr
                            key={book.id}
                            className={`border-t border-border-subtle/80 ${isSelected ? "bg-brand-50/40" : "bg-transparent"}`}
                          >
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${book.title}`}
                                checked={isSelected}
                                onChange={() => toggleBookSelection(book.id)}
                              />
                            </td>
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <p className="font-semibold text-text-primary">{book.title}</p>
                              <p className="mt-1 text-xs text-text-secondary">{book.fileName}</p>
                              {book.errorMessage ? (
                                <p className="mt-1 text-xs font-medium text-status-error">
                                  {formatBookErrorMessage(book.errorMessage)}
                                </p>
                              ) : null}
                            </td>
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <Badge variant="neutral">{BOOK_SUBJECT_LABELS[book.subject]}</Badge>
                            </td>
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <Badge variant="neutral">{book.level}</Badge>
                            </td>
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <Badge variant={statusVariant(book.status)}>{BOOK_STATUS_LABELS[book.status]}</Badge>
                            </td>
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <span className="text-text-secondary">{formatDate(book.createdAt)}</span>
                            </td>
                            <td className={`px-3 align-top ${rowPadding}`}>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {book.status !== "indexed" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    loading={pendingIndexBookId === book.id}
                                    onClick={() => handleStartIndexing(book.id)}
                                  >
                                    Indexer
                                  </Button>
                                ) : (
                                  <Badge variant="success">Pret</Badge>
                                )}
                                <Button type="button" size="sm" variant="danger" onClick={() => handleRequestDelete(book)}>
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Fiches depuis les livres</CardTitle>
            <CardDescription>
              Select an indexed manual, choose a target type and topic, then generate a structured draft card.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {indexedBooks.length === 0 ? (
              <EmptyState
                icon="R"
                title="Aucun livre indexe"
                description="Ajoutez un livre et lancez son indexation avant de generer une fiche."
                action={{
                  label: "Aller a Livres",
                  onClick: () => {
                    setActiveTab("books");
                    replaceQuery({ tab: "books" });
                  },
                }}
              />
            ) : (
              <form className="space-y-4" onSubmit={handleGenerateSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="book-generation-book" className="text-sm font-semibold text-text-primary">
                    Livre indexe
                  </label>
                  <Select
                    id="book-generation-book"
                    value={selectedBookId}
                    onChange={(event) => {
                      setSelectedBookId(event.target.value);
                    }}
                    errorMessage={generationFieldErrors.bookId}
                  >
                    {indexedBooks.map((book) => (
                      <option key={book.id} value={book.id}>
                        {`${book.title} (${BOOK_SUBJECT_LABELS[book.subject]} - ${book.level})`}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="book-generation-type" className="text-sm font-semibold text-text-primary">
                      Type
                    </label>
                    <Select
                      id="book-generation-type"
                      value={generationType}
                      onChange={(event) => {
                        const value = event.target.value as ParentRevisionAIType;
                        if (GENERATION_TYPES.includes(value)) {
                          setGenerationType(value);
                        }
                      }}
                      errorMessage={generationFieldErrors.type}
                    >
                      <option value="concept">Concept</option>
                      <option value="procedure">Procedure</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="book-generation-level" className="text-sm font-semibold text-text-primary">
                      Niveau (depuis le livre)
                    </label>
                    <Input id="book-generation-level" value={selectedIndexedBook?.level ?? ""} disabled />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="book-generation-topic" className="text-sm font-semibold text-text-primary">
                    Notion / titre de fiche
                  </label>
                  <Input
                    id="book-generation-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Complement de nom"
                    errorMessage={generationFieldErrors.topic}
                  />
                </div>

                <div className="space-y-1 text-sm text-text-secondary">
                  <p>
                    Matiere detectee:{" "}
                    <span className="font-semibold text-text-primary">
                      {selectedIndexedBook ? BOOK_SUBJECT_LABELS[selectedIndexedBook.subject] : "-"}
                    </span>
                  </p>
                </div>

                {generationErrorMessage ? (
                  <p role="alert" className="text-sm font-semibold text-status-error">
                    {generationErrorMessage}
                  </p>
                ) : null}

                <Button type="submit" variant="premium" loading={isGeneratePending}>
                  Generer une fiche depuis ce livre
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Ajouter un livre"
        description="Ajoutez un manuel PDF puis lancez son indexation."
      >
        <form className="space-y-3" onSubmit={handleCreateBookSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="book-file" className="text-sm font-semibold text-text-primary">
              PDF
            </label>
            <Input
              id="book-file"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
              errorMessage={createFieldErrors.fileName}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="book-subject" className="text-sm font-semibold text-text-primary">
              Matiere
            </label>
            <Select
              id="book-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value as Subject)}
              errorMessage={createFieldErrors.subject}
            >
              {BOOK_SUBJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {BOOK_SUBJECT_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="book-level" className="text-sm font-semibold text-text-primary">
              Niveau
            </label>
            <Select
              id="book-level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              errorMessage={createFieldErrors.level}
            >
              {BOOK_LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="book-title" className="text-sm font-semibold text-text-primary">
              Titre du manuel
            </label>
            <Input
              id="book-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Francais 6P - Cahier de reference"
              errorMessage={createFieldErrors.title}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="book-school-year" className="text-sm font-semibold text-text-primary">
              Annee scolaire (optionnel)
            </label>
            <Input
              id="book-school-year"
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
              placeholder="2025-2026"
              errorMessage={createFieldErrors.schoolYear}
            />
          </div>

          {createErrorMessage ? (
            <p role="alert" className="text-sm font-semibold text-status-error">
              {createErrorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseCreateModal}>
              Annuler
            </Button>
            <Button type="submit" variant="premium" loading={isCreatePending}>
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={bookToDelete !== null}
        title="Supprimer ce livre ?"
        {...(bookToDelete
          ? {
              description: `Le livre "${bookToDelete.title}" sera supprime ainsi que son fichier PDF.`,
            }
          : {})}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={isDeletePending}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        title="Supprimer la selection ?"
        description={`Les ${selectedBooks.length} livres selectionnes seront supprimes, ainsi que leurs PDF.`}
        confirmLabel="Supprimer la selection"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={isDeletePending}
        onCancel={() => {
          if (!isDeletePending) {
            setBulkDeleteDialogOpen(false);
          }
        }}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

