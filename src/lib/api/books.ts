import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import {
  createDemoBook,
  deleteDemoBook,
  getDemoBookById,
  listDemoBooks,
  updateDemoBookStatus,
} from "@/lib/demo/books-store";
import type {
  Book,
  BookMutationResult,
  CreateBookInput,
  Subject,
  UpdateBookStatusInput,
} from "@/lib/books/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RevisionBookRow = Database["public"]["Tables"]["revision_books"]["Row"];

interface FamilyContext {
  familyId: string;
  profileId: string;
  role: "parent" | "child" | "viewer";
}

const BOOK_FILE_BUCKET = "revision-books";

const createBookInputSchema = z.object({
  subject: z.enum(["french", "maths", "german"]),
  level: z
    .string()
    .max(120, "Level is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length > 0, "Level is required."),
  title: z
    .string()
    .max(200, "Title is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length >= 2, "Title must contain at least 2 characters."),
  schoolYear: z
    .string()
    .max(80, "School year is too long.")
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }

      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  fileName: z
    .string()
    .max(240, "File name is too long.")
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => value.length > 0, "A PDF file is required."),
  fileMimeType: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  fileBase64: z
    .string()
    .max(70_000_000, "PDF payload is too large.")
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }
      const cleaned = value.trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
});

const updateBookStatusInputSchema = z.object({
  bookId: z.string().uuid("Invalid book id."),
  status: z.enum(["uploaded", "indexing", "indexed", "error"]),
  errorMessage: z
    .string()
    .max(800)
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }

      const cleaned = value.replace(/\s+/g, " ").trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
  indexedText: z
    .string()
    .max(60_000)
    .optional()
    .nullable()
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }

      const cleaned = value.trim();
      return cleaned.length > 0 ? cleaned : null;
    }),
});

const bookIdSchema = z.string().uuid("Invalid book id.");

