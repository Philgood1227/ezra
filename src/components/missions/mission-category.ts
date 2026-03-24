import { resolveCategoryCode } from "@/lib/day-templates/constants";

export type MissionCategory = "homework" | "revision" | "training";

interface MissionCategoryInput {
  title?: string | null;
  itemSubkind?: string | null;
  categoryName?: string | null;
  iconKey?: string | null;
}

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function containsTrainingToken(input: MissionCategoryInput): boolean {
  const tokens = normalizeText(
    [input.itemSubkind, input.title, input.categoryName]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  );

  return tokens.includes("entrainement") || tokens.includes("training");
}

export function resolveMissionCategory(input: MissionCategoryInput): MissionCategory | null {
  if (containsTrainingToken(input)) {
    return "training";
  }

  const categoryCode = resolveCategoryCode({
    ...(input.categoryName === undefined ? {} : { name: input.categoryName }),
    ...(input.iconKey === undefined ? {} : { iconKey: input.iconKey }),
  });

  if (categoryCode === "homework") {
    return "homework";
  }

  if (categoryCode === "revision") {
    return "revision";
  }

  if (categoryCode === "training") {
    return "training";
  }

  return null;
}

export function getMissionCategoryLabel(category: MissionCategory): string {
  if (category === "homework") {
    return "Devoirs";
  }

  if (category === "revision") {
    return "Revisions";
  }

  return "Entrainement";
}
