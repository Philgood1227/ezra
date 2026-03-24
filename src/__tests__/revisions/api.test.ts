import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const isSupabaseEnabledMock = vi.hoisted(() => vi.fn());
const createDemoRevisionCardMock = vi.hoisted(() => vi.fn());
const listDemoRevisionCardsMock = vi.hoisted(() => vi.fn());
const getDemoRevisionCardByIdMock = vi.hoisted(() => vi.fn());
const updateDemoRevisionCardMock = vi.hoisted(() => vi.fn());
const listDemoUserRevisionStatesForUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseEnabled: isSupabaseEnabledMock,
}));

vi.mock("@/lib/demo/revisions-store", () => ({
  createDemoRevisionCard: createDemoRevisionCardMock,
  listDemoRevisionCards: listDemoRevisionCardsMock,
  getDemoRevisionCardById: getDemoRevisionCardByIdMock,
  updateDemoRevisionCard: updateDemoRevisionCardMock,
  listDemoUserRevisionStatesForUser: listDemoUserRevisionStatesForUserMock,
}));

import {
  SUPABASE_NOT_CONFIGURED_CODE,
  createStoredRevisionCard,
  createRevisionCard,
  deleteRevisionCard,
  getStoredRevisionCardById,
  getUserRevisionState,
  getRevisionCardForParent,
  getRevisionCardById,
  listChildVisibleRevisionCards,
  listUserRevisionStatesForUser,
  listStoredRevisionCards,
  listRevisionCardsForFamily,
  listRevisionCardsForParent,
  updateStoredRevisionCard,
  upsertUserRevisionState,
  upsertRevisionProgress,
} from "@/lib/api/revisions";
import type { StoredRevisionCard } from "@/lib/revisions/types";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function createQueryResult(data: unknown, error: { message: string } | null = null): QueryResult {
  const query = {
    data,
    error,
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    ilike: vi.fn(),
    filter: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  } as QueryResult;

  query.select.mockImplementation(() => query);
  query.eq.mockImplementation(() => query);
  query.order.mockImplementation(() => query);
  query.ilike.mockImplementation(() => query);
  query.filter.mockImplementation(() => query);
  query.limit.mockImplementation(() => query);
  query.single.mockImplementation(() => query);
  query.maybeSingle.mockImplementation(() => query);
  query.insert.mockImplementation(() => query);
  query.update.mockImplementation(() => query);
  query.upsert.mockImplementation(() => query);
  query.delete.mockImplementation(() => query);

  return query;
}

function createSupabaseClient(handlers: Record<string, QueryResult | (() => QueryResult)>) {
  return {
    from: vi.fn((table: string) => {
      const handler = handlers[table];
      if (!handler) {
        throw new Error(`Unexpected table: ${table}`);
      }
      return typeof handler === "function" ? handler() : handler;
    }),
  };
}

function buildRevisionCardRow(
  overrides: Partial<{
    content: Record<string, unknown>;
    id: string;
    family_id: string;
    created_by_profile_id: string;
    goal: string | null;
    type: "concept" | "procedure" | "vocab" | "comprehension";
    title: string;
    subject: string;
    level: string | null;
    tags: string[];
    content_json: Record<string, unknown>;
    status: "draft" | "published";
    created_at: string;
    updated_at: string;
  }> = {},
) {
  return {
    content: {
      kind: "concept",
      summary: "Relire",
      steps: [],
      examples: [],
      quiz: [],
      tips: [],
    },
    id: "card-1",
    family_id: "family-1",
    created_by_profile_id: "parent-1",
    goal: null,
    title: "Fractions",
    subject: "Maths",
    type: "concept",
    level: null,
    tags: ["fractions"],
    content_json: {
      kind: "concept",
      summary: "Relire",
      steps: [],
      examples: [],
      quiz: [],
      tips: [],
    },
    status: "published",
    created_at: "2026-02-27T10:00:00.000Z",
    updated_at: "2026-02-27T10:10:00.000Z",
    ...overrides,
  };
}

function buildStoredCard(overrides: Partial<StoredRevisionCard> = {}): StoredRevisionCard {
  return {
    id: "demo-card-1",
    familyId: "family-1",
    createdByProfileId: "parent-1",
    title: "Demo card",
    subject: "Maths",
    level: "6P",
    tags: [],
    status: "draft",
    content: {
      kind: "concept",
      summary: null,
      steps: [],
      examples: [],
      quiz: [],
      tips: [],
    },
    createdAt: "2026-02-27T10:00:00.000Z",
    updatedAt: "2026-02-27T10:00:00.000Z",
    ...overrides,
  };
}

