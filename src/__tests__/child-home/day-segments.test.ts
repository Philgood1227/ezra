import { describe, expect, it } from "vitest";
import {
  getChildTimeBlockForTimeRange,
  getCurrentDaySegmentId,
  getDaySegmentDefinitions,
  getDaySegmentState,
  resolveChildTimeBlockForDay,
} from "@/lib/time/day-segments";

describe("day segments helper", () => {
  it("returns weekday segments with noon and home blocks", () => {
    const weekdayDate = new Date("2026-02-18T10:00:00");
    const segments = getDaySegmentDefinitions(weekdayDate);
    expect(segments.map((segment) => segment.id)).toEqual([
      "morning",
      "noon",
      "afternoon",
      "home",
      "evening",
    ]);
  });

  it("returns weekend segments without noon/home blocks", () => {
    const weekendDate = new Date("2026-02-22T10:00:00");
    const segments = getDaySegmentDefinitions(weekendDate);
    expect(segments.map((segment) => segment.id)).toEqual(["morning", "afternoon", "evening"]);
  });

  it("maps time to current segment", () => {
    expect(getCurrentDaySegmentId(new Date("2026-02-18T08:30:00"))).toBe("morning");
    expect(getCurrentDaySegmentId(new Date("2026-02-18T12:15:00"))).toBe("noon");
    expect(getCurrentDaySegmentId(new Date("2026-02-18T17:45:00"))).toBe("home");
    expect(getCurrentDaySegmentId(new Date("2026-02-22T19:15:00"))).toBe("evening");
  });

  it("computes segment state in order", () => {
    const ordered = ["morning", "noon", "afternoon", "home", "evening"] as const;
    expect(getDaySegmentState([...ordered], "morning", "afternoon")).toBe("past");
    expect(getDaySegmentState([...ordered], "afternoon", "afternoon")).toBe("current");
    expect(getDaySegmentState([...ordered], "evening", "afternoon")).toBe("upcoming");
  });

  it("maps a time range to child block", () => {
    expect(getChildTimeBlockForTimeRange("08:00", "11:00")).toBe("morning");
    expect(getChildTimeBlockForTimeRange("12:00", "13:00")).toBe("noon");
    expect(getChildTimeBlockForTimeRange("14:00", "16:00")).toBe("afternoon");
    expect(getChildTimeBlockForTimeRange("17:00", "18:00")).toBe("home");
    expect(getChildTimeBlockForTimeRange("19:00", "21:00")).toBe("evening");
  });

  it("falls back noon/home blocks on weekend segments", () => {
    const weekendSegments = ["morning", "afternoon", "evening"] as const;
    expect(resolveChildTimeBlockForDay("noon", [...weekendSegments])).toBe("afternoon");
    expect(resolveChildTimeBlockForDay("home", [...weekendSegments])).toBe("afternoon");
  });
});
