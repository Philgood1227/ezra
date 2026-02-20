import { describe, expect, it } from "vitest";
import {
  FRIDAY_BIT,
  MONDAY_BIT,
  SATURDAY_BIT,
  WORKWEEK_DAYS_MASK,
  formatDaysMask,
  getDueAtIsoForRuleNow,
  getModeDaysMask,
} from "@/lib/domain/alarms";

describe("alarms domain", () => {
  it("calcule le masque de recurrence selon le mode", () => {
    expect(getModeDaysMask("semaine_travail", SATURDAY_BIT)).toBe(WORKWEEK_DAYS_MASK);
    expect(getModeDaysMask("ponctuelle", WORKWEEK_DAYS_MASK)).toBe(0);
    expect(getModeDaysMask("personnalise", MONDAY_BIT | FRIDAY_BIT)).toBe(
      MONDAY_BIT | FRIDAY_BIT,
    );
  });

  it("declenche une alarme ponctuelle dans la fenetre de tolerance", () => {
    const dueAt = getDueAtIsoForRuleNow({
      rule: {
        mode: "ponctuelle",
        oneShotAt: "2026-02-12T10:00:00.000Z",
        timeOfDay: null,
        daysMask: 0,
        enabled: true,
      },
      nowIso: "2026-02-12T10:01:00.000Z",
      timezoneOffsetMinutes: 0,
      toleranceMinutes: 2,
    });

    expect(dueAt).toBe("2026-02-12T10:00:00.000Z");
  });

  it("declenche une alarme recurrente avec prise en compte du fuseau local", () => {
    const dueAt = getDueAtIsoForRuleNow({
      rule: {
        mode: "semaine_travail",
        oneShotAt: null,
        timeOfDay: "08:30",
        daysMask: 0,
        enabled: true,
      },
      nowIso: "2026-02-09T07:31:00.000Z",
      timezoneOffsetMinutes: -60,
      toleranceMinutes: 2,
    });

    expect(dueAt).toBe("2026-02-09T07:30:00.000Z");
  });

  it("ne declenche pas le week-end en mode semaine de travail", () => {
    const dueAt = getDueAtIsoForRuleNow({
      rule: {
        mode: "semaine_travail",
        oneShotAt: null,
        timeOfDay: "08:30",
        daysMask: 0,
        enabled: true,
      },
      nowIso: "2026-02-08T07:31:00.000Z",
      timezoneOffsetMinutes: -60,
      toleranceMinutes: 2,
    });

    expect(dueAt).toBeNull();
  });

  it("formate un masque personnalise", () => {
    expect(formatDaysMask(MONDAY_BIT | FRIDAY_BIT)).toBe("Lun, Ven");
  });
});
