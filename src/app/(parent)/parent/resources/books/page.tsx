import { PageLayout } from "@/components/ds";
import { ParentBooksResourcesPage } from "@/components/parent/books";
import { listBooksForParent } from "@/lib/api/books";
import {
  createBookAction,
  deleteBookAction,
  generateRevisionFromBookAction,
  startBookIndexingAction,
  type CreateBookActionInput,
  type CreateBookActionResult,
  type DeleteBookActionResult,
  type GenerateRevisionFromBookActionInput,
  type GenerateRevisionFromBookActionResult,
  type StartBookIndexingActionResult,
} from "./actions";

export default async function ParentBooksResourcesRoute(): Promise<React.JSX.Element> {
  const books = await listBooksForParent();

  async function submitCreateBookAction(
    input: CreateBookActionInput,
  ): Promise<CreateBookActionResult> {
    "use server";

    return createBookAction(input);
  }

  async function submitStartBookIndexingAction(input: {
    bookId: string;
  }): Promise<StartBookIndexingActionResult> {
    "use server";

    return startBookIndexingAction(input);
  }

  async function submitGenerateRevisionFromBookAction(
    input: GenerateRevisionFromBookActionInput,
  ): Promise<GenerateRevisionFromBookActionResult> {
    "use server";

    return generateRevisionFromBookAction(input);
  }

  async function submitDeleteBookAction(input: { bookId: string }): Promise<DeleteBookActionResult> {
    "use server";

    return deleteBookAction(input);
  }

  return (
    <PageLayout
      title="Livres & Fiches"
      subtitle="Upload manuals, monitor indexing, then generate structured revision drafts from indexed books."
      className="max-w-6xl"
    >
      <ParentBooksResourcesPage
        books={books}
        onCreateBookAction={submitCreateBookAction}
        onStartBookIndexingAction={submitStartBookIndexingAction}
        onDeleteBookAction={submitDeleteBookAction}
        onGenerateRevisionFromBookAction={submitGenerateRevisionFromBookAction}
      />
    </PageLayout>
  );
}
