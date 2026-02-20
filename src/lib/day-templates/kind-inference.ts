import type { DayTemplateBlockType, PlanActionableKind, PlanContextSubkind } from "@/lib/day-templates/types";

interface InferActionableKindInput {
  colorKey?: string | null;
  categoryName?: string | null;
  title?: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function includesOneOf(haystack: string, words: string[]): boolean {
  return words.some((word) => haystack.includes(word));
}

export function inferActionableKind(input: InferActionableKindInput): PlanActionableKind {
  const colorKey = normalize(input.colorKey);
  const categoryName = normalize(input.categoryName);
  const title = normalize(input.title);
  const combined = `${categoryName} ${title}`.trim();

  if (colorKey.includes("loisir")) {
    return "leisure";
  }

  if (colorKey.includes("sport")) {
    return "activity";
  }

  if (colorKey.includes("ecole")) {
    return "mission";
  }

  if (
    includesOneOf(combined, [
      "jeu",
      "gaming",
      "naruto",
      "film",
      "dessin",
      "youtube",
      "video",
      "loisir",
      "recre",
      "cour",
      "tv",
    ])
  ) {
    return "leisure";
  }

  if (
    includesOneOf(combined, [
      "boxe",
      "chorale",
      "sport",
      "club",
      "danse",
      "piano",
      "musique",
      "activite",
      "rdv",
      "rendez-vous",
      "therapie",
    ])
  ) {
    return "activity";
  }

  return "mission";
}

export function toContextSubkind(blockType: DayTemplateBlockType): PlanContextSubkind {
  if (blockType === "school") {
    return "school";
  }

  if (blockType === "home") {
    return "home";
  }

  if (blockType === "transport") {
    return "transport";
  }

  if (blockType === "club" || blockType === "daycare") {
    return "club";
  }

  return "other";
}
