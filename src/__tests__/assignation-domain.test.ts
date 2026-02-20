import { describe, expect, it } from "vitest";
import { ensureDemoTaskInstancesForDate, resetDemoGamificationStore } from "@/lib/demo/gamification-store";
import {
  createDemoCategory,
  createDemoTemplateTask,
  listDemoTemplateTasks,
  resetDemoDayTemplatesStore,
  upsertDemoTemplate,
} from "@/lib/demo/day-templates-store";

describe("assignation propagation", () => {
  it("copie assignedProfileId du template vers l'instance", () => {
    const familyId = `family-assign-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

    resetDemoDayTemplatesStore(familyId);
    resetDemoGamificationStore(familyId);

    const category = createDemoCategory(familyId, {
      name: "Routine",
      icon: "??",
      colorKey: "category-routine",
    });
    const template = upsertDemoTemplate(familyId, {
      name: "Jour test",
      weekday: 1,
      isDefault: true,
    });

    createDemoTemplateTask(familyId, template.id, {
      categoryId: category.id,
      assignedProfileId: "dev-parent-id",
      title: "Verifier le cartable",
      description: null,
      startTime: "07:30",
      endTime: "07:45",
      pointsBase: 2,
      knowledgeCardId: null,
    });

    const tasks = listDemoTemplateTasks(familyId, template.id);
    const instances = ensureDemoTaskInstancesForDate({
      familyId,
      childProfileId: "dev-child-id",
      date: "2026-02-12",
      templateTasks: tasks,
    });

    expect(instances).toHaveLength(1);
    expect(instances[0]?.assignedProfileId).toBe("dev-parent-id");
    expect(instances[0]?.assignedProfileRole).toBe("parent");
  });
});