function mapBookRow(row: RevisionBookRow): Book {
  return {
    id: row.id,
    familyId: row.family_id,
    createdByProfileId: row.created_by_profile_id,
    subject: row.subject as Subject,
    level: row.level,
    title: row.title,
    schoolYear: row.school_year,
    fileName: row.file_name,
    filePath: row.file_path,
    status: row.status,
    errorMessage: row.error_message,
    indexedText: row.indexed_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFileName(fileName: string): string {
  return fileName
    .toLocaleLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStoragePath(familyId: string, fileName: string): string {
  const safeName = normalizeFileName(fileName) || "book.pdf";
  return `${familyId}/${randomUUID()}-${safeName}`;
}

function isSupabaseConfigured(): boolean {
  return isSupabaseEnabled();
}

async function getFamilyContext(): Promise<FamilyContext | null> {
  const context = await getCurrentProfile();
  if (!context.familyId || !context.profile?.id || context.role === "anonymous") {
    return null;
  }

  return {
    familyId: context.familyId,
    profileId: context.profile.id,
    role: context.role,
  };
}

function buildDeniedResult<T>(message: string): BookMutationResult<T> {
  return {
    success: false,
    error: message,
  };
}

function mapSupabaseBookError(error: PostgrestError | null, fallbackMessage: string): string {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === "42P01") {
    return "Schema error: revision_books table is missing. Apply Supabase migrations.";
  }

  if (error.code === "42501") {
    return "Permission denied by RLS. Verify parent session and revision_books policies.";
  }

  if (error.code === "23503") {
    return "Invalid family/profile reference. Parent profile may be missing in database.";
  }

  return `${fallbackMessage} (${error.code ?? "unknown"}: ${error.message})`;
}

async function uploadBookToStorage(input: {
  filePath: string;
  fileMimeType: string | null;
  fileBase64: string;
}): Promise<{ success: boolean; errorMessage?: string }> {
  const binary = Buffer.from(input.fileBase64, "base64");
  const contentType = input.fileMimeType ?? "application/pdf";
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
  const { error } = await client.storage
    .from(BOOK_FILE_BUCKET)
    .upload(input.filePath, binary, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.warn("[books] storage_upload_failed", {
      code: error.name,
      message: error.message,
      filePath: input.filePath,
    });
    return {
      success: false,
      errorMessage: `Unable to upload PDF: ${error.message}`,
    };
  }

  return { success: true };
}

export async function listBooksForParent(): Promise<Book[]> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return listDemoBooks(context.familyId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revision_books")
    .select("*")
    .eq("family_id", context.familyId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapBookRow(row as RevisionBookRow));
}

export async function listIndexedBooksForParent(): Promise<Book[]> {
  const books = await listBooksForParent();
  return books.filter((book) => book.status === "indexed");
}

export async function getBookById(bookId: string): Promise<Book | null> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return null;
  }

  const parsedId = bookIdSchema.safeParse(bookId);
  if (!parsedId.success) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return getDemoBookById(context.familyId, parsedId.data);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revision_books")
    .select("*")
    .eq("id", parsedId.data)
    .eq("family_id", context.familyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBookRow(data as RevisionBookRow);
}

export async function createBook(input: CreateBookInput): Promise<BookMutationResult<Book>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsed = createBookInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildDeniedResult(parsed.error.issues[0]?.message ?? "Invalid book input.");
  }

  const filePath = buildStoragePath(context.familyId, parsed.data.fileName);

  if (!isSupabaseConfigured()) {
    const created = createDemoBook(context.familyId, context.profileId, parsed.data, filePath);
    if (!parsed.data.fileBase64) {
      const errored = updateDemoBookStatus(context.familyId, {
        bookId: created.id,
        status: "error",
        errorMessage: "Unable to upload PDF: file payload is missing.",
      });
      return {
        success: true,
        data: errored ?? created,
      };
    }

    return {
      success: true,
      data: created,
    };
  }

  let initialStatus: "uploaded" | "error" = "uploaded";
  let initialErrorMessage: string | null = null;

  if (parsed.data.fileBase64) {
    const uploadResult = await uploadBookToStorage({
      filePath,
      fileMimeType: parsed.data.fileMimeType,
      fileBase64: parsed.data.fileBase64,
    });
    if (!uploadResult.success) {
      initialStatus = "error";
      initialErrorMessage = uploadResult.errorMessage ?? "Unable to upload PDF.";
    }
  } else {
    initialStatus = "error";
    initialErrorMessage = "Unable to upload PDF: file payload is missing.";
    console.warn("[books] create_without_pdf_payload", {
      familyId: context.familyId,
      profileId: context.profileId,
      fileName: parsed.data.fileName,
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("revision_books")
    .insert({
      family_id: context.familyId,
      created_by_profile_id: context.profileId,
      subject: parsed.data.subject,
      level: parsed.data.level,
      title: parsed.data.title,
      school_year: parsed.data.schoolYear,
      file_name: parsed.data.fileName,
      file_path: filePath,
      status: initialStatus,
      error_message: initialErrorMessage,
      indexed_text: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[books] create_failed", {
      familyId: context.familyId,
      profileId: context.profileId,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      errorDetails: error?.details ?? null,
      errorHint: error?.hint ?? null,
    });
    return buildDeniedResult(mapSupabaseBookError(error, "Unable to create book."));
  }

  return {
    success: true,
    data: mapBookRow(data as RevisionBookRow),
  };
}

export async function updateBookStatus(
  input: UpdateBookStatusInput,
): Promise<BookMutationResult<Book>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsed = updateBookStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    return buildDeniedResult(parsed.error.issues[0]?.message ?? "Invalid status update.");
  }

  if (!isSupabaseConfigured()) {
    const updated = updateDemoBookStatus(context.familyId, parsed.data);
    if (!updated) {
      return buildDeniedResult("Book not found.");
    }

    return {
      success: true,
      data: updated,
    };
  }

  const supabase = await createSupabaseServerClient();
  const payload: Database["public"]["Tables"]["revision_books"]["Update"] = {
    status: parsed.data.status,
    error_message: parsed.data.errorMessage ?? null,
  };
  if (parsed.data.indexedText !== undefined) {
    payload.indexed_text = parsed.data.indexedText;
  }
  const { data, error } = await supabase
    .from("revision_books")
    .update(payload)
    .eq("id", parsed.data.bookId)
    .eq("family_id", context.familyId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("[books] update_status_failed", {
      familyId: context.familyId,
      profileId: context.profileId,
      bookId: parsed.data.bookId,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      errorDetails: error?.details ?? null,
      errorHint: error?.hint ?? null,
    });
    return buildDeniedResult(mapSupabaseBookError(error, "Unable to update book status."));
  }

  return {
    success: true,
    data: mapBookRow(data as RevisionBookRow),
  };
}

