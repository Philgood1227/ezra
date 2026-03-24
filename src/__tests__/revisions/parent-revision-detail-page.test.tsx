import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredRevisionCard } from "@/lib/revisions/types";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const getStoredRevisionCardByIdMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
);

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/lib/api/revisions", () => ({
  getStoredRevisionCardById: getStoredRevisionCardByIdMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/components/parent/revisions", () => ({
  RevisionDetailClient: ({ card }: { card: StoredRevisionCard }) => (
    <div data-testid="parent-revision-detail-client">{card.title}</div>
  ),
}));

import ParentRevisionDetailPage from "@/app/(parent)/parent/revisions/[cardId]/page";

function buildCard(overrides: Partial<StoredRevisionCard> = {}): StoredRevisionCard {
  return {
    id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Fractions",
    subject: "Maths",
    level: "CM1",
    tags: ["fractions"],
    status: "draft",
    content: {
      kind: "generic",
      summary: "Resume",
      steps: ["Etape 1"],
      examples: ["Exemple 1"],
      quiz: [],
      tips: ["Astuce 1"],
    },
    createdAt: "2026-02-28T10:00:00.000Z",
    updatedAt: "2026-02-28T10:00:00.000Z",
    ...overrides,
  };
}

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

describe("Parent revision detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentProfileMock.mockResolvedValue(createParentContext());
    getStoredRevisionCardByIdMock.mockResolvedValue(buildCard());
  });

  it("renders a parent-only detail page with fetched card", async () => {
    const element = await ParentRevisionDetailPage({
      params: Promise.resolve({ cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6" }),
    });

    render(element);

    expect(getStoredRevisionCardByIdMock).toHaveBeenCalledWith("22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(screen.getByTestId("parent-revision-detail-client")).toHaveTextContent("Fractions");
  });

  it("calls notFound when profile is not parent", async () => {
    getCurrentProfileMock.mockResolvedValue({
      ...createParentContext(),
      role: "child",
    });

    await expect(
      ParentRevisionDetailPage({
        params: Promise.resolve({ cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(getStoredRevisionCardByIdMock).not.toHaveBeenCalled();
  });

  it("calls notFound when the card does not exist", async () => {
    getStoredRevisionCardByIdMock.mockResolvedValue(null);

    await expect(
      ParentRevisionDetailPage({
        params: Promise.resolve({ cardId: "22c65848-7d8e-4f95-ab37-fcba82b86bf6" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
