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
import { resetDemoDayTemplatesStore } from "@/lib/demo/day-templates-store";

const TEST_FAMILY_ID = "family-overlap-tests";
const mockedGetCurrentProfile = vi.mocked(getCurrentProfile);

async function createBaseTemplateAndCategory(): Promise<{ categoryId: string; templateId: string }> {
  const categoryResult = await createCategoryAction({
    name: "Ecole",
    icon: "📚",
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
});
