import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const setRevisionCardStatusMock = vi.hoisted(() => vi.fn());
const deleteRevisionCardMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/lib/api/revisions", () => ({
  setRevisionCardStatus: setRevisionCardStatusMock,
  deleteRevisionCard: deleteRevisionCardMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  deleteRevisionCardAction,
  setRevisionCardStatusAction,
} from "@/lib/actions/revisions";

function createParentContext() {
  return {
    role: "parent",
    familyId: "family-1",
    source: "supabase",
    profile: {
      id: "parent-1",
      family_id: "family-1",
      display_name: "Parent",
      role: "parent",
      avatar_url: null,
      pin_hash: null,
      created_at: "2026-02-28T10:00:00.000Z",
    },
  };
}

function createChildContext() {
  return {
    role: "child",
    familyId: "family-1",
    source: "child-pin",
    profile: {
      id: "child-1",
      family_id: "family-1",
      display_name: "Ezra",
      role: "child",
      avatar_url: null,
      pin_hash: null,
      created_at: "2026-02-28T10:00:00.000Z",
    },
  };
}

describe("revision management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revalidatePathMock.mockReset();
  });

  it("rejects status update for non-parent profiles", async () => {
    getCurrentProfileMock.mockResolvedValue(createChildContext());

    const result = await setRevisionCardStatusAction({
      cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      status: "published",
    });

    expect(result).toEqual({
      success: false,
      error: "Action reservee au parent.",
    });
    expect(setRevisionCardStatusMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updates status and revalidates parent list, detail, and child paths", async () => {
    getCurrentProfileMock.mockResolvedValue(createParentContext());
    setRevisionCardStatusMock.mockResolvedValue({
      success: true,
      data: {
        id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
        status: "published",
      },
    });

    const result = await setRevisionCardStatusAction({
      cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      status: "published",
    });

    expect(setRevisionCardStatusMock).toHaveBeenCalledWith(
      "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      "published",
    );
    expect(result).toEqual({
      success: true,
      data: {
        cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
        status: "published",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(revalidatePathMock).toHaveBeenCalledWith("/child/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6");
  });

  it("deletes a card and revalidates parent list, detail, and child paths", async () => {
    getCurrentProfileMock.mockResolvedValue(createParentContext());
    deleteRevisionCardMock.mockResolvedValue({
      success: true,
      data: {
        id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      },
    });

    const result = await deleteRevisionCardAction({
      cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
    });

    expect(deleteRevisionCardMock).toHaveBeenCalledWith("22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(result).toEqual({
      success: true,
      data: {
        cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parent/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(revalidatePathMock).toHaveBeenCalledWith("/child/revisions/22c65848-7d8e-4f95-ab37-fcba82b86bf6");
  });
});
