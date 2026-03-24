import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDemoCategory,
  listDemoTemplateTasks,
  createDemoTemplateTask,
  resetDemoDayTemplatesStore,
  updateDemoTemplateTask,
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
      icon: "routine",
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
      description: "Description fallback",
      instructionsHtml: "<p><strong>Consigne riche</strong></p>",
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
    expect(result.instances[0]?.instructionsHtml).toBe("<p><strong>Consigne riche</strong></p>");
    expect(resultV2.v2Enabled).toBe(true);
    expect(resultV2.timelineItems.length).toBeGreaterThan(0);
    expect(resultV2.dayBalance.unitMinutes).toBe(15);
  }, 10_000);

  it("construit un fallback HTML echappe depuis la description si instructionsHtml est absent", async () => {
    const weekday = new Date().getDay();
    const category = createDemoCategory(familyId, {
      name: "Ecole",
      icon: "school",
      colorKey: "category-ecole",
    });

    const template = upsertDemoTemplate(familyId, {
      name: "Journee fallback",
      weekday,
      isDefault: true,
    });

    createDemoTemplateTask(familyId, template.id, {
      categoryId: category.id,
      title: "Lecture",
      description: "<script>alert('x')</script>",
      instructionsHtml: null,
      startTime: "09:00",
      endTime: "09:20",
      pointsBase: 1,
    });

    const { getTodayTemplateWithTasksForProfile } = await import("@/lib/api/day-view");
    const result = await getTodayTemplateWithTasksForProfile(childProfileId);

    expect(result.instances).toHaveLength(1);
    expect(result.instances[0]?.instructionsHtml).toBe("<p>&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</p>");
  });

  it("n'affiche plus un sous-type stale d'instance quand le template est vide", async () => {
    const weekday = new Date().getDay();
    const category = createDemoCategory(familyId, {
      name: "Ecole",
      icon: "school",
      colorKey: "category-ecole",
    });

    const template = upsertDemoTemplate(familyId, {
      name: "Journee sous-type",
      weekday,
      isDefault: true,
    });

    const createdTask = createDemoTemplateTask(familyId, template.id, {
      categoryId: category.id,
      title: "Maths",
      description: "Revoir les tables",
      instructionsHtml: "<p>Fais les exercices.</p>",
      startTime: "10:00",
      endTime: "10:20",
      pointsBase: 2,
      itemSubkind: "devoirs",
    });
    expect(createdTask).not.toBeNull();

    const { getTodayTemplateWithTasksForProfile } = await import("@/lib/api/day-view");

    const firstRead = await getTodayTemplateWithTasksForProfile(childProfileId);
    expect(firstRead.instances).toHaveLength(1);
    expect(firstRead.instances[0]?.itemSubkind).toBe("devoirs");

    const taskBeforeClear = listDemoTemplateTasks(familyId, template.id)[0];
    expect(taskBeforeClear).toBeDefined();
    if (!taskBeforeClear) {
      throw new Error("Expected demo task before clear.");
    }

    const updatedTask = updateDemoTemplateTask(familyId, taskBeforeClear.id, {
      categoryId: taskBeforeClear.categoryId,
      itemKind: taskBeforeClear.itemKind ?? "mission",
      itemSubkind: null,
      assignedProfileId: taskBeforeClear.assignedProfileId ?? null,
      title: taskBeforeClear.title,
      description: taskBeforeClear.description,
      instructionsHtml: taskBeforeClear.instructionsHtml ?? null,
      startTime: taskBeforeClear.startTime,
      endTime: taskBeforeClear.endTime,
      pointsBase: taskBeforeClear.pointsBase,
      knowledgeCardId: taskBeforeClear.knowledgeCardId ?? null,
      recommendedChildTimeBlockId: taskBeforeClear.recommendedChildTimeBlockId ?? null,
    });
    expect(updatedTask).not.toBeNull();

    const secondRead = await getTodayTemplateWithTasksForProfile(childProfileId);
    expect(secondRead.instances).toHaveLength(1);
    expect(secondRead.instances[0]?.itemSubkind).toBeNull();
  });
});
