export type Subject = "french" | "maths" | "german";

export type BookStatus = "uploaded" | "indexing" | "indexed" | "error";

export interface Book {
  id: string;
  familyId: string;
  createdByProfileId: string | null;
  subject: Subject;
  level: string;
  title: string;
  schoolYear: string | null;
  fileName: string;
  filePath: string;
  status: BookStatus;
  errorMessage: string | null;
  indexedText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookInput {
  subject: Subject;
  level: string;
  title: string;
  schoolYear?: string | null;
  fileName: string;
  fileMimeType?: string | null;
  fileBase64?: string | null;
}

export interface UpdateBookStatusInput {
  bookId: string;
  status: BookStatus;
  errorMessage?: string | null;
  indexedText?: string | null;
}

export interface BookMutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RelevantBookChunk {
  id: string;
  content: string;
  score: number;
}

export interface FindRelevantBookChunksResult {
  bookId: string;
  chunks: RelevantBookChunk[];
  mergedContext: string;
}
