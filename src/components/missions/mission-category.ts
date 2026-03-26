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

function parseSubjectFromRaw(rawValue: string | null | undefined): string | null {
  const raw = rawValue?.trim();
  if (!raw) {
    return null;
  }

  const fromPrefixed = raw.match(/subject\s*:\s*(.+)$/i)?.[1]?.trim() ?? raw;
  const normalized = normalizeText(fromPrefixed);

  if (/francais|francais/.test(normalized)) {
    return "Francais";
  }

  if (/math|mathematiques|mathematiques/.test(normalized)) {
    return "Mathematiques";
  }

  if (/allemand/.test(normalized)) {
    return "Allemand";
  }

  return null;
}

export function getMissionSubjectLabel(input: MissionCategoryInput): string | null {
  return parseSubjectFromRaw(input.itemSubkind) ?? parseSubjectFromRaw(input.title);
}

export function getMissionCategoryDisplayLabel(category: MissionCategory, subjectLabel: string | null): string {
  const base = getMissionCategoryLabel(category);
  if (!subjectLabel) {
    return base;
  }

  if (category === "training") {
    const prefix = subjectLabel === "Allemand" ? "evaluation d'" : "evaluation de ";
    return `${base} - ${prefix}${subjectLabel}`;
  }

  return `${base} - ${subjectLabel}`;
}
