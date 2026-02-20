import type { PlanActionableKind } from "@/lib/day-templates/types";

export interface WeekdayOption {
  value: number;
  label: string;
}

export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

export function getWeekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? "Jour inconnu";
}

export function getWeekdaySortKey(weekday: number): number {
  return weekday === 0 ? 7 : weekday;
}

export interface CategoryColorOption {
  key: string;
  label: string;
  badgeClass: string;
  eventClass: string;
  accentClass: string;
  softClass: string;
}

export const CATEGORY_COLOR_OPTIONS: CategoryColorOption[] = [
  {
    key: "category-routine",
    label: "Routine",
    badgeClass: "bg-brand-100 text-brand-900",
    eventClass: "border-brand-300 bg-brand-50 text-brand-900",
    accentClass: "bg-brand-500",
    softClass: "bg-brand-100",
  },
  {
    key: "category-ecole",
    label: "Ecole",
    badgeClass: "bg-accent-100 text-accent-900",
    eventClass: "border-accent-300 bg-accent-50 text-accent-900",
    accentClass: "bg-accent-500",
    softClass: "bg-accent-100",
  },
  {
    key: "category-repas",
    label: "Repas",
    badgeClass: "bg-amber-100 text-amber-900",
    eventClass: "border-amber-300 bg-amber-50 text-amber-900",
    accentClass: "bg-amber-500",
    softClass: "bg-amber-100",
  },
  {
    key: "category-sport",
    label: "Sport",
    badgeClass: "bg-emerald-100 text-emerald-900",
    eventClass: "border-emerald-300 bg-emerald-50 text-emerald-900",
    accentClass: "bg-emerald-500",
    softClass: "bg-emerald-100",
  },
  {
    key: "category-loisir",
    label: "Loisir",
    badgeClass: "bg-fuchsia-100 text-fuchsia-900",
    eventClass: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900",
    accentClass: "bg-fuchsia-500",
    softClass: "bg-fuchsia-100",
  },
  {
    key: "category-calme",
    label: "Calme",
    badgeClass: "bg-slate-100 text-slate-900",
    eventClass: "border-slate-300 bg-slate-50 text-slate-900",
    accentClass: "bg-slate-500",
    softClass: "bg-slate-100",
  },
  {
    key: "category-sommeil",
    label: "Sommeil",
    badgeClass: "bg-indigo-100 text-indigo-900",
    eventClass: "border-indigo-300 bg-indigo-50 text-indigo-900",
    accentClass: "bg-indigo-500",
    softClass: "bg-indigo-100",
  },
];

const DEFAULT_COLOR_OPTION: CategoryColorOption = CATEGORY_COLOR_OPTIONS[0] ?? {
  key: "category-routine",
  label: "Routine",
  badgeClass: "bg-brand-100 text-brand-900",
  eventClass: "border-brand-300 bg-brand-50 text-brand-900",
  accentClass: "bg-brand-500",
  softClass: "bg-brand-100",
};

export function getCategoryColorOption(colorKey: string): CategoryColorOption {
  return CATEGORY_COLOR_OPTIONS.find((option) => option.key === colorKey) ?? DEFAULT_COLOR_OPTION;
}

export interface PlanActionableKindOption {
  value: PlanActionableKind;
  label: string;
  description: string;
  badgeClass: string;
}

export const PLAN_ACTIONABLE_KIND_OPTIONS: PlanActionableKindOption[] = [
  {
    value: "mission",
    label: "Mission",
    description: "Devoirs, revisions, apprentissages",
    badgeClass: "bg-accent-100 text-accent-900",
  },
  {
    value: "activity",
    label: "Activite",
    description: "Cours, sport, deplacements, routines",
    badgeClass: "bg-emerald-100 text-emerald-900",
  },
  {
    value: "leisure",
    label: "Loisir",
    description: "Jeux, detente, temps libre",
    badgeClass: "bg-fuchsia-100 text-fuchsia-900",
  },
];

export const PLAN_SUBKIND_SUGGESTIONS: Record<PlanActionableKind, string[]> = {
  mission: ["devoirs", "revision", "lecture", "maths", "langues", "memo", "projet scolaire"],
  activity: ["ecole", "sport", "club", "transport", "repas", "hygiene", "rdv", "chorale"],
  leisure: ["jeu", "jeu video", "dessin anime", "film", "naruto", "dessin", "cour", "repos"],
};

export function getPlanActionableKindLabel(kind: PlanActionableKind): string {
  return PLAN_ACTIONABLE_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Mission";
}
