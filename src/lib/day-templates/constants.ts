import type {
  CategoryCode,
  CategoryColorKey,
  CategoryIconKey,
  PlanActionableKind,
} from "@/lib/day-templates/types";

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

export const CATEGORY_COLOR_KEYS = [
  "category-routine",
  "category-ecole",
  "category-repas",
  "category-sport",
  "category-loisir",
  "category-calme",
  "category-sommeil",
] as const satisfies readonly CategoryColorKey[];

export const DEFAULT_CATEGORY_COLOR_KEY: CategoryColorKey = "category-routine";

export const CATEGORY_CODES = [
  "homework",
  "revision",
  "training",
  "activity",
  "routine",
  "leisure",
] as const satisfies readonly CategoryCode[];

export const CATEGORY_CODE_LABELS: Record<CategoryCode, string> = {
  homework: "Devoirs",
  training: "Entrainement",
  revision: "Révisions",
  activity: "Activités",
  routine: "Routine",
  leisure: "Loisirs",
};

const CATEGORY_COLOR_KEY_SET = new Set<string>(CATEGORY_COLOR_KEYS);
const CATEGORY_CODE_SET = new Set<string>(CATEGORY_CODES);

const LEGACY_CATEGORY_COLOR_ALIASES: Record<string, CategoryColorKey> = {
  routine: "category-routine",
  ecole: "category-ecole",
  school: "category-ecole",
  repas: "category-repas",
  meal: "category-repas",
  sport: "category-sport",
  loisir: "category-loisir",
  leisure: "category-loisir",
  calme: "category-calme",
  calm: "category-calme",
  sommeil: "category-sommeil",
  sleep: "category-sommeil",
};

export function isCategoryColorKey(value: string): value is CategoryColorKey {
  return CATEGORY_COLOR_KEY_SET.has(value);
}

function normalizeCatalogToken(raw: string | null | undefined): string {
  return typeof raw === "string"
    ? raw
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";
}

export function isCategoryCode(value: string): value is CategoryCode {
  return CATEGORY_CODE_SET.has(value);
}

const LEGACY_CATEGORY_CODE_ALIASES: Record<string, CategoryCode> = {
  homework: "homework",
  devoir: "homework",
  devoirs: "homework",
  school: "homework",
  scolaire: "homework",
  ecole: "homework",
  revision: "revision",
  revisions: "revision",
  fiche: "revision",
  fiches: "revision",
  training: "training",
  entrainement: "training",
  entrainements: "training",
  drill: "training",
  activity: "activity",
  activite: "activity",
  activites: "activity",
  sport: "activity",
  social: "activity",
  routine: "routine",
  quotidien: "routine",
  repas: "routine",
  meal: "routine",
  hygiene: "routine",
  sante: "routine",
  health: "routine",
  sommeil: "routine",
  sleep: "routine",
  leisure: "leisure",
  loisir: "leisure",
  loisirs: "leisure",
  jeux: "leisure",
};

export function parseCategoryCode(raw: string | null | undefined): CategoryCode | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (isCategoryCode(trimmed)) {
      return trimmed;
    }
  }

  const normalized = normalizeCatalogToken(raw);
  return LEGACY_CATEGORY_CODE_ALIASES[normalized] ?? null;
}

export function getCategoryCodeLabel(code: CategoryCode): string {
  return CATEGORY_CODE_LABELS[code];
}

