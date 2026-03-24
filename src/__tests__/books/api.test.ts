import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const isSupabaseEnabledMock = vi.hoisted(() => vi.fn());
const createDemoBookMock = vi.hoisted(() => vi.fn());
const deleteDemoBookMock = vi.hoisted(() => vi.fn());
const getDemoBookByIdMock = vi.hoisted(() => vi.fn());
const listDemoBooksMock = vi.hoisted(() => vi.fn());
const updateDemoBookStatusMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseEnabled: isSupabaseEnabledMock,
}));

vi.mock("@/lib/demo/books-store", () => ({
  createDemoBook: createDemoBookMock,
  deleteDemoBook: deleteDemoBookMock,
  getDemoBookById: getDemoBookByIdMock,
  listDemoBooks: listDemoBooksMock,
  updateDemoBookStatus: updateDemoBookStatusMock,
}));

import {
  createBook,
  deleteBook,
  listBooksForParent,
  startBookIndexing,
} from "@/lib/api/books";

describe("books api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseEnabledMock.mockReturnValue(false);
  });

  it("returns empty list for non-parent profile", async () => {
    getCurrentProfileMock.mockResolvedValue({
      familyId: "family-1",
      role: "child",
      profile: { id: "child-1" },
    });

    const books = await listBooksForParent();

    expect(books).toEqual([]);
    expect(listDemoBooksMock).not.toHaveBeenCalled();
  });

  it("lists books from demo store when Supabase is disabled", async () => {
    getCurrentProfileMock.mockResolvedValue({
      familyId: "family-1",
      role: "parent",
      profile: { id: "parent-1" },
    });
    listDemoBooksMock.mockReturnValue([
      {
        id: "book-1",
        title: "Francais 6P",
      },
    ]);

    const books = await listBooksForParent();

    expect(listDemoBooksMock).toHaveBeenCalledWith("family-1");
    expect(books).toEqual([{ id: "book-1", title: "Francais 6P" }]);
  });

  it("creates a demo book with fallback path when Supabase is disabled", async () => {
    getCurrentProfileMock.mockResolvedValue({
      familyId: "family-1",
      role: "parent",
      profile: { id: "parent-1" },
    });
    createDemoBookMock.mockReturnValue({
      id: "book-2",
      title: "Maths 6P",
    });

    const result = await createBook({
      subject: "maths",
      level: "6P",
      title: "Maths 6P",
      fileName: "maths6p.pdf",
      fileMimeType: "application/pdf",
      fileBase64: "ZmFrZS1iYXNlNjQ=",
    });

    expect(createDemoBookMock).toHaveBeenCalledWith(
      "family-1",
      "parent-1",
      expect.objectContaining({
        subject: "maths",
        level: "6P",
        title: "Maths 6P",
      }),
      expect.stringContaining("family-1"),
    );
    expect(result).toEqual({
      success: true,
      data: {
        id: "book-2",
        title: "Maths 6P",
      },
    });
  });

  it("runs demo indexing flow from uploaded to indexed", async () => {
    const bookId = "550e8400-e29b-41d4-a716-446655440000";
    getCurrentProfileMock.mockResolvedValue({
      familyId: "family-1",
      role: "parent",
      profile: { id: "parent-1" },
    });
    getDemoBookByIdMock.mockReturnValue({
      id: bookId,
      familyId: "family-1",
      createdByProfileId: "parent-1",
      subject: "french",
      level: "6P",
      title: "Francais 6P",
      schoolYear: null,
      fileName: "francais6p.pdf",
      filePath: "family-1/book-3.pdf",
      status: "uploaded",
      errorMessage: null,
      indexedText: null,
      createdAt: "2026-03-02T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
    });
    updateDemoBookStatusMock
      .mockReturnValueOnce({
        id: bookId,
        status: "indexing",
      })
      .mockReturnValueOnce({
        id: bookId,
        status: "indexed",
      });

    const result = await startBookIndexing(bookId);

    expect(updateDemoBookStatusMock).toHaveBeenNthCalledWith(
      1,
      "family-1",
      expect.objectContaining({
        bookId,
        status: "indexing",
      }),
    );
    expect(updateDemoBookStatusMock).toHaveBeenNthCalledWith(
      2,
      "family-1",
      expect.objectContaining({
        bookId,
        status: "indexed",
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        id: bookId,
        status: "indexed",
      },
    });
  });

  it("marks book as error when Supabase indexing cannot read PDF", async () => {
    const bookId = "550e8400-e29b-41d4-a716-446655440000";
    isSupabaseEnabledMock.mockReturnValue(true);
    getCurrentProfileMock.mockResolvedValue({
      familyId: "family-1",
      role: "parent",
      profile: { id: "parent-1" },
    });

    const getBookQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: bookId,
          family_id: "family-1",
          created_by_profile_id: "parent-1",
          subject: "french",
          level: "6P",
          title: "Francais 6P",
          school_year: null,
          file_name: "francais6p.pdf",
          file_path: "family-1/francais6p.pdf",
          status: "uploaded",
          error_message: null,
          indexed_text: null,
          created_at: "2026-03-02T10:00:00.000Z",
          updated_at: "2026-03-02T10:00:00.000Z",
        },
        error: null,
      }),
    };

    const toIndexingQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: bookId,
          family_id: "family-1",
          created_by_profile_id: "parent-1",
          subject: "french",
          level: "6P",
          title: "Francais 6P",
          school_year: null,
          file_name: "francais6p.pdf",
          file_path: "family-1/francais6p.pdf",
          status: "indexing",
          error_message: null,
          indexed_text: null,
          created_at: "2026-03-02T10:00:00.000Z",
          updated_at: "2026-03-02T10:00:00.000Z",
        },
        error: null,
      }),
    };

    const toErrorQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: bookId,
          family_id: "family-1",
          created_by_profile_id: "parent-1",
          subject: "french",
          level: "6P",
          title: "Francais 6P",
          school_year: null,
          file_name: "francais6p.pdf",
          file_path: "family-1/francais6p.pdf",
          status: "error",
          error_message: "Unable to read PDF: Storage download failed.",
          indexed_text: null,
          created_at: "2026-03-02T10:00:00.000Z",
          updated_at: "2026-03-02T10:00:00.000Z",
        },
        error: null,
      }),
    };

    createSupabaseServerClientMock
      .mockResolvedValueOnce({
        from: vi.fn(() => getBookQuery),
      })
      .mockResolvedValueOnce({
        from: vi.fn(() => ({
          update: vi.fn(() => toIndexingQuery),
        })),
      })
      .mockResolvedValueOnce({
        storage: {
          from: vi.fn(() => ({
            download: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Storage download failed." },
            }),
          })),
        },
      })
      .mockResolvedValueOnce({
        from: vi.fn(() => ({
          update: vi.fn(() => toErrorQuery),
        })),
      });

    const result = await startBookIndexing(bookId);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unable to read PDF:");
  });

  it("deletes a demo book when Supabase is disabled", async () => {
    const bookId = "550e8400-e29b-41d4-a716-446655440000";
    getCurrentProfileMock.mockResolvedValue({
      familyId: "family-1",
      role: "parent",
      profile: { id: "parent-1" },
    });
    deleteDemoBookMock.mockReturnValue({
      id: bookId,
      title: "Francais 6P",
    });

    const result = await deleteBook(bookId);

    expect(deleteDemoBookMock).toHaveBeenCalledWith("family-1", bookId);
    expect(result).toEqual({
      success: true,
      data: {
        id: bookId,
        title: "Francais 6P",
      },
    });
  });
});
