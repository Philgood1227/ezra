export interface ParentModuleTab {
  id: string;
  label: string;
  href: string;
  matchPrefixes?: string[];
}

export interface ParentModuleGroup {
  id: string;
  label: string;
  prefixes: string[];
  tabs: ParentModuleTab[];
}

function normalizeHref(href: string): string {
  const hashIndex = href.indexOf("#");
  return hashIndex >= 0 ? href.slice(0, hashIndex) : href;
}

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export const parentModuleGroups: ParentModuleGroup[] = [
  {
    id: "essential",
    label: "Essentiel",
    prefixes: ["/parent/dashboard", "/parent/notifications", "/parent/alarms"],
    tabs: [
      { id: "dashboard", label: "Tableau de bord", href: "/parent/dashboard" },
      { id: "notifications", label: "Notifications", href: "/parent/notifications" },
      { id: "alarms", label: "Alarmes", href: "/parent/alarms" },
    ],
  },
  {
    id: "organization",
    label: "Organisation",
    prefixes: [
      "/parent/organization",
      "/parent/day-templates",
      "/parent/weekly-tasks",
      "/parent/school-diary",
      "/parent/checklists",
      "/parent/categories",
    ],
    tabs: [
      { id: "organization", label: "Modules organisation", href: "/parent/organization" },
      { id: "day-templates", label: "Journees types", href: "/parent/day-templates" },
      { id: "weekly-tasks", label: "Taches hebdo", href: "/parent/weekly-tasks" },
      { id: "school-diary", label: "Carnet scolaire", href: "/parent/school-diary" },
      { id: "checklists", label: "Checklists", href: "/parent/checklists" },
      { id: "categories", label: "Categories", href: "/parent/categories" },
    ],
  },
  {
    id: "learning",
    label: "Apprentissages",
    prefixes: ["/parent/learning", "/parent/revisions", "/parent/resources/books", "/parent/knowledge"],
    tabs: [
      {
        id: "learning-hub",
        label: "Modules apprentissages",
        href: "/parent/learning",
        matchPrefixes: ["/parent/learning"],
      },
      {
        id: "revisions-library",
        label: "Bibliotheque",
        href: "/parent/revisions",
        matchPrefixes: ["/parent/revisions", "/parent/revisions/new"],
      },
      {
        id: "revisions-generate",
        label: "Generer (IA)",
        href: "/parent/revisions/generate",
        matchPrefixes: ["/parent/revisions/generate"],
      },
      {
        id: "books-resources",
        label: "Livres & fiches",
        href: "/parent/resources/books",
      },
      {
        id: "knowledge",
        label: "Connaissances",
        href: "/parent/knowledge",
      },
    ],
  },
  {
    id: "family",
    label: "Vie familiale",
    prefixes: [
      "/parent/family",
      "/parent/meals",
      "/parent/achievements",
      "/parent/rewards",
      "/parent/gamification",
      "/parent/cinema",
    ],
    tabs: [
      { id: "family", label: "Modules famille", href: "/parent/family" },
      { id: "meals", label: "Repas", href: "/parent/meals" },
      { id: "achievements", label: "Succes", href: "/parent/achievements" },
      { id: "rewards", label: "Recompenses", href: "/parent/rewards" },
    ],
  },
];

export function getParentModuleGroup(pathname: string): ParentModuleGroup | null {
  for (const group of parentModuleGroups) {
    if (group.prefixes.some((prefix) => matchesPathPrefix(pathname, prefix))) {
      return group;
    }
  }

  return null;
}

export function isParentModuleTabActive(pathname: string, tab: ParentModuleTab): boolean {
  if (tab.matchPrefixes?.some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return true;
  }

  const normalized = normalizeHref(tab.href);
  return matchesPathPrefix(pathname, normalized);
}