export function resolveCategoryCode(input: {
  code?: string | null;
  name?: string | null;
  iconKey?: string | null;
  colorKey?: string | null;
  defaultItemKind?: PlanActionableKind | null;
}): CategoryCode {
  const explicit = parseCategoryCode(input.code);
  if (explicit) {
    return explicit;
  }

  const tokens = [
    normalizeCatalogToken(input.name),
    normalizeCatalogToken(input.iconKey),
    normalizeCatalogToken(input.colorKey),
  ].join(" ");

  if (
    tokens.includes("training") ||
    tokens.includes("entrainement") ||
    tokens.includes("drill")
  ) {
    return "training";
  }

  if (
    tokens.includes("revision") ||
    tokens.includes("knowledge") ||
    tokens.includes("fiche") ||
    tokens.includes("controle")
  ) {
    return "revision";
  }

  if (
    tokens.includes("devoir") ||
    tokens.includes("homework") ||
    tokens.includes("school") ||
    tokens.includes("ecole") ||
    tokens.includes("scolaire")
  ) {
    return "homework";
  }

  if (
    tokens.includes("activite") ||
    tokens.includes("activity") ||
    tokens.includes("sport") ||
    tokens.includes("musique") ||
    tokens.includes("atelier") ||
    tokens.includes("sortie") ||
    tokens.includes("rendez") ||
    tokens.includes("rdv") ||
    tokens.includes("social")
  ) {
    return "activity";
  }

  if (
    tokens.includes("routine") ||
    tokens.includes("quotidien") ||
    tokens.includes("matin") ||
    tokens.includes("soir") ||
    tokens.includes("repas") ||
    tokens.includes("meal") ||
    tokens.includes("hygien") ||
    tokens.includes("sommeil") ||
    tokens.includes("sleep") ||
    tokens.includes("calme") ||
    tokens.includes("sante") ||
    tokens.includes("health")
  ) {
    return "routine";
  }

  if (
    tokens.includes("loisir") ||
    tokens.includes("leisure") ||
    tokens.includes("jeu") ||
    tokens.includes("film") ||
    tokens.includes("ecran") ||
    tokens.includes("dessin") ||
    tokens.includes("dehors")
  ) {
    return "leisure";
  }

  if (input.defaultItemKind === "leisure") {
    return "leisure";
  }

  if (input.defaultItemKind === "activity") {
    return "activity";
  }

  return "homework";
}

export function parseCategoryColorKey(raw: string | null | undefined): CategoryColorKey {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (isCategoryColorKey(trimmed)) {
      return trimmed;
    }
  }

  const normalized = normalizeCatalogToken(raw);
  const aliasMatch = LEGACY_CATEGORY_COLOR_ALIASES[normalized];
  if (aliasMatch) {
    return aliasMatch;
  }

  return DEFAULT_CATEGORY_COLOR_KEY;
}

export interface CategoryColorOption {
  key: CategoryColorKey;
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

const CATEGORY_COLOR_OPTION_BY_KEY = new Map(CATEGORY_COLOR_OPTIONS.map((option) => [option.key, option]));
const DEFAULT_COLOR_OPTION: CategoryColorOption = CATEGORY_COLOR_OPTION_BY_KEY.get(DEFAULT_CATEGORY_COLOR_KEY) ?? {
  key: DEFAULT_CATEGORY_COLOR_KEY,
  label: "Routine",
  badgeClass: "bg-brand-100 text-brand-900",
  eventClass: "border-brand-300 bg-brand-50 text-brand-900",
  accentClass: "bg-brand-500",
  softClass: "bg-brand-100",
};

export function getCategoryColorOption(colorKey: string | null | undefined): CategoryColorOption {
  return CATEGORY_COLOR_OPTION_BY_KEY.get(parseCategoryColorKey(colorKey)) ?? DEFAULT_COLOR_OPTION;
}

export const CATEGORY_ICON_KEYS = [
  "default",
  "school",
  "activity",
  "routine",
  "leisure",
  "social",
  "health",
  "homework",
  "meal",
  "sport",
  "calm",
  "sleep",
  "transport",
  "hygiene",
  "knowledge",
  "checklist",
  "star",
] as const satisfies readonly CategoryIconKey[];

export const DEFAULT_CATEGORY_ICON_KEY: CategoryIconKey = "default";

const CATEGORY_ICON_KEY_SET = new Set<string>(CATEGORY_ICON_KEYS);

const LEGACY_CATEGORY_ICON_ALIASES: Record<string, CategoryIconKey> = {
  default: "default",
  school: "homework",
  ecole: "homework",
  scolaire: "homework",
  homework: "homework",
  devoir: "homework",
  devoirs: "homework",
  revision: "knowledge",
  revisions: "knowledge",
  training: "sport",
  entrainement: "sport",
  entrainements: "sport",
  knowledge: "knowledge",
  activity: "activity",
  activite: "activity",
  activites: "activity",
  sport: "activity",
  transport: "activity",
  deplacement: "activity",
  deplacements: "activity",
  routine: "routine",
  quotidien: "routine",
  meal: "routine",
  repas: "routine",
  checklist: "routine",
  loisirs: "leisure",
  leisure: "leisure",
  loisir: "leisure",
  social: "activity",
  star: "activity",
  health: "routine",
  sante: "routine",
  calm: "routine",
  calme: "routine",
  sleep: "routine",
  sommeil: "routine",
  hygiene: "routine",
  "category-routine": "routine",
  "category-ecole": "homework",
  "category-repas": "routine",
  "category-sport": "activity",
  "category-loisir": "leisure",
  "category-calme": "routine",
  "category-sommeil": "routine",
};

export function isCategoryIconKey(value: string): value is CategoryIconKey {
  return CATEGORY_ICON_KEY_SET.has(value);
}

export function parseCategoryIconKey(raw: string | null | undefined): CategoryIconKey {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (isCategoryIconKey(trimmed)) {
      return trimmed;
    }
  }

