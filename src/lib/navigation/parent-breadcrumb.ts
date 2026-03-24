export interface ParentBreadcrumbItem {
  label: string;
  href?: string;
}

const UUID_SEGMENT_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeSegment(segment: string): string {
  return decodeURIComponent(segment).replace(/-/g, " ");
}

function getDayTemplateDetailLabel(pathname: string): string {
  const trailing = pathname.replace("/parent/day-templates/", "").trim();

  if (!trailing) {
    return "Detail";
  }

  if (trailing === "new") {
    return "Nouvelle journee type";
  }

  if (UUID_SEGMENT_REGEX.test(trailing)) {
    return "Edition de la journee type";
  }

  return `Journee ${decodeSegment(trailing)}`;
}

function getWeeklyTaskDetailLabel(pathname: string): string {
  const trailing = pathname.replace("/parent/weekly-tasks/", "").trim();

  if (!trailing) {
    return "Edition des taches";
  }

  if (UUID_SEGMENT_REGEX.test(trailing)) {
    return "Edition des taches";
  }

  return `Taches ${decodeSegment(trailing)}`;
}

function getRevisionDetailLabel(pathname: string): string {
  const trailing = pathname.replace("/parent/revisions/", "").trim();

  if (!trailing) {
    return "Détail fiche";
  }

  if (trailing === "new") {
    return "Nouvelle fiche";
  }

  if (trailing === "generate") {
    return "Générer (IA)";
  }

  if (trailing.endsWith("/edit")) {
    return "Édition fiche";
  }

  if (UUID_SEGMENT_REGEX.test(trailing)) {
    return "Détail fiche";
  }

  return `Fiche ${decodeSegment(trailing)}`;
}

export function getParentBreadcrumb(pathname: string): ParentBreadcrumbItem[] {
  if (pathname === "/parent/dashboard") {
    return [{ label: "Tableau de bord" }];
  }

  if (pathname === "/parent/notifications") {
    return [{ label: "Tableau de bord", href: "/parent/dashboard" }, { label: "Notifications" }];
  }

  if (pathname === "/parent/alarms") {
    return [{ label: "Tableau de bord", href: "/parent/dashboard" }, { label: "Alarmes" }];
  }

  if (pathname === "/parent/day-templates") {
    return [{ label: "Organisation" }, { label: "Journees types" }];
  }

  if (pathname === "/parent/fiches") {
    return [{ label: "Fiches" }];
  }

  if (pathname === "/parent/weekly-tasks") {
    return [{ label: "Organisation" }, { label: "Taches hebdo" }];
  }

  if (pathname === "/parent/organization") {
    return [{ label: "Organisation" }, { label: "Modules organisation" }];
  }

  if (pathname.startsWith("/parent/day-templates/")) {
    return [
      { label: "Organisation", href: "/parent/day-templates" },
      { label: "Journees types", href: "/parent/day-templates" },
      { label: getDayTemplateDetailLabel(pathname) },
    ];
  }

  if (pathname.startsWith("/parent/weekly-tasks/")) {
    return [
      { label: "Organisation", href: "/parent/weekly-tasks" },
      { label: "Taches hebdo", href: "/parent/weekly-tasks" },
      { label: getWeeklyTaskDetailLabel(pathname) },
    ];
  }

  if (pathname === "/parent/categories") {
    return [{ label: "Organisation" }, { label: "Categories" }];
  }

  if (pathname === "/parent/school-diary") {
    return [{ label: "Organisation" }, { label: "Carnet scolaire" }];
  }

  if (pathname === "/parent/checklists") {
    return [{ label: "Organisation" }, { label: "Checklists" }];
  }

  if (pathname === "/parent/meals") {
    return [{ label: "Vie quotidienne" }, { label: "Repas" }];
  }

  if (pathname === "/parent/knowledge") {
    return [{ label: "Apprentissages" }, { label: "Connaissances" }];
  }

  if (pathname === "/parent/learning") {
    return [{ label: "Apprentissages" }, { label: "Modules apprentissages" }];
  }

  if (pathname === "/parent/revisions") {
    return [{ label: "Apprentissages" }, { label: "Bibliothèque" }];
  }

  if (pathname === "/parent/revisions/new") {
    return [
      { label: "Apprentissages", href: "/parent/learning" },
      { label: "Bibliothèque", href: "/parent/revisions" },
      { label: "Nouvelle fiche" },
    ];
  }

  if (pathname === "/parent/revisions/generate") {
    return [
      { label: "Apprentissages", href: "/parent/learning" },
      { label: "Générer (IA)" },
    ];
  }

  if (pathname.startsWith("/parent/revisions/")) {
    return [
      { label: "Apprentissages", href: "/parent/learning" },
      { label: "Bibliothèque", href: "/parent/revisions" },
      { label: getRevisionDetailLabel(pathname) },
    ];
  }

  if (pathname === "/parent/resources/books") {
    return [{ label: "Apprentissages" }, { label: "Livres & fiches" }];
  }

  if (pathname.startsWith("/parent/knowledge/")) {
    const trailing = pathname.replace("/parent/knowledge/", "");
    const detailLabel = trailing ? `Matiere ${decodeSegment(trailing)}` : "Detail";
    return [
      { label: "Apprentissages", href: "/parent/knowledge" },
      { label: "Connaissances", href: "/parent/knowledge" },
      { label: detailLabel },
    ];
  }

  if (pathname === "/parent/achievements") {
    return [{ label: "Vie familiale & motivation" }, { label: "Succes & badges" }];
  }

  if (pathname === "/parent/family") {
    return [{ label: "Vie familiale & motivation" }, { label: "Modules famille" }];
  }

  if (pathname === "/parent/rewards") {
    return [{ label: "Vie familiale & motivation" }, { label: "Recompenses" }];
  }

  if (pathname === "/parent/gamification") {
    return [{ label: "Vie familiale & motivation" }, { label: "Gamification" }];
  }

  if (pathname === "/parent/cinema") {
    return [{ label: "Vie familiale & motivation" }, { label: "Cinema" }];
  }

  if (pathname === "/parent/settings") {
    return [{ label: "Parametres" }];
  }

  if (pathname.startsWith("/parent")) {
    return [{ label: "Parent" }];
  }

  return [{ label: "Ezra" }];
}

export function getParentPageTitle(pathname: string): string {
  const breadcrumb = getParentBreadcrumb(pathname);
  return breadcrumb[breadcrumb.length - 1]?.label ?? "Parent";
}
