import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDemoCategory,
  createDemoTemplateTask,
  resetDemoDayTemplatesStore,
  upsertDemoTemplate,
} from "@/lib/demo/day-templates-store";
import { resetDemoGamificationStore } from "@/lib/demo/gamification-store";

const getCurrentProfileMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseEnabled: () => false,
}));

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));

describe("getTodayTemplateWithTasksForProfile", () => {
  let familyId = "";
  let childProfileId = "";

  beforeEach(() => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
    familyId = `family-test-${suffix}`;
    childProfileId = `child-test-${suffix}`;

    resetDemoDayTemplatesStore(familyId);
    resetDemoGamificationStore(familyId);
    getCurrentProfileMock.mockReset();
    getCurrentProfileMock.mockResolvedValue({
      role: "child",
      familyId,
      source: "child-pin",
      profile: {
        id: childProfileId,
        family_id: familyId,
        display_name: "Ezra",
        role: "child",
        avatar_url: null,
        pin_hash: null,
        created_at: new Date().toISOString(),
      },
    });
  });

  it("retourne le template du jour et ses instances en mode demo", async () => {
    const weekday = new Date().getDay();
    const category = createDemoCategory(familyId, {
      name: "Routine",
      icon: "🧩",
      colorKey: "category-routine",
    });

    const template = upsertDemoTemplate(familyId, {
      name: "Journee test",
      weekday,
      isDefault: true,
    });

    createDemoTemplateTask(familyId, template.id, {
      categoryId: category.id,
      title: "Petit dejeuner",
      description: null,
      startTime: "07:30",
      endTime: "08:00",
      pointsBase: 2,
    });

    const { getTodayTemplateWithTasksForProfile, getTodayTemplateWithTasksForProfileV2 } =
      await import("@/lib/api/day-view");
    const result = await getTodayTemplateWithTasksForProfile(childProfileId);
    const resultV2 = await getTodayTemplateWithTasksForProfileV2(childProfileId, { enabled: true });

    expect(result.weekday).toBe(weekday);
    expect(result.template?.id).toBe(template.id);
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0]?.title).toBe("Petit dejeuner");
    expect(resultV2.v2Enabled).toBe(true);
    expect(resultV2.timelineItems.length).toBeGreaterThan(0);
    expect(resultV2.dayBalance.unitMinutes).toBe(15);
  });
});