  const normalized = normalizeCatalogToken(raw);
  const aliasMatch = LEGACY_CATEGORY_ICON_ALIASES[normalized];
  if (aliasMatch) {
    return aliasMatch;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const directAlias = LEGACY_CATEGORY_ICON_ALIASES[trimmed];
    if (directAlias) {
      return directAlias;
    }
  }

  return DEFAULT_CATEGORY_ICON_KEY;
}

export interface CategoryIconOption {
  key: CategoryIconKey;
  label: string;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: "homework", label: "Devoirs" },
  { key: "knowledge", label: "Revisions" },
  { key: "sport", label: "Entrainement" },
  { key: "activity", label: "Activites" },
  { key: "routine", label: "Routine" },
  { key: "leisure", label: "Loisirs" },
];

const CATEGORY_ICON_LABEL_BY_KEY = new Map(CATEGORY_ICON_OPTIONS.map((option) => [option.key, option.label]));

export function getCategoryIconLabel(iconKey: CategoryIconKey): string {
  return CATEGORY_ICON_LABEL_BY_KEY.get(iconKey) ?? "Defaut";
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

export const CATEGORY_SUBKIND_SUGGESTIONS_BY_CODE: Record<CategoryCode, string[]> = {
  homework: ["Lecture", "Exercices", "Lecon", "Controle", "Redaction", "Organisation"],
  revision: ["Mathematiques", "Francais", "Langue", "Lecture", "Fiches", "Memorisation"],
  training: ["Calcul mental", "Quiz", "Drill", "Chrono", "Exercices", "Defi"],
  activity: ["Sport", "Musique", "Atelier", "Sortie", "Rendez-vous"],
  routine: ["Matin", "Soir", "Repas", "Hygiene", "Rangement", "Pause"],
  leisure: ["Ecrans", "Lecture", "Jeux", "Creatif", "Dehors", "Detente"],
};

export function getSubkindSuggestionsForCategoryCode(code: CategoryCode | null | undefined): string[] {
  if (!code) {
    return [];
  }

  return CATEGORY_SUBKIND_SUGGESTIONS_BY_CODE[code] ? [...CATEGORY_SUBKIND_SUGGESTIONS_BY_CODE[code]] : [];
}

export function normalizeSubkindInput(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getPlanActionableKindLabel(kind: PlanActionableKind): string {
  return PLAN_ACTIONABLE_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Mission";
}
