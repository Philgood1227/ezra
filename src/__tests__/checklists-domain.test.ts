import { describe, expect, it } from "vitest";
import {
  generateChecklistDraftForDiaryEntry,
  getRelativeChecklistDay,
  mapDiaryTypeToChecklistType,
  selectChecklistTemplateForEntry,
} from "@/lib/domain/checklists";
import type { ChecklistTemplateSummary, SchoolDiaryEntrySummary } from "@/lib/day-templates/types";

function createEntry(type: SchoolDiaryEntrySummary["type"]): SchoolDiaryEntrySummary {
  return {
    id: "entry-1",
    familyId: "family-1",
    childProfileId: "child-1",
    type,
    subject: "EPS",
    title: "Piscine vendredi",
    description: null,
    date: "2026-02-13",
    recurrencePattern: "none",
    recurrenceUntilDate: null,
    recurrenceGroupId: null,
    createdAt: "2026-02-11T10:00:00.000Z",
    updatedAt: "2026-02-11T10:00:00.000Z",
  };
}

const templates: ChecklistTemplateSummary[] = [
  {
    id: "template-piscine",
    familyId: "family-1",
    type: "piscine",
    label: "Sac piscine",
    description: null,
    isDefault: true,
    items: [
      { id: "item-1", templateId: "template-piscine", label: "Maillot", sortOrder: 0 },
      { id: "item-2", templateId: "template-piscine", label: "Serviette", sortOrder: 1 },
    ],
  },
  {
    id: "template-quotidien",
    familyId: "family-1",
    type: "quotidien",
    label: "Routine soir",
    description: null,
    isDefault: true,
    items: [{ id: "item-3", templateId: "template-quotidien", label: "Cartable", sortOrder: 0 }],
  },
];

describe("checklists domain", () => {
  it("mappe correctement les types du carnet", () => {
    expect(mapDiaryTypeToChecklistType("piscine")).toBe("piscine");
    expect(mapDiaryTypeToChecklistType("sortie")).toBe("sortie");
    expect(mapDiaryTypeToChecklistType("evaluation")).toBe("evaluation");
    expect(mapDiaryTypeToChecklistType("devoir")).toBe("quotidien");
    expect(mapDiaryTypeToChecklistType("info")).toBe("autre");
  });

  it("choisit le bon template par type", () => {
    const template = selectChecklistTemplateForEntry(createEntry("piscine"), templates);
    expect(template?.id).toBe("template-piscine");
  });

  it("genere une instance checklist avec les items du template", () => {
    const draft = generateChecklistDraftForDiaryEntry(createEntry("piscine"), templates);

    expect(draft.type).toBe("piscine");
    expect(draft.label).toBe("Sac piscine");
    expect(draft.items).toHaveLength(2);
    expect(draft.items[0]?.label).toBe("Maillot");
  });

  it("retourne un brouillon sans item si aucun template n'existe", () => {
    const draft = generateChecklistDraftForDiaryEntry(createEntry("sortie"), []);

    expect(draft.type).toBe("sortie");
    expect(draft.templateId).toBeNull();
    expect(draft.items).toHaveLength(0);
  });

  it("calcule la relative day", () => {
    const now = new Date("2026-02-11T10:00:00.000Z");

    expect(getRelativeChecklistDay("2026-02-11", now)).toBe("today");
    expect(getRelativeChecklistDay("2026-02-12", now)).toBe("tomorrow");
    expect(getRelativeChecklistDay("2026-02-15", now)).toBe("later");
    expect(getRelativeChecklistDay("2026-02-09", now)).toBe("past");
  });
});
