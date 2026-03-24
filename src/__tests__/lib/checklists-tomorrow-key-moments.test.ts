import { describe, expect, it } from "vitest";
import {
  buildTomorrowDateContext,
  buildTomorrowKeyMoments,
  mergeTomorrowScheduledTaskMoments,
  type ScheduledTaskMomentInput,
} from "@/lib/api/checklists";

function createScheduledMoment(
  overrides: Partial<ScheduledTaskMomentInput>,
): ScheduledTaskMomentInput {
  return {
    id: overrides.id ?? "moment-1",
    startTime: overrides.startTime ?? "08:00",
    endTime: overrides.endTime ?? "08:30",
    label: overrides.label ?? "Moment",
    sortOrder: overrides.sortOrder ?? 0,
    kind: overrides.kind ?? "mission",
    ...overrides,
  };
}

describe("tomorrow key moments helpers", () => {
  it("uses timezone-aware today/tomorrow keys near midnight", () => {
    const now = new Date("2026-02-21T23:30:00.000Z");
    const context = buildTomorrowDateContext(now, "Europe/Zurich");

    expect(context.todayDateKey).toBe("2026-02-22");
    expect(context.tomorrowDateKey).toBe("2026-02-23");
    expect(context.tomorrowWeekday).toBe(1);
  });

  it("keeps valid scheduled tomorrow mission in key moments (max 5)", () => {
    const moments = buildTomorrowKeyMoments([
      createScheduledMoment({
        id: "invalid-time",
        startTime: "invalide",
        endTime: "invalide",
        label: "Moment invalide",
        sortOrder: 0,
        kind: "activity",
      }),
      createScheduledMoment({
        id: "m-1",
        startTime: "07:30",
        endTime: "08:00",
        label: "Petit dejeuner",
        sortOrder: 1,
        kind: "activity",
      }),
      createScheduledMoment({
        id: "m-2",
        startTime: "08:30",
        endTime: "09:00",
        label: "Trajet",
        sortOrder: 2,
        kind: "activity",
      }),
      createScheduledMoment({
        id: "mission-core",
        startTime: "09:00",
        endTime: "09:45",
        label: "Devoirs maths",
        sortOrder: 3,
        kind: "mission",
      }),
      createScheduledMoment({
        id: "m-4",
        startTime: "10:00",
        endTime: "10:30",
        label: "Lecture",
        sortOrder: 4,
        kind: "mission",
      }),
      createScheduledMoment({
        id: "m-5",
        startTime: "11:00",
        endTime: "11:30",
        label: "Pause",
        sortOrder: 5,
        kind: "leisure",
      }),
      createScheduledMoment({
        id: "m-6",
        startTime: "12:00",
        endTime: "12:30",
        label: "Activite manuelle",
        sortOrder: 6,
        kind: "activity",
      }),
    ]);

    expect(moments).toHaveLength(5);
    expect(moments.some((moment) => moment.label === "Devoirs maths")).toBe(true);
    expect(moments.some((moment) => moment.label === "Moment invalide")).toBe(false);
    expect(moments.some((moment) => moment.label === "Activite manuelle")).toBe(false);
  });

  it("merges planned and template tasks so template-only tomorrow mission is not dropped", () => {
    const plannedMoments: ScheduledTaskMomentInput[] = [
      createScheduledMoment({
        id: "instance-1",
        templateTaskId: "template-1",
        startTime: "08:30",
        endTime: "09:00",
        label: "Trajet ecole",
        sortOrder: 1,
        kind: "activity",
        source: "planned_instance",
        status: "a_faire",
        dateKey: "2026-02-23",
      }),
    ];

    const templateMoments: ScheduledTaskMomentInput[] = [
      createScheduledMoment({
        id: "template-1",
        templateTaskId: "template-1",
        startTime: "08:30",
        endTime: "09:00",
        label: "Trajet ecole",
        sortOrder: 1,
        kind: "activity",
        source: "template_task",
        status: "planned",
        dateKey: "2026-02-23",
      }),
      createScheduledMoment({
        id: "template-mission-parent",
        templateTaskId: "template-mission-parent",
        startTime: "07:15",
        endTime: "07:45",
        label: "Mission parent dashboard",
        sortOrder: 0,
        kind: "mission",
        source: "template_task",
        status: "planned",
        dateKey: "2026-02-23",
      }),
    ];

    const merged = mergeTomorrowScheduledTaskMoments({
      plannedTaskMoments: plannedMoments,
      templateTaskMoments: templateMoments,
    });
    const keyMoments = buildTomorrowKeyMoments(merged);

    expect(keyMoments.some((moment) => moment.label === "Mission parent dashboard")).toBe(true);
    expect(keyMoments.filter((moment) => moment.label === "Trajet ecole")).toHaveLength(1);
  });

  it("keeps earliest mission in key moments when merged moments exceed max 5", () => {
    const plannedMoments: ScheduledTaskMomentInput[] = [
      createScheduledMoment({
        id: "instance-1",
        templateTaskId: "template-1",
        startTime: "08:30",
        endTime: "09:00",
        label: "Trajet",
        sortOrder: 1,
        kind: "activity",
        source: "planned_instance",
        status: "a_faire",
        dateKey: "2026-02-23",
      }),
      createScheduledMoment({
        id: "instance-2",
        templateTaskId: "template-2",
        startTime: "09:30",
        endTime: "10:00",
        label: "Atelier",
        sortOrder: 2,
        kind: "activity",
        source: "planned_instance",
        status: "a_faire",
        dateKey: "2026-02-23",
      }),
      createScheduledMoment({
        id: "instance-3",
        templateTaskId: "template-3",
        startTime: "11:00",
        endTime: "11:30",
        label: "Lecture",
        sortOrder: 3,
        kind: "mission",
        source: "planned_instance",
        status: "a_faire",
        dateKey: "2026-02-23",
      }),
      createScheduledMoment({
        id: "instance-4",
        templateTaskId: "template-4",
        startTime: "14:00",
        endTime: "14:30",
        label: "Pause",
        sortOrder: 4,
        kind: "leisure",
        source: "planned_instance",
        status: "a_faire",
        dateKey: "2026-02-23",
      }),
      createScheduledMoment({
        id: "instance-5",
        templateTaskId: "template-5",
        startTime: "18:00",
        endTime: "18:30",
        label: "Temps calme",
        sortOrder: 5,
        kind: "leisure",
        source: "planned_instance",
        status: "a_faire",
        dateKey: "2026-02-23",
      }),
    ];

    const templateMoments: ScheduledTaskMomentInput[] = [
      createScheduledMoment({
        id: "template-early-mission",
        templateTaskId: "template-early-mission",
        startTime: "07:00",
        endTime: "07:20",
        label: "Mission parent dashboard",
        sortOrder: 0,
        kind: "mission",
        source: "template_task",
        status: "planned",
        dateKey: "2026-02-23",
      }),
      createScheduledMoment({
        id: "template-late",
        templateTaskId: "template-late",
        startTime: "19:30",
        endTime: "20:00",
        label: "Mission tardive",
        sortOrder: 6,
        kind: "mission",
        source: "template_task",
        status: "planned",
        dateKey: "2026-02-23",
      }),
    ];

    const merged = mergeTomorrowScheduledTaskMoments({
      plannedTaskMoments: plannedMoments,
      templateTaskMoments: templateMoments,
    });
    const keyMoments = buildTomorrowKeyMoments(merged);

    expect(keyMoments).toHaveLength(5);
    expect(keyMoments[0]?.label).toBe("Mission parent dashboard");
    expect(keyMoments.some((moment) => moment.label === "Mission tardive")).toBe(false);
  });
});