export async function deleteBook(bookId: string): Promise<BookMutationResult<Book>> {
  const context = await getFamilyContext();
  if (!context || context.role !== "parent") {
    return buildDeniedResult("Action reservee au parent.");
  }

  const parsedId = bookIdSchema.safeParse(bookId);
  if (!parsedId.success) {
    return buildDeniedResult(parsedId.error.issues[0]?.message ?? "Invalid book id.");
  }

  if (!isSupabaseConfigured()) {
    const deleted = deleteDemoBook(context.familyId, parsedId.data);
    if (!deleted) {
      return buildDeniedResult("Book not found.");
    }
    return {
      success: true,
      data: deleted,
    };
  }

  const book = await getBookById(parsedId.data);
  if (!book) {
    return buildDeniedResult("Book not found.");
  }

  try {
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient();
    const { error: storageError } = await storageClient.storage.from(BOOK_FILE_BUCKET).remove([book.filePath]);
    if (storageError) {
      console.warn("[books] storage_delete_failed", {
        code: storageError.name,
        message: storageError.message,
        filePath: book.filePath,
      });
    }
  } catch (error) {
    console.warn("[books] storage_delete_unexpected_error", {
      filePath: book.filePath,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("revision_books")
    .delete()
    .eq("id", parsedId.data)
    .eq("family_id", context.familyId);

  if (error) {
    console.error("[books] delete_failed", {
      familyId: context.familyId,
      profileId: context.profileId,
      bookId: parsedId.data,
      errorCode: error.code ?? null,
      errorMessage: error.message ?? null,
      errorDetails: error.details ?? null,
      errorHint: error.hint ?? null,
    });
    return buildDeniedResult(mapSupabaseBookError(error, "Unable to delete book."));
  }

  return {
    success: true,
    data: book,
  };
}

function buildIndexedStubText(book: Book): string {
  return [
    `Titre du manuel: ${book.title}`,
    `Matiere: ${book.subject}`,
    `Niveau: ${book.level}`,
    "Extrait indexe (stub):",
    "Le contenu detaille du PDF sera relie a l'indexation RAG dans une etape ulterieure.",
  ].join("\n");
}

const PDF_INDEX_MIN_CONTENT_CHARS = 200;
const PDF_INDEX_MAX_TEXT_CHARS = 55_000;

function decodePdfLiteral(literal: string): string {
  let result = "";
  for (let index = 0; index < literal.length; index += 1) {
    const char = literal[index];
    if (char !== "\\") {
      result += char;
      continue;
    }

    const next = literal[index + 1];
    if (!next) {
      break;
    }

    if (next === "n") {
      result += "\n";
      index += 1;
      continue;
    }
    if (next === "r") {
      result += "\r";
      index += 1;
      continue;
    }
    if (next === "t") {
      result += "\t";
      index += 1;
      continue;
    }
    if (next === "b") {
      result += "\b";
      index += 1;
      continue;
    }
    if (next === "f") {
      result += "\f";
      index += 1;
      continue;
    }
    if (next === "(" || next === ")" || next === "\\") {
      result += next;
      index += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      const octal = literal.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? "";
      if (octal) {
        result += String.fromCharCode(Number.parseInt(octal, 8));
        index += octal.length;
        continue;
      }
    }

    result += next;
    index += 1;
  }

  return result;
}

function decodePdfHexText(hex: string): string {
  const sanitized = hex.replace(/[^0-9a-fA-F]/g, "");
  if (sanitized.length === 0) {
    return "";
  }

  const evenHex = sanitized.length % 2 === 0 ? sanitized : `${sanitized}0`;
  try {
    return Buffer.from(evenHex, "hex").toString("latin1");
  } catch {
    return "";
  }
}

function normalizeIndexedText(value: string): string {
  return value
    .replace(/\x00/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function extractPdfTextSegments(rawPdf: string): string[] {
  const segments: string[] = [];
  const textBlocks = rawPdf.match(/BT[\s\S]*?ET/g) ?? [];

  for (const block of textBlocks) {
    const inlineLiteralMatches = block.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) ?? [];
    for (const match of inlineLiteralMatches) {
      const literal = match.replace(/\s*Tj$/, "").trim();
      const unwrapped = literal.startsWith("(") && literal.endsWith(")")
        ? literal.slice(1, -1)
        : literal;
      const decoded = decodePdfLiteral(unwrapped).trim();
      if (decoded.length > 0) {
        segments.push(decoded);
      }
    }

    const inlineHexMatches = block.match(/<([0-9a-fA-F\s]+)>\s*Tj/g) ?? [];
    for (const match of inlineHexMatches) {
      const inner = match.match(/<([0-9a-fA-F\s]+)>/)?.[1] ?? "";
      const decoded = decodePdfHexText(inner).trim();
      if (decoded.length > 0) {
        segments.push(decoded);
      }
    }

    const arrayMatches = block.match(/\[[^\]]+\]\s*TJ/g) ?? [];
    for (const match of arrayMatches) {
      const arrayContent = match.match(/^\[([\s\S]+)\]\s*TJ$/)?.[1] ?? "";
      const arrayTokens = arrayContent.match(/\((?:\\.|[^\\)])*\)|<[^>]+>/g) ?? [];
      const merged = arrayTokens
        .map((token) => {
          if (token.startsWith("(") && token.endsWith(")")) {
            return decodePdfLiteral(token.slice(1, -1));
          }
          if (token.startsWith("<") && token.endsWith(">")) {
            return decodePdfHexText(token.slice(1, -1));
          }
          return "";
        })
        .join("")
        .trim();

      if (merged.length > 0) {
        segments.push(merged);
      }
    }
  }

  return segments;
}

function extractReadablePdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const segments = extractPdfTextSegments(raw);
  const merged = normalizeIndexedText(segments.join("\n"));
  if (merged.length > 0) {
    return merged;
  }

  const fallbackReadable = normalizeIndexedText(raw.replace(/[^\x20-\x7E\n\r\t]/g, " "));
  return fallbackReadable;
}

async function downloadBookPdfBytes(filePath: string): Promise<Uint8Array> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.storage.from(BOOK_FILE_BUCKET).download(filePath);
    if (error || !data) {
      throw new Error(error?.message ?? "Storage download failed.");
    }

    const buffer = await data.arrayBuffer();
    return new Uint8Array(buffer);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BOOK_FILE_BUCKET).download(filePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Storage download failed.");
  }

  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
}

