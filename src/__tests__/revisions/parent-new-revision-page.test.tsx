import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentNewRevisionPage } from "@/components/parent/revisions/parent-new-revision-page";
import type {
  CreateDraftActionResult,
} from "@/lib/revisions/parent-drafts";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/components/ds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ds")>();
  return {
    ...actual,
    useToast: () => ({
      success: toastSuccessMock,
      error: toastErrorMock,
      info: vi.fn(),
      warning: vi.fn(),
      dismiss: vi.fn(),
    }),
  };
});

describe("ParentNewRevisionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields with expected defaults", () => {
    render(
      <ParentNewRevisionPage
        onCreateDraftAction={vi.fn(async (): Promise<CreateDraftActionResult> => ({ success: true, cardId: "card-1" }))}
      />,
    );

    expect(screen.getByLabelText("Subject")).toHaveValue("Francais");
    expect(screen.getByLabelText("Type")).toHaveValue("concept");
    expect(screen.getByLabelText("Level")).toHaveValue("6P");
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("submits valid data and redirects on success", async () => {
    const createAction = vi.fn(async (): Promise<CreateDraftActionResult> => ({
      success: true,
      cardId: "card-42",
    }));

    render(<ParentNewRevisionPage onCreateDraftAction={createAction} />);

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Mathematiques" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "procedure" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7P" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Division euclidienne" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(createAction).toHaveBeenCalledWith({
        subject: "Mathematiques",
        type: "procedure",
        level: "7P",
        title: "Division euclidienne",
      });
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/parent/revisions");
      expect(refreshMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Draft saved.");
    });
  });

  it("shows server action errors without crashing", async () => {
    const createAction = vi.fn(async (): Promise<CreateDraftActionResult> => ({
      success: false,
      error: "Title must contain at least 2 characters.",
      fieldErrors: {
        title: "Title must contain at least 2 characters.",
      },
    }));

    render(<ParentNewRevisionPage onCreateDraftAction={createAction} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((alert) => alert.textContent?.includes("Title must contain at least 2 characters."))).toBe(
        true,
      );
      expect(toastErrorMock).toHaveBeenCalledWith("Title must contain at least 2 characters.");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
