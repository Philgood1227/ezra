import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseEnabled: () => false,
}));

vi.mock("@/lib/auth/current-profile", () => ({
  getCurrentProfile: vi.fn(),
}));

import {
  createCategoryAction,
  createTemplateAction,
  createTemplateBlockAction,
  createTemplateTaskAction,
  updateTemplateBlockAction,
  updateTemplateTaskAction,
} from "@/lib/actions/day-templates";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { listDemoTemplateTasks, resetDemoDayTemplatesStore } from "@/lib/demo/day-templates-store";

const TEST_FAMILY_ID = "family-overlap-tests";
const mockedGetCurrentProfile = vi.mocked(getCurrentProfile);

async function createBaseTemplateAndCategory(): Promise<{ categoryId: string; templateId: string }> {
  const categoryResult = await createCategoryAction({
    name: "Ecole",
    icon: "school",
    colorKey: "category-ecole",
    defaultItemKind: "mission",
  });
  expect(categoryResult.success).toBe(true);
  if (!categoryResult.success || !categoryResult.data) {
    throw new Error("Unable to create category in test setup.");
  }

  const templateResult = await createTemplateAction({
    name: "Lundi test",
    weekday: 1,
    isDefault: true,
  });
  expect(templateResult.success).toBe(true);
  if (!templateResult.success || !templateResult.data) {
    throw new Error("Unable to create template in test setup.");
  }

  return {
    categoryId: categoryResult.data.id,
    templateId: templateResult.data.id,
  };
}

