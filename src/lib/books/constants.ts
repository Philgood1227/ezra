import type { BookStatus, Subject } from "@/lib/books/types";

export const BOOK_SUBJECT_OPTIONS = ["french", "maths", "german"] as const satisfies readonly Subject[];

export const BOOK_SUBJECT_LABELS: Record<Subject, string> = {
  french: "Francais",
  maths: "Mathematiques",
  german: "Allemand",
};

export const BOOK_LEVEL_OPTIONS = ["5P", "6P", "7P", "8P"] as const;

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  uploaded: "Non indexe",
  indexing: "Indexation en cours",
  indexed: "Indexe",
  error: "Erreur d'indexation",
};
