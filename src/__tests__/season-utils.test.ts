import { describe, expect, it } from "vitest";
import { getSeason } from "@/lib/utils/season";

describe("season helpers", () => {
  it("returns hiver for january", () => {
    const season = getSeason(new Date(2026, 0, 15, 10, 0, 0));
    expect(season.id).toBe("hiver");
    expect(season.label).toBe("Hiver");
  });

  it("returns printemps for april", () => {
    const season = getSeason(new Date(2026, 3, 15, 10, 0, 0));
    expect(season.id).toBe("printemps");
    expect(season.label).toBe("Printemps");
  });

  it("returns ete for july", () => {
    const season = getSeason(new Date(2026, 6, 15, 10, 0, 0));
    expect(season.id).toBe("ete");
    expect(season.label).toBe("\u00C9t\u00E9");
  });

  it("returns automne for october", () => {
    const season = getSeason(new Date(2026, 9, 15, 10, 0, 0));
    expect(season.id).toBe("automne");
    expect(season.label).toBe("Automne");
  });
});