function baseContext(role: "parent" | "child" | "viewer", source: "supabase" | "child-pin" = "supabase") {
  return {
    role,
    familyId: "family-1",
    source,
    profile: {
      id: role === "child" ? "child-1" : "parent-1",
      family_id: "family-1",
      display_name: role === "child" ? "Ezra" : "Parent",
      role,
      avatar_url: null,
      pin_hash: null,
      created_at: "2026-02-27T10:00:00.000Z",
    },
  };
}

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("revisions api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseEnabledMock.mockReturnValue(true);
    listDemoRevisionCardsMock.mockReturnValue([]);
    createDemoRevisionCardMock.mockReturnValue(buildStoredCard());
    getDemoRevisionCardByIdMock.mockReturnValue(null);
    updateDemoRevisionCardMock.mockReturnValue(null);
    listDemoUserRevisionStatesForUserMock.mockReturnValue([]);
  });

  afterEach(() => {
    if (originalServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      return;
    }

    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it("lists only published cards for child context", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("child"));
    const cardsQuery = createQueryResult([buildRevisionCardRow()]);

    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: cardsQuery,
      }),
    );

    const cards = await listRevisionCardsForFamily();

    expect(cardsQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
    expect(cardsQuery.eq).toHaveBeenCalledWith("status", "published");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.status).toBe("published");
  });

  it("lists child visible revision cards with progress-first ordering", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("child"));
    const cardsQuery = createQueryResult([
      buildRevisionCardRow({
        id: "card-1",
        title: "Card one",
        type: "concept",
        content: {
          kind: "concept",
          summary: null,
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
      }),
      buildRevisionCardRow({
        id: "card-2",
        title: "Card two",
        type: "procedure",
        updated_at: "2026-03-01T12:00:00.000Z",
        content: {
          kind: "procedure",
          summary: null,
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
      }),
    ]);
    const statesQuery = createQueryResult([
      {
        attempts: 2,
        card_id: "card-1",
        created_at: "2026-03-01T08:00:00.000Z",
        family_id: "family-1",
        last_quiz_score: 80,
        last_reviewed_at: "2026-03-01T13:00:00.000Z",
        stars: 4,
        status: "mastered",
        updated_at: "2026-03-01T13:00:00.000Z",
        user_id: "child-1",
      },
    ]);

    let tableCalls = 0;
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: cardsQuery,
        user_revision_state: () => {
          tableCalls += 1;
          return tableCalls === 1 ? statesQuery : statesQuery;
        },
      }),
    );

    const cards = await listChildVisibleRevisionCards();

    expect(cardsQuery.eq).toHaveBeenCalledWith("status", "published");
    expect(statesQuery.eq).toHaveBeenCalledWith("user_id", "child-1");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      id: "card-1",
      progressStatus: "mastered",
      stars: 4,
    });
    expect(cards[1]).toMatchObject({
      id: "card-2",
      progressStatus: "unseen",
    });
  });

  it("falls back to demo store for child visible cards when Supabase is disabled", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("child"));
    listDemoRevisionCardsMock.mockReturnValue([
      buildStoredCard({
        id: "demo-card-1",
        status: "published",
        content: {
          kind: "concept",
          summary: null,
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
      }),
    ]);
    listDemoUserRevisionStatesForUserMock.mockReturnValue([
      {
        userId: "child-1",
        cardId: "demo-card-1",
        status: "in_progress",
        stars: 2,
        lastReviewedAt: "2026-03-01T11:00:00.000Z",
      },
    ]);

    const cards = await listChildVisibleRevisionCards();

    expect(listDemoRevisionCardsMock).toHaveBeenCalledWith("family-1", { publishedOnly: true });
    expect(listDemoUserRevisionStatesForUserMock).toHaveBeenCalledWith("family-1", "child-1");
    expect(cards).toEqual([
      expect.objectContaining({
        id: "demo-card-1",
        progressStatus: "in_progress",
      }),
    ]);
  });

  it("lists parent cards with status/kind/subject/search filters", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    const cardsQuery = createQueryResult([
      buildRevisionCardRow({
        status: "draft",
        type: "procedure",
        content: {
          kind: "procedure",
          summary: "Relire",
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
        content_json: {
          kind: "procedure",
          summary: "Relire",
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
      }),
    ]);

    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: cardsQuery,
      }),
    );

    const cards = await listRevisionCardsForParent({
      status: "draft",
      kind: "procedure",
      subject: "Math",
      search: "Frac",
      limit: 15,
    });

    expect(cardsQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
    expect(cardsQuery.eq).toHaveBeenCalledWith("status", "draft");
    expect(cardsQuery.eq).toHaveBeenCalledWith("type", "procedure");
    expect(cardsQuery.ilike).toHaveBeenCalledWith("subject", "Math%");
    expect(cardsQuery.limit).toHaveBeenCalledWith(15);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: "procedure",
      status: "draft",
      title: "Fractions",
    });
  });

  it("falls back to demo store when listing cards with Supabase disabled", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    listDemoRevisionCardsMock.mockReturnValue([
      buildStoredCard({
        id: "demo-1",
        subject: "Maths",
        level: "6P",
        content: {
          kind: "concept",
          summary: null,
          steps: [],
          examples: [],
          quiz: [],
          tips: [],
        },
      }),
    ]);

    const cards = await listStoredRevisionCards({
      subject: "Math",
      type: "concept",
      level: "6",
      status: "draft",
    });

    expect(listDemoRevisionCardsMock).toHaveBeenCalledWith("family-1");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.id).toBe("demo-1");
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("uses admin client in child-pin context and returns a published card by id", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    getCurrentProfileMock.mockResolvedValue(baseContext("child", "child-pin"));
    const cardQuery = createQueryResult(buildRevisionCardRow());

    createSupabaseAdminClientMock.mockReturnValue(
      createSupabaseClient({
        revision_cards: cardQuery,
      }),
    );

    const card = await getRevisionCardById("card-1");
    console.info("[proof] child-pin published card resolved through admin client");

    expect(createSupabaseAdminClientMock).toHaveBeenCalledTimes(1);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(card?.id).toBe("card-1");
    expect(cardQuery.eq).toHaveBeenCalledWith("id", "card-1");
    expect(cardQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
    expect(cardQuery.eq).toHaveBeenCalledWith("status", "published");
  });

  it("returns a parent card by id with family scoping", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    const cardQuery = createQueryResult(buildRevisionCardRow({ id: "card-parent-1", status: "draft" }));

    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: cardQuery,
      }),
    );

    const card = await getRevisionCardForParent("22c65848-7d8e-4f95-ab37-fcba82b86bf6");

    expect(card?.id).toBe("card-parent-1");
    expect(cardQuery.eq).toHaveBeenCalledWith("id", "22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(cardQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  it("returns null when getRevisionCardForParent is called by non-parent", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("child"));

    const card = await getRevisionCardForParent("22c65848-7d8e-4f95-ab37-fcba82b86bf6");

    expect(card).toBeNull();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("falls back to demo store when parent detail fetch runs without supabase", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    getDemoRevisionCardByIdMock.mockReturnValue(
      buildStoredCard({
        id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
        title: "Demo detail card",
      }),
    );

    const card = await getRevisionCardForParent("22c65848-7d8e-4f95-ab37-fcba82b86bf6");

    expect(card).toMatchObject({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "Demo detail card",
    });
    expect(getDemoRevisionCardByIdMock).toHaveBeenCalledWith(
      "family-1",
      "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
    );
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("loads a single stored card by id through canonical getter", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    const cardQuery = createQueryResult(buildRevisionCardRow({ id: "card-single-1", status: "draft" }));

    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: cardQuery,
      }),
    );

    const card = await getStoredRevisionCardById("22c65848-7d8e-4f95-ab37-fcba82b86bf6");

    expect(card?.id).toBe("card-single-1");
    expect(cardQuery.eq).toHaveBeenCalledWith("id", "22c65848-7d8e-4f95-ab37-fcba82b86bf6");
    expect(cardQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  it("returns null for draft cards in child-pin context", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    getCurrentProfileMock.mockResolvedValue(baseContext("child", "child-pin"));
    const cardQuery = createQueryResult(buildRevisionCardRow({ id: "card-draft", status: "draft" }));

    createSupabaseAdminClientMock.mockReturnValue(
      createSupabaseClient({
        revision_cards: cardQuery,
      }),
    );

    const card = await getRevisionCardById("card-draft");
    console.info("[proof] child-pin draft card blocked");

    expect(card).toBeNull();
    expect(cardQuery.eq).toHaveBeenCalledWith("status", "published");
  });

  it("returns null for family mismatch in child-pin context", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    getCurrentProfileMock.mockResolvedValue(baseContext("child", "child-pin"));
    const cardQuery = createQueryResult(buildRevisionCardRow({ id: "card-foreign", family_id: "family-2" }));

    createSupabaseAdminClientMock.mockReturnValue(
      createSupabaseClient({
        revision_cards: cardQuery,
      }),
    );

    const card = await getRevisionCardById("card-foreign");
    console.info("[proof] child-pin family mismatch returns null");

    expect(card).toBeNull();
    expect(cardQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  it("rejects card creation for non-parent profiles", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("child"));

    const result = await createRevisionCard({
      title: "Réviser les multiplications",
      subject: "Mathématiques",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Action reservee au parent.");
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("uses demo fallback for create while delete/upsert still require Supabase", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));

    const createResult = await createRevisionCard({
      title: "Revision fractions",
      subject: "Maths",
    });

    const deleteResult = await deleteRevisionCard("8a8df90d-bcf3-467e-85c9-3c7f9358a5e6");

    expect(createDemoRevisionCardMock).toHaveBeenCalledWith(
      "family-1",
      "parent-1",
      expect.objectContaining({
        title: "Revision fractions",
        subject: "Maths",
        status: "draft",
      }),
    );
    expect(createResult.success).toBe(true);
    expect(createResult.data?.id).toBe("demo-card-1");
    expect(deleteResult).toEqual({
      success: false,
      error: SUPABASE_NOT_CONFIGURED_CODE,
    });

    getCurrentProfileMock.mockResolvedValue(baseContext("child"));
    const upsertResult = await upsertRevisionProgress({
      revisionCardId: "9155f4c8-c24f-4f92-9a91-22f7a5fcdd9d",
      completedCount: 1,
    });

    expect(upsertResult).toEqual({
      success: false,
      error: SUPABASE_NOT_CONFIGURED_CODE,
    });
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("creates a stored revision card through the canonical createStoredRevisionCard API", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    createDemoRevisionCardMock.mockReturnValue(
      buildStoredCard({
        id: "demo-canonical-1",
        title: "Fractions canonique",
      }),
    );

    const result = await createStoredRevisionCard({
      title: "Fractions canonique",
      subject: "Maths",
      level: "6P",
      tags: [],
      status: "draft",
      content: {
        kind: "concept",
        summary: null,
        steps: [],
        examples: [],
        quiz: [],
        tips: [],
      },
    });

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        id: "demo-canonical-1",
        title: "Fractions canonique",
      }),
    });
  });

  it("updates a concept card through updateStoredRevisionCard with demo fallback", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    getDemoRevisionCardByIdMock.mockReturnValue(
      buildStoredCard({
        id: "card-update-1",
        title: "Avant",
        content: {
          kind: "concept",
          summary: "Ancien resume",
          steps: ["Exercice 1"],
          examples: ["Exemple 1"],
          quiz: [],
          tips: ["Ancien truc"],
        },
      }),
    );
    updateDemoRevisionCardMock.mockReturnValue(
      buildStoredCard({
        id: "card-update-1",
        title: "Apres",
        content: {
          kind: "concept",
          summary: "Nouveau resume",
          steps: ["Nouvel exercice"],
          examples: ["Nouveau visuel"],
          quiz: [],
          tips: ["Nouveau truc"],
        },
      }),
    );

    const result = await updateStoredRevisionCard({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "Apres",
      concept: {
        blocks: {
          jeRetiens: "Nouveau resume",
          jeVoisHtml: "<p>Nouveau visuel</p>",
          monTruc: "Nouveau truc",
        },
        exercises: ["Nouvel exercice"],
        quiz: [],
      },
    });

    expect(result.success).toBe(true);
    expect(updateDemoRevisionCardMock).toHaveBeenCalledWith(
      "family-1",
      "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      expect.objectContaining({
        title: "Apres",
        content: expect.objectContaining({
          kind: "concept",
          summary: "Nouveau resume",
          steps: ["Nouvel exercice"],
          tips: expect.arrayContaining(["Nouveau truc"]),
        }),
      }),
    );
  });

  it("updates a non-concept card content through updateStoredRevisionCard", async () => {
    isSupabaseEnabledMock.mockReturnValue(false);
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    getDemoRevisionCardByIdMock.mockReturnValue(
      buildStoredCard({
        id: "card-procedure-1",
        title: "Avant",
        content: {
          kind: "procedure",
          summary: "Objectif ancien",
          steps: ["Etape 1"],
          examples: ["Exemple 1"],
          quiz: [],
          tips: ["Astuce 1"],
        },
      }),
    );
    updateDemoRevisionCardMock.mockReturnValue(
      buildStoredCard({
        id: "card-procedure-1",
        title: "Apres",
        content: {
          kind: "procedure",
          summary: "Objectif nouveau",
          steps: ["Etape A"],
          examples: ["Exemple A"],
          quiz: [],
          tips: ["Astuce A"],
        },
      }),
    );

    const result = await updateStoredRevisionCard({
      id: "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      title: "Apres",
      content: {
        kind: "procedure",
        summary: "Objectif nouveau",
        steps: ["Etape A"],
        examples: ["Exemple A"],
        quiz: [],
        tips: ["Astuce A"],
      },
    });

    expect(result.success).toBe(true);
    expect(updateDemoRevisionCardMock).toHaveBeenCalledWith(
      "family-1",
      "22c65848-7d8e-4f95-ab37-fcba82b86bf6",
      expect.objectContaining({
        title: "Apres",
        content: expect.objectContaining({
          kind: "procedure",
          summary: "Objectif nouveau",
        }),
      }),
    );
  });

  it("deletes a card for parent context", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    const deleteQuery = createQueryResult({ id: "8a8df90d-bcf3-467e-85c9-3c7f9358a5e6" });

    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: deleteQuery,
      }),
    );

    const result = await deleteRevisionCard("8a8df90d-bcf3-467e-85c9-3c7f9358a5e6");

    expect(result).toEqual({
      success: true,
      data: { id: "8a8df90d-bcf3-467e-85c9-3c7f9358a5e6" },
    });
    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "8a8df90d-bcf3-467e-85c9-3c7f9358a5e6");
    expect(deleteQuery.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  it("upserts child progress on a published card", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("child"));
    const revisionCardId = "9155f4c8-c24f-4f92-9a91-22f7a5fcdd9d";

    const cardQuery = createQueryResult({
      id: revisionCardId,
      family_id: "family-1",
      status: "published",
    });
    const existingProgressQuery = createQueryResult({
      attempts: 1,
      card_id: revisionCardId,
      created_at: "2026-02-27T10:00:00.000Z",
      family_id: "family-1",
      last_quiz_score: 40,
      last_reviewed_at: "2026-02-27T10:00:00.000Z",
      stars: 2,
      status: "in_progress",
      updated_at: "2026-02-27T10:00:00.000Z",
      user_id: "child-1",
    });
    const upsertQuery = createQueryResult({ user_id: "child-1" });

    let revisionProgressCallCount = 0;
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        revision_cards: cardQuery,
        user_revision_state: () => {
          revisionProgressCallCount += 1;
          return revisionProgressCallCount === 1 ? existingProgressQuery : upsertQuery;
        },
      }),
    );

    const result = await upsertRevisionProgress({
      revisionCardId,
      completedCount: 2,
      successStreak: 2,
      confidenceScore: 80,
      status: "completed",
      lastSeenAt: "2026-02-27T11:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: "family-1",
        user_id: "child-1",
        card_id: revisionCardId,
        attempts: 2,
        last_quiz_score: 80,
        status: "mastered",
      }),
      { onConflict: "user_id,card_id" },
    );
    expect(cardQuery.eq).toHaveBeenCalledWith("status", "published");
    expect(result.data?.completedCount).toBe(2);
    expect(result.data?.status).toBe("completed");
  });

  it("upserts child-pin progress on published cards via admin client", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    getCurrentProfileMock.mockResolvedValue(baseContext("child", "child-pin"));
    const revisionCardId = "cf7d09c8-89ed-4115-b437-c7b4f145f8e7";
    const cardQuery = createQueryResult({
      id: revisionCardId,
      family_id: "family-1",
      status: "published",
    });
    const existingProgressQuery = createQueryResult(null);
    const upsertQuery = createQueryResult({ user_id: "child-1" });

    let revisionProgressCallCount = 0;
    const adminClient = createSupabaseClient({
      revision_cards: cardQuery,
      user_revision_state: () => {
        revisionProgressCallCount += 1;
        return revisionProgressCallCount === 1 ? existingProgressQuery : upsertQuery;
      },
    });
    createSupabaseAdminClientMock.mockReturnValue(adminClient);

    const result = await upsertRevisionProgress({
      revisionCardId,
      completedCount: 1,
      lastSeenAt: "2026-02-27T11:00:00.000Z",
    });
    console.info("[proof] child-pin progress upserted via admin client");

    expect(createSupabaseAdminClientMock).toHaveBeenCalledTimes(2);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: "family-1",
        user_id: "child-1",
        card_id: revisionCardId,
        status: "mastered",
      }),
      { onConflict: "user_id,card_id" },
    );
  });

  it("rejects child-pin progress for family mismatch cards", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    getCurrentProfileMock.mockResolvedValue(baseContext("child", "child-pin"));
    const revisionCardId = "425f669f-f578-4d9b-b5cf-fec30c7fb2de";
    const cardQuery = createQueryResult({
      id: revisionCardId,
      family_id: "family-2",
      status: "published",
    });

    const adminClient = createSupabaseClient({
      revision_cards: cardQuery,
      user_revision_state: createQueryResult({}),
    });
    createSupabaseAdminClientMock.mockReturnValue(adminClient);

    const result = await upsertRevisionProgress({
      revisionCardId,
      completedCount: 1,
    });
    console.info("[proof] child-pin family mismatch progress rejected");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Fiche de revision introuvable.");
    expect(adminClient.from).toHaveBeenCalledTimes(1);
    expect(adminClient.from).not.toHaveBeenCalledWith("user_revision_state");
  });

  it("rejects child-pin progress for draft cards", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
    getCurrentProfileMock.mockResolvedValue(baseContext("child", "child-pin"));
    const revisionCardId = "64bc1473-f2e8-4309-a312-a4e84c056fe9";
    const cardQuery = createQueryResult({
      id: revisionCardId,
      family_id: "family-1",
      status: "draft",
    });

    const adminClient = createSupabaseClient({
      revision_cards: cardQuery,
      user_revision_state: createQueryResult({}),
    });
    createSupabaseAdminClientMock.mockReturnValue(adminClient);

    const result = await upsertRevisionProgress({
      revisionCardId,
      completedCount: 1,
    });
    console.info("[proof] child-pin draft progress rejected");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Fiche de revision introuvable.");
    expect(adminClient.from).toHaveBeenCalledTimes(1);
    expect(adminClient.from).not.toHaveBeenCalledWith("user_revision_state");
  });

  it("reads and lists canonical user revision state rows", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));

    const singleStateQuery = createQueryResult({
      attempts: 3,
      card_id: "card-1",
      created_at: "2026-02-27T10:00:00.000Z",
      family_id: "family-1",
      last_quiz_score: 70,
      last_reviewed_at: "2026-02-27T11:00:00.000Z",
      stars: 4,
      status: "mastered",
      updated_at: "2026-02-27T11:00:00.000Z",
      user_id: "child-1",
    });
    const listStateQuery = createQueryResult([
      {
        attempts: 1,
        card_id: "card-2",
        created_at: "2026-02-27T10:00:00.000Z",
        family_id: "family-1",
        last_quiz_score: 50,
        last_reviewed_at: "2026-02-27T11:00:00.000Z",
        stars: 2,
        status: "in_progress",
        updated_at: "2026-02-27T11:00:00.000Z",
        user_id: "child-1",
      },
    ]);
    createSupabaseServerClientMock
      .mockResolvedValueOnce(
        createSupabaseClient({
          user_revision_state: singleStateQuery,
        }),
      )
      .mockResolvedValueOnce(
        createSupabaseClient({
          user_revision_state: listStateQuery,
        }),
      );

    const one = await getUserRevisionState("child-1", "card-1");
    const list = await listUserRevisionStatesForUser("child-1");

    expect(one).toMatchObject({
      userId: "child-1",
      cardId: "card-1",
      status: "mastered",
      stars: 4,
      quizScore: {
        lastScore: 70,
        attempts: 3,
      },
    });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      cardId: "card-2",
      status: "in_progress",
    });
  });

  it("upserts canonical user revision state", async () => {
    getCurrentProfileMock.mockResolvedValue(baseContext("parent"));
    const upsertStateQuery = createQueryResult({ user_id: "child-1" });
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseClient({
        user_revision_state: upsertStateQuery,
      }),
    );

    await upsertUserRevisionState({
      userId: "child-1",
      cardId: "card-1",
      status: "in_progress",
      stars: 3,
      lastReviewedAt: "2026-02-27T11:00:00.000Z",
      quizScore: {
        lastScore: 60,
        attempts: 2,
      },
    });

    expect(upsertStateQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: "family-1",
        user_id: "child-1",
        card_id: "card-1",
        status: "in_progress",
        stars: 3,
        last_quiz_score: 60,
        attempts: 2,
      }),
      { onConflict: "user_id,card_id" },
    );
  });
});
