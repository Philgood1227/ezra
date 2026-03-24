import { describe, expect, it } from "vitest";
import {
  getSubkindSuggestionsForCategoryCode,
  normalizeSubkindInput,
} from "@/lib/day-templates/constants";
import type { CategoryCode } from "@/lib/day-templates/types";

describe("category-driven subkind suggestions", () => {
  it("returns curated suggestions for official category codes", () => {
    const homework = getSubkindSuggestionsForCategoryCode("homework");
    const revision = getSubkindSuggestionsForCategoryCode("revision");
    const training = getSubkindSuggestionsForCategoryCode("training");
    const activity = getSubkindSuggestionsForCategoryCode("activity");
    const routine = getSubkindSuggestionsForCategoryCode("routine");
    const leisure = getSubkindSuggestionsForCategoryCode("leisure");
    const social = getSubkindSuggestionsForCategoryCode("activity");
    const health = getSubkindSuggestionsForCategoryCode("routine");

    expect(homework).toContain("Lecture");
    expect(revision).toContain("Mathematiques");
    expect(training).toContain("Quiz");
    expect(activity).toContain("Sport");
    expect(routine).toContain("Hygiene");
    expect(leisure).toContain("Jeux");
    expect(social).toContain("Atelier");
    expect(health).toContain("Repas");

    expect(homework.length).toBeGreaterThan(0);
    expect(revision.length).toBeGreaterThan(0);
    expect(training.length).toBeGreaterThan(0);
    expect(activity.length).toBeGreaterThan(0);
    expect(routine.length).toBeGreaterThan(0);
    expect(leisure.length).toBeGreaterThan(0);
    expect(homework).not.toEqual(leisure);
  });

  it("returns empty suggestions for unknown or undefined category codes", () => {
    expect(getSubkindSuggestionsForCategoryCode(undefined)).toEqual([]);
    expect(getSubkindSuggestionsForCategoryCode(null)).toEqual([]);
    expect(getSubkindSuggestionsForCategoryCode("unknown" as CategoryCode)).toEqual([]);
  });

  it("normalizes subkind input by trimming and collapsing whitespace", () => {
    expect(normalizeSubkindInput("  Maths   avancees  ")).toBe("Maths avancees");
    expect(normalizeSubkindInput(" \n\t ")).toBe("");
  });
});
