import { beforeEach, describe, expect, it, vi } from "vitest";

const createStoredRevisionCardMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/revisions", () => ({
  createStoredRevisionCard: createStoredRevisionCardMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createDraftRevisionAction } from "@/app/(parent)/parent/revisions/new/actions";

describe("createDraftRevisionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates procedure drafts with type-specific default content", async () => {
    createStoredRevisionCardMock.mockResolvedValue({
      success: true,
      data: {
        id: "card-procedure-1",
      },
    });

    const result = await createDraftRevisionAction({
      subject: "Mathematiques",
      type: "procedure",
      level: "6P",
      title: "Addition avec retenue",
    });

    expect(createStoredRevisionCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Addition avec retenue",
        status: "draft",
        content: expect.objectContaining({
          kind: "procedure",
          procedure: expect.objectContaining({
            stepsHtml: [],
            exercises: [],
          }),
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      cardId: "card-procedure-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions");
  });
});
