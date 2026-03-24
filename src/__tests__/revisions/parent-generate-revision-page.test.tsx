import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ParentGenerateRevisionPage,
  type GenerateRevisionFormResult,
} from "@/components/parent/revisions/parent-generate-revision-page";

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

describe("ParentGenerateRevisionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form fields with expected defaults", () => {
    render(
      <ParentGenerateRevisionPage
        onGenerateAction={vi.fn(async (): Promise<GenerateRevisionFormResult> => ({ success: true, cardId: "card-1" }))}
      />, 
    );

    expect(screen.getByLabelText("Subject")).toHaveValue("Francais");
    expect(screen.getByLabelText("Type")).toHaveValue("concept");
    expect(screen.getByLabelText("Level")).toHaveValue("6P");
    expect(screen.getByLabelText("Topic")).toHaveValue("");
    expect(screen.getByLabelText("Parent source content")).toHaveValue("");
  });

  it("submits valid data and navigates to detail page", async () => {
    const generateAction = vi.fn(async (): Promise<GenerateRevisionFormResult> => ({
      success: true,
      cardId: "card-42",
    }));

    render(<ParentGenerateRevisionPage onGenerateAction={generateAction} />);

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Mathematiques" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "procedure" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "7P" } });
    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Fractions equivalentes" } });
    fireEvent.change(screen.getByLabelText("Parent source content"), {
      target: { value: "Cours parent sur les fractions equivalentes." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate draft" }));

    await waitFor(() => {
      expect(generateAction).toHaveBeenCalledWith({
        subject: "Mathematiques",
        type: "procedure",
        level: "7P",
        topic: "Fractions equivalentes",
        source: "Cours parent sur les fractions equivalentes.",
      });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/parent/revisions/card-42");
      expect(refreshMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Revision generated as draft.");
    });
  });

  it("shows action errors without navigation", async () => {
    const generateAction = vi.fn(async (): Promise<GenerateRevisionFormResult> => ({
      success: false,
      error: "Generation failed.",
      fieldErrors: {
        topic: "Topic is required.",
      },
    }));

    render(<ParentGenerateRevisionPage onGenerateAction={generateAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate draft" }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((alert) => alert.textContent?.includes("Generation failed."))).toBe(true);
      expect(toastErrorMock).toHaveBeenCalledWith("Generation failed.");
    });

    expect(pushMock).not.toHaveBeenCalled();
  });
});
