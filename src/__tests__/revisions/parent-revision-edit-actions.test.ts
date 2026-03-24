import { beforeEach, describe, expect, it, vi } from "vitest";

const updateStoredRevisionCardMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/revisions", () => ({
  updateStoredRevisionCard: updateStoredRevisionCardMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { saveRevisionCardAction } from "@/app/(parent)/parent/revisions/[cardId]/edit/actions";

describe("saveRevisionCardAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates and saves revision content", async () => {
    updateStoredRevisionCardMock.mockResolvedValue({
      success: true,
      data: { id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6" },
    });

    const result = await saveRevisionCardAction({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "Titre",
      content: {
        kind: "procedure",
        summary: "Objectif",
        steps: ["Etape 1"],
        examples: ["Exemple 1"],
        quiz: [],
        tips: ["Astuce"],
      },
    });

    expect(updateStoredRevisionCardMock).toHaveBeenCalledWith({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "Titre",
      content: {
        kind: "procedure",
        summary: "Objectif",
        steps: ["Etape 1"],
        examples: ["Exemple 1"],
        quiz: [],
        tips: ["Astuce"],
      },
    });
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6/edit");
    expect(revalidatePathMock).toHaveBeenCalledWith("/child/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6");
  });

  it("returns field errors when payload is invalid", async () => {
    const result = await saveRevisionCardAction({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "A",
      content: {
        kind: "concept",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected failure result.");
    }

    expect(result.fieldErrors).toBeDefined();
    expect(updateStoredRevisionCardMock).not.toHaveBeenCalled();
  });

  it("returns API error without throwing", async () => {
    updateStoredRevisionCardMock.mockResolvedValue({
      success: false,
      error: "Unable to save revision card.",
    });

    const result = await saveRevisionCardAction({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "Titre",
      content: {
        kind: "vocab",
        summary: "Objectif vocab",
        steps: ["Activite 1"],
        examples: ["mot - traduction"],
        quiz: [],
        tips: [],
      },
    });

    expect(result).toEqual({
      success: false,
      error: "Unable to save revision card.",
    });
  });
});
