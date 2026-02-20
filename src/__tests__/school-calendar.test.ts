import { describe, expect, it } from "vitest";
import {
  buildDayContext,
  deriveDayPeriod,
  findActiveSchoolBlock,
  findNextVacation,
} from "@/lib/day-templates/school-calendar";
import type { DayTemplateBlockSummary, SchoolPeriodSummary } from "@/lib/day-templates/types";

const periods: SchoolPeriodSummary[] = [
  {
    id: "period-1",
    familyId: "family-1",
    periodType: "vacances",
    label: "Vacances d'hiver",
    startDate: "2026-02-15",
    endDate: "2026-02-22",
  },
  {
    id: "period-2",
    familyId: "family-1",
    periodType: "jour_special",
    label: "Pont de l'Ascension",
    startDate: "2026-05-14",
    endDate: "2026-05-14",
  },
];

const blocks: DayTemplateBlockSummary[] = [
  {
    id: "block-1",
    dayTemplateId: "template-1",
    blockType: "school",
    label: "Ecole matin",
    startTime: "08:30",
    endTime: "12:00",
    sortOrder: 0,
  },
  {
    id: "block-2",
    dayTemplateId: "template-1",
    blockType: "school",
    label: "Ecole apres-midi",
    startTime: "13:30",
    endTime: "15:30",
    sortOrder: 1,
  },
];

describe("school-calendar helpers", () => {
  it("derive la periode vacances", () => {
    const result = deriveDayPeriod(new Date("2026-02-16T10:00:00"), periods);
    expect(result.period).toBe("vacances");
  });

  it("derive la periode weekend quand aucune vacance ne s'applique", () => {
    const result = deriveDayPeriod(new Date("2026-02-14T10:00:00"), periods);
    expect(result.period).toBe("weekend");
  });

  it("trouve la prochaine vacance", () => {
    const next = findNextVacation(new Date("2026-02-10T09:00:00"), periods);
    expect(next?.label).toBe("Vacances d'hiver");
    expect(next?.daysUntil).toBe(5);
  });

  it("detecte la plage scolaire active", () => {
    const active = findActiveSchoolBlock(new Date("2026-02-10T08:45:00"), blocks);
    expect(active?.label).toBe("Ecole matin");
  });

  it("construit un contexte de jour coherent", () => {
    const context = buildDayContext({
      date: new Date("2026-02-10T14:00:00"),
      periods,
      dayBlocks: blocks,
    });

    expect(context.period).toBe("ecole");
    expect(context.currentMoment).toBe("apres-midi");
    expect(context.currentContextLabel).toBe("Ecole");
    expect(context.activeSchoolBlockEndTime).toBe("15:30");
    expect(context.daysUntilNextVacation).toBe(5);
  });
});