function buildIndexedTextFromPdfBytes(book: Book, bytes: Uint8Array): string {
  if (bytes.byteLength < 4) {
    throw new Error("PDF is empty.");
  }

  const signature = Buffer.from(bytes.slice(0, 4)).toString("utf8");
  if (signature !== "%PDF") {
    throw new Error("File is not a valid PDF.");
  }

  const extractedText = extractReadablePdfText(bytes);
  if (extractedText.length < PDF_INDEX_MIN_CONTENT_CHARS) {
    throw new Error("Unable to extract enough readable text from PDF.");
  }

  const boundedExtract = extractedText.slice(0, PDF_INDEX_MAX_TEXT_CHARS);

  return [
    buildIndexedStubText(book),
    "Contenu extrait du manuel:",
    boundedExtract,
    `Longueur du document: ${bytes.byteLength} octets`,
  ].join("\n");
}

function toPdfReadErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(rawMessage) as { url?: string };
    if (typeof parsed.url === "string" && parsed.url.length > 0) {
      return "Unable to read PDF: storage download failed (file missing or inaccessible).";
    }
  } catch {
    // Keep raw message heuristics below.
  }

  if (/bucket.*not found/i.test(rawMessage)) {
    return "Unable to read PDF: storage bucket revision-books is missing.";
  }

  if (/object.*not found|resource.*not found|status code 404|not found/i.test(rawMessage)) {
    return "Unable to read PDF: file not found in storage.";
  }

  if (/forbidden|permission|unauthorized|status code 403|status code 401/i.test(rawMessage)) {
    return "Unable to read PDF: permission denied when accessing storage.";
  }

  const safeMessage = rawMessage.length > 200 ? `${rawMessage.slice(0, 200)}...` : rawMessage;
  return `Unable to read PDF: ${safeMessage}`;
}

export async function startBookIndexing(bookId: string): Promise<BookMutationResult<Book>> {
  const book = await getBookById(bookId);
  if (!book) {
    return buildDeniedResult("Book not found.");
  }

  const indexing = await updateBookStatus({
    bookId: book.id,
    status: "indexing",
    errorMessage: null,
  });
  if (!indexing.success || !indexing.data) {
    return indexing;
  }

  if (!isSupabaseConfigured()) {
    return updateBookStatus({
      bookId: book.id,
      status: "indexed",
      errorMessage: null,
      indexedText: indexing.data.indexedText ?? buildIndexedStubText(indexing.data),
    });
  }

  try {
    const bytes = await downloadBookPdfBytes(indexing.data.filePath);
    const indexedText = buildIndexedTextFromPdfBytes(indexing.data, bytes);
    return updateBookStatus({
      bookId: book.id,
      status: "indexed",
      errorMessage: null,
      indexedText,
    });
  } catch (error) {
    console.warn("[books] start_indexing_pdf_read_failed", {
      bookId: book.id,
      filePath: indexing.data.filePath,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    const errorMessage = toPdfReadErrorMessage(error);
    await updateBookStatus({
      bookId: book.id,
      status: "error",
      errorMessage,
      indexedText: null,
    });
    return buildDeniedResult(errorMessage);
  }

}
