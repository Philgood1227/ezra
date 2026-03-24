import { describe, expect, it } from "vitest";
import type { ChildHomeTaskSummary } from "@/lib/api/child-home";
import {
  mapTaskStatusToMissionStatus,
  mapTaskToMission,
  mapTasksToMissions,
} from "@/components/missions/mappers";

function createTask(overrides: Partial<ChildHomeTaskSummary> = {}): ChildHomeTaskSummary {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    templateTaskId: overrides.templateTaskId ?? "template-1",
    title: overrides.title ?? "Maths",
    iconKey: overrides.iconKey ?? "school",
    colorKey: overrides.colorKey ?? "category-ecole",
    categoryName: overrides.categoryName ?? "Ecole",
    startTime: overrides.startTime ?? "16:00",
    endTime: overrides.endTime ?? "16:20",
    itemKind: overrides.itemKind ?? "mission",
    itemSubkind: overrides.itemSubkind ?? "devoirs",
    status: overrides.status ?? "a_faire",
    description: overrides.description ?? "Exercices 1 et 2",
    pointsBase: overrides.pointsBase ?? 4,
    pointsEarned: overrides.pointsEarned ?? 0,
    recommendedChildTimeBlockId: overrides.recommendedChildTimeBlockId ?? "home",
    instructionsHtml: overrides.instructionsHtml ?? null,
    estimatedMinutes: overrides.estimatedMinutes ?? null,
    helpLinks: overrides.helpLinks ?? null,
    knowledgeCardId: overrides.knowledgeCardId ?? null,
    knowledgeCardTitle: overrides.knowledgeCardTitle ?? null,
  };
}

describe("missions mappers", () => {
  it("maps task status values to mission statuses", () => {
    expect(mapTaskStatusToMissionStatus("a_faire")).toBe("todo");
    expect(mapTaskStatusToMissionStatus("en_cours")).toBe("in_progress");
    expect(mapTaskStatusToMissionStatus("termine")).toBe("done");
    expect(mapTaskStatusToMissionStatus("ignore")).toBe("done");
  });

  it("maps a mission task into mission UI fields", () => {
    const mission = mapTaskToMission(
      createTask({
        status: "en_cours",
        instructionsHtml: "<p>Lis la lecon puis fais la page 42.</p>",
        helpLinks: [{ id: "f1", label: "Table de 10", href: "/child/knowledge?card=card-10" }],
      }),
    );

    expect(mission).not.toBeNull();
    expect(mission?.status).toBe("in_progress");
    expect(mission?.estimatedMinutes).toBe(20);
    expect(mission?.points).toBe(4);
    expect(mission?.instructionsHtml).toContain("page 42");
    expect(mission?.helpLinks[0]?.label).toBe("Table de 10");
    expect(mission?.recommendedBlockLabel).toBe("Maison");
  });

  it("falls back to escaped description when instructionsHtml is missing", () => {
    const mission = mapTaskToMission(
      createTask({
        instructionsHtml: null,
        description: "<script>alert('x')</script>",
      }),
    );

    expect(mission?.instructionsHtml).toBe(
      "<p>&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</p>",
    );
  });

  it("builds fallback help link from knowledge card data", () => {
    const mission = mapTaskToMission(
      createTask({
        helpLinks: null,
        knowledgeCardId: "card-fractions",
        knowledgeCardTitle: "Fractions - Rappel",
      }),
    );

    expect(mission?.helpLinks).toHaveLength(1);
    expect(mission?.helpLinks[0]?.href).toBe("/child/knowledge?card=card-fractions");
  });

  it("filters non-mission tasks from mission list", () => {
    const missions = mapTasksToMissions([
      createTask({ id: "m1", title: "Mission 1" }),
      createTask({ id: "a1", itemKind: "activity", title: "Chorale" }),
      createTask({ id: "m2", title: "Mission 2", itemKind: "mission" }),
    ]);

    expect(missions).toHaveLength(2);
    expect(missions.map((entry) => entry.title)).toEqual(["Mission 1", "Mission 2"]);
  });

  it("keeps only mission categories homework, revision and training", () => {
    const missions = mapTasksToMissions([
      createTask({ id: "m1", title: "Maths", iconKey: "homework", categoryName: "Devoirs" }),
      createTask({ id: "m2", title: "Quiz", iconKey: "activity", categoryName: "Activites" }),
      createTask({ id: "m3", title: "Fiches", iconKey: "knowledge", categoryName: "Revisions" }),
      createTask({
        id: "m4",
        title: "Sprint calcul",
        iconKey: "activity",
        categoryName: "Activites",
        itemSubkind: "entrainement",
      }),
    ]);

    expect(missions.map((entry) => entry.id)).toEqual(["m3", "m1", "m4"]);
  });

  it("maps entrainement tasks to training mission category", () => {
    const mission = mapTaskToMission(
      createTask({
        title: "Drill",
        iconKey: "activity",
        categoryName: "Activites",
        itemSubkind: "entrainement",
      }),
    );

    expect(mission).not.toBeNull();
    expect(mission?.missionCategory).toBe("training");
  });

  it("maps category name Entrainement to training mission category", () => {
    const mission = mapTaskToMission(
      createTask({
        title: "Sprint fractions",
        iconKey: "sport",
        categoryName: "Entrainement",
        itemSubkind: "quiz",
      }),
    );

    expect(mission).not.toBeNull();
    expect(mission?.missionCategory).toBe("training");
  });
});