describe("day template overlap guards", () => {
  beforeEach(() => {
    resetDemoDayTemplatesStore(TEST_FAMILY_ID);
    mockedGetCurrentProfile.mockResolvedValue({
      role: "parent",
      profile: null,
      familyId: TEST_FAMILY_ID,
      source: "none",
    });
  });

  it("rejects overlapping template tasks", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();

    const firstTask = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Lecture",
      description: null,
      startTime: "08:00",
      endTime: "09:00",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });
    expect(firstTask.success).toBe(true);

    const overlappingTask = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Revisions",
      description: null,
      startTime: "08:30",
      endTime: "09:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(overlappingTask.success).toBe(false);
    if (overlappingTask.success) {
      throw new Error("Expected overlap rejection.");
    }
    expect(overlappingTask.error).toContain("chevauche");
  });

  it("allows adjacent template tasks", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();

    await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Bloc 1",
      description: null,
      startTime: "08:00",
      endTime: "09:00",
      pointsBase: 1,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    const adjacentTask = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Bloc 2",
      description: null,
      startTime: "09:00",
      endTime: "10:00",
      pointsBase: 1,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(adjacentTask.success).toBe(true);
  });

  it("rejects overlapping context blocks", async () => {
    const { templateId } = await createBaseTemplateAndCategory();

    const firstBlock = await createTemplateBlockAction(templateId, {
      blockType: "school",
      label: "Ecole matin",
      startTime: "08:00",
      endTime: "11:00",
    });
    expect(firstBlock.success).toBe(true);

    const overlappingBlock = await createTemplateBlockAction(templateId, {
      blockType: "home",
      label: "Retour maison",
      startTime: "10:30",
      endTime: "12:00",
    });

    expect(overlappingBlock.success).toBe(false);
    if (overlappingBlock.success) {
      throw new Error("Expected overlap rejection.");
    }
    expect(overlappingBlock.error).toContain("chevauche");
  });

  it("allows task creation inside a context block", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();

    const block = await createTemplateBlockAction(templateId, {
      blockType: "school",
      label: "Ecole matin",
      startTime: "08:00",
      endTime: "11:00",
    });
    expect(block.success).toBe(true);

    const task = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Maths",
      description: null,
      startTime: "08:30",
      endTime: "09:15",
      pointsBase: 3,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(task.success).toBe(true);
  });

  it("rejects task updates that create overlap", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();

    const firstTask = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Bloc 1",
      description: null,
      startTime: "08:00",
      endTime: "09:00",
      pointsBase: 1,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });
    expect(firstTask.success).toBe(true);

    const secondTask = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Bloc 2",
      description: null,
      startTime: "09:00",
      endTime: "10:00",
      pointsBase: 1,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });
    expect(secondTask.success).toBe(true);
    if (!secondTask.success || !secondTask.data) {
      throw new Error("Unable to create second task in test setup.");
    }

    const update = await updateTemplateTaskAction(secondTask.data.id, {
      categoryId,
      itemKind: "mission",
      title: "Bloc 2",
      description: null,
      startTime: "08:30",
      endTime: "09:30",
      pointsBase: 1,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(update.success).toBe(false);
    if (update.success) {
      throw new Error("Expected overlap rejection.");
    }
    expect(update.error).toContain("chevauche");
  });

  it("rejects block updates that create overlap", async () => {
    const { templateId } = await createBaseTemplateAndCategory();

    const firstBlock = await createTemplateBlockAction(templateId, {
      blockType: "school",
      label: "Ecole matin",
      startTime: "08:00",
      endTime: "09:00",
    });
    expect(firstBlock.success).toBe(true);

    const secondBlock = await createTemplateBlockAction(templateId, {
      blockType: "home",
      label: "Maison",
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(secondBlock.success).toBe(true);
    if (!secondBlock.success || !secondBlock.data) {
      throw new Error("Unable to create second block in test setup.");
    }

    const update = await updateTemplateBlockAction(secondBlock.data.id, {
      blockType: "home",
      label: "Maison",
      startTime: "08:30",
      endTime: "09:30",
    });

    expect(update.success).toBe(false);
    if (update.success) {
      throw new Error("Expected overlap rejection.");
    }
    expect(update.error).toContain("chevauche");
  });

  it("accepts task descriptions longer than 280 chars up to 4000 chars", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();
    const description281 = "a".repeat(281);

    const result = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Consigne longue",
      description: description281,
      startTime: "10:00",
      endTime: "10:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects task descriptions above 4000 chars", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();
    const description4001 = "a".repeat(4001);

    const result = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Consigne trop longue",
      description: description4001,
      startTime: "10:00",
      endTime: "10:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected max length validation rejection.");
    }
    expect(result.error).toContain("4000 caracteres");
  });

  it("accepts task instructionsHtml up to 20000 chars", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();
    const instructionsHtml20000 = "a".repeat(20000);

    const result = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Consignes longues",
      description: null,
      instructionsHtml: instructionsHtml20000,
      startTime: "11:00",
      endTime: "11:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(result.success).toBe(true);
  });

  it("normalizes cleared itemSubkind to null on update", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();

    const created = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Mission sous-type",
      description: null,
      startTime: "10:40",
      endTime: "11:10",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: "devoirs",
    });
    expect(created.success).toBe(true);
    if (!created.success || !created.data) {
      throw new Error("Expected task creation for subkind normalization test.");
    }
    const taskId = created.data.id;

    const updated = await updateTemplateTaskAction(taskId, {
      categoryId,
      itemKind: "mission",
      title: "Mission sous-type",
      description: null,
      startTime: "10:40",
      endTime: "11:10",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: "   ",
    });
    expect(updated.success).toBe(true);

    const savedTask = listDemoTemplateTasks(TEST_FAMILY_ID, templateId).find((task) => task.id === taskId);
    expect(savedTask?.itemSubkind).toBeNull();
  });

  it("persists task instructionsHtml when valid", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();
    const instructionsHtml = "<p><strong>Etape 1</strong></p><ul><li>Relire</li></ul>";

    const result = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Mission riche",
      description: "Fallback",
      instructionsHtml,
      startTime: "11:40",
      endTime: "12:00",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error("Expected task creation with rich instructions.");
    }

    const taskId = result.data.id;
    const savedTask = listDemoTemplateTasks(TEST_FAMILY_ID, templateId).find((task) => task.id === taskId);
    expect(savedTask?.instructionsHtml).toBe(instructionsHtml);
  });

  it("sanitizes task instructionsHtml before persistence", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();

    const result = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Mission securisee",
      description: "Fallback",
      instructionsHtml:
        "<p>Lis la fiche</p><script>alert(1)</script><a href=\"javascript:alert(1)\" onclick=\"evil()\">Lien</a>",
      startTime: "12:00",
      endTime: "12:20",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error("Expected task creation before sanitization assertion.");
    }

    const taskId = result.data.id;
    const savedTask = listDemoTemplateTasks(TEST_FAMILY_ID, templateId).find((task) => task.id === taskId);
    expect(savedTask?.instructionsHtml).toContain("<p>Lis la fiche</p>");
    expect(savedTask?.instructionsHtml).not.toContain("script");
    expect(savedTask?.instructionsHtml).not.toContain("onclick");
    expect(savedTask?.instructionsHtml).not.toContain("javascript:");
  });

  it("rejects task instructionsHtml above 20000 chars", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();
    const instructionsHtml20001 = "a".repeat(20001);

    const result = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Consignes trop longues",
      description: null,
      instructionsHtml: instructionsHtml20001,
      startTime: "11:00",
      endTime: "11:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected max length validation rejection.");
    }
    expect(result.error).toContain("20000 caracteres");
  });

  it("rejects update when instructionsHtml is above 20000 chars", async () => {
    const { categoryId, templateId } = await createBaseTemplateAndCategory();
    const created = await createTemplateTaskAction(templateId, {
      categoryId,
      itemKind: "mission",
      title: "Mission modifiable",
      description: null,
      instructionsHtml: "<p>Ok</p>",
      startTime: "12:00",
      endTime: "12:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });
    expect(created.success).toBe(true);
    if (!created.success || !created.data) {
      throw new Error("Expected task creation before update validation.");
    }

    const updated = await updateTemplateTaskAction(created.data.id, {
      categoryId,
      itemKind: "mission",
      title: "Mission modifiable",
      description: null,
      instructionsHtml: "a".repeat(20001),
      startTime: "12:00",
      endTime: "12:30",
      pointsBase: 2,
      assignedProfileId: null,
      knowledgeCardId: null,
      itemSubkind: null,
    });

    expect(updated.success).toBe(false);
    if (updated.success) {
      throw new Error("Expected max length validation rejection on update.");
    }
    expect(updated.error).toContain("20000 caracteres");
  });
});
