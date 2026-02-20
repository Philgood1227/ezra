export type SeasonId = "hiver" | "printemps" | "ete" | "automne";

export interface SeasonInfo {
  id: SeasonId;
  label: string;
  icon: string;
  colorClass: string;
}

const seasonMap: Record<SeasonId, Omit<SeasonInfo, "id">> = {
  hiver: {
    label: "Hiver",
    icon: "\u2744\uFE0F",
    colorClass: "border-category-ecole/40 bg-category-ecole/20 text-text-primary",
  },
  printemps: {
    label: "Printemps",
    icon: "\uD83C\uDF38",
    colorClass: "border-category-repas/40 bg-category-repas/20 text-text-primary",
  },
  ete: {
    label: "\u00C9t\u00E9",
    icon: "\u2600\uFE0F",
    colorClass: "border-accent-warm/40 bg-accent-warm/20 text-text-primary",
  },
  automne: {
    label: "Automne",
    icon: "\uD83C\uDF42",
    colorClass: "border-category-sport/40 bg-category-sport/20 text-text-primary",
  },
};

function getSeasonIdFromMonth(monthIndex: number): SeasonId {
  if (monthIndex >= 2 && monthIndex <= 4) {
    return "printemps";
  }

  if (monthIndex >= 5 && monthIndex <= 7) {
    return "ete";
  }

  if (monthIndex >= 8 && monthIndex <= 10) {
    return "automne";
  }

  return "hiver";
}

export function getSeason(date: Date): SeasonInfo {
  const seasonId = getSeasonIdFromMonth(date.getMonth());
  return {
    id: seasonId,
    ...seasonMap[seasonId],
  };
}