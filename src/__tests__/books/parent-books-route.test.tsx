import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listBooksForParentMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/books", () => ({
  listBooksForParent: listBooksForParentMock,
}));

vi.mock("@/components/parent/books", () => ({
  ParentBooksResourcesPage: ({ books }: { books: Array<{ title: string }> }) => (
    <section>
      {books.map((book) => (
        <p key={book.title}>{book.title}</p>
      ))}
    </section>
  ),
}));

import ParentBooksResourcesRoute from "@/app/(parent)/parent/resources/books/page";

describe("ParentBooksResourcesRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads books and renders the resources page", async () => {
    listBooksForParentMock.mockResolvedValue([
      { id: "book-1", title: "Francais 6P" },
      { id: "book-2", title: "Maths 6P" },
    ]);

    const element = await ParentBooksResourcesRoute();
    render(element);

    expect(listBooksForParentMock).toHaveBeenCalled();
    expect(screen.getByText("Francais 6P")).toBeInTheDocument();
    expect(screen.getByText("Maths 6P")).toBeInTheDocument();
  });
});
