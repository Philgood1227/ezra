import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());
const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseEnabled: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

import {
  getTaskCategoriesForCurrentFamily,
  getTemplatesWithTasksForWeekday,
} from "@/lib/api/templates";

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
  select: () => QueryResult;
  eq: () => QueryResult;
  in: () => QueryResult;
  order: () => QueryResult;
  maybeSingle: () => QueryResult;
  limit: () => QueryResult;
  ilike: () => QueryResult;
};

function createQueryResult(data: unknown, error: { message: string } | null = null): QueryResult {
  const query: QueryResult = {
    data,
    error,
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    maybeSingle: () => query,
    limit: () => query,
    ilike: () => query,
  };
  return query;
}

function createTemplatesSupabaseClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === "day_templates") {
        return createQueryResult([
          {
            id: "template-weekend",
            family_id: "family-1",
            name: "Weekend",
            weekday: 0,
            is_default: true,
            created_at: "2026-02-21T10:00:00.000Z",
          },
        ]);
      }

      if (table === "template_tasks") {
        return createQueryResult([]);
      }

      if (table === "task_categories") {
        return createQueryResult([]);
      }

      if (table === "day_template_blocks") {
        return createQueryResult([]);
      }

      if (table === "profiles") {
        return createQueryResult([]);
      }

      if (table === "knowledge_cards") {
        return createQueryResult([]);
      }

      throw new Error(`Unexpected table query in test: ${table}`);
    }),
  };
}

function createTaskCategoriesSupabaseClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === "task_categories") {
        return createQueryResult([
          {
            id: "category-homework",
            family_id: "family-1",
            code: "homework",
            name: "Devoirs",
            icon: "homework",
            color_key: "category-ecole",
            default_item_kind: "mission",
            created_at: "2026-02-21T10:00:00.000Z",
          },
          {
            id: "category-revision",
            family_id: "family-1",
            code: "revision",
            name: "Revisions",
            icon: "knowledge",
            color_key: "category-calme",
            default_item_kind: "mission",
            created_at: "2026-02-21T10:00:00.000Z",
          },
          {
            id: "category-training",
            family_id: "family-1",
            code: "training",
            name: "Entrainement",
            icon: "sport",
            color_key: "category-sport",
            default_item_kind: "mission",
            created_at: "2026-02-21T10:00:00.000Z",
          },
          {
            id: "category-activity",
            family_id: "family-1",
            code: "activity",
            name: "Activites",
            icon: "activity",
            color_key: "category-sport",
            default_item_kind: "activity",
            created_at: "2026-02-21T10:00:00.000Z",
          },
          {
            id: "category-routine",
            family_id: "family-1",
            code: "routine",
            name: "Routine",
            icon: "routine",
            color_key: "category-routine",
            default_item_kind: "activity",
            created_at: "2026-02-21T10:00:00.000Z",
          },
          {
            id: "category-leisure",
            family_id: "family-1",
            code: "leisure",
            name: "Loisirs",
            icon: "leisure",
            color_key: "category-loisir",
            default_item_kind: "leisure",
            created_at: "2026-02-21T10:00:00.000Z",
          },
        ]);
      }

      throw new Error(`Unexpected table query in test: ${table}`);
    }),
  };
}

const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("getTemplatesWithTasksForWeekday child-pin supabase client selection", () => {
  beforeEach(() => {
    getCurrentProfileMock.mockReset();
    createSupabaseServerClientMock.mockReset();
    createSupabaseAdminClientMock.mockReset();

    getCurrentProfileMock.mockResolvedValue({
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
        created_at: "2026-02-21T10:00:00.000Z",
      },
    });
  });

  afterEach(() => {
    if (originalServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      return;
    }

    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it("uses admin client when session source is child-pin and service role key is present", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

    createSupabaseAdminClientMock.mockReturnValue(createTemplatesSupabaseClient());
    createSupabaseServerClientMock.mockResolvedValue(createTemplatesSupabaseClient());

    const templates = await getTemplatesWithTasksForWeekday(0);

    expect(createSupabaseAdminClientMock).toHaveBeenCalledTimes(1);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.name).toBe("Weekend");
  });

  it("falls back to server client when service role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    createSupabaseAdminClientMock.mockReturnValue(createTemplatesSupabaseClient());
    createSupabaseServerClientMock.mockResolvedValue(createTemplatesSupabaseClient());

    const templates = await getTemplatesWithTasksForWeekday(0);

    expect(createSupabaseServerClientMock).toHaveBeenCalledTimes(1);
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
    expect(templates).toHaveLength(1);
  });

  it("returns all 6 canonical category codes for a family", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    createSupabaseServerClientMock.mockResolvedValue(createTaskCategoriesSupabaseClient());

    const categories = await getTaskCategoriesForCurrentFamily();

    expect(createSupabaseServerClientMock).toHaveBeenCalledTimes(1);
    expect(categories).toHaveLength(6);
    expect(categories.map((category) => category.code)).toEqual(
      expect.arrayContaining(["homework", "revision", "training", "activity", "routine", "leisure"]),
    );
  });
});
