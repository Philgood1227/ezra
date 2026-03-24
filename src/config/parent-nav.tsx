import * as React from "react";

export interface ParentNavIconProps {
  className?: string;
  active?: boolean;
}

export type ParentNavBadgeKey = "notifications" | "schoolDiary" | "checklists" | "alarms";

export type ParentNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<ParentNavIconProps>;
  href?: string;
  badgeKey?: ParentNavBadgeKey;
  matchPrefixes?: string[];
  excludePrefixes?: string[];
  children?: ParentNavItem[];
};

export type ParentNavSection = {
  id: string;
  label: string;
  items: ParentNavItem[];
};

function DashboardIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3.5" width="7.5" height="5.5" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="11" width="7.5" height="9.5" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BellIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7.5 16.5h9a2 2 0 0 0 1.5-3.3c-.8-.9-1.1-2-1.1-3.2V9a4.9 4.9 0 1 0-9.8 0v1c0 1.2-.4 2.3-1.1 3.2a2 2 0 0 0 1.5 3.3Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 18.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function AlarmIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="13" r="6.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10v3.2l2 1.6" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeWidth="1.7" />
      <path d="m5.2 4.6 2 1.9M18.8 4.6l-2 1.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function TemplateIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 12h8M8 15h6" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}


function MealIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6.5 4.5v6M8.5 4.5v6M10.5 4.5v6M8.5 10.5v9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M15.5 4.5v15M15.5 4.5c2.2 0 4 1.8 4 4v2.2h-4" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function KnowledgeIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5.5 5.5A2.5 2.5 0 0 1 8 3h4v18H8a2.5 2.5 0 0 1-2.5-2.5v-13Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M18.5 5.5A2.5 2.5 0 0 0 16 3h-4v18h4a2.5 2.5 0 0 0 2.5-2.5v-13Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LibraryIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5.5 5.5A2.5 2.5 0 0 1 8 3h4v18H8a2.5 2.5 0 0 1-2.5-2.5v-13Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M18.5 5.5A2.5 2.5 0 0 0 16 3h-4v18h4a2.5 2.5 0 0 0 2.5-2.5v-13Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8.5h2.5M9 11h2.5M14.5 8.5H17M14.5 11H17" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function GenerateIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 4.5 13.8 9l4.7 1.2-3.4 3 .5 4.8L12 15.7 7.4 18l.5-4.8-3.4-3L9.2 9 12 4.5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m17.8 4.8.6 1.5 1.6.4-1.2 1 .2 1.6-1.2-.8-1.5.8.2-1.6-1.2-1 1.6-.4.9-1.5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.3" />
    </svg>
  );
}

function FichesIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 4.5h12a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 9h7M8.5 12h7M8.5 15h5" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function ResourcesIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h2.5v16H7a2.5 2.5 0 0 1-2.5-2.5v-11Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 4h4.5v16H9.5M14 4h3a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 17 20h-3" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 8h2M7.5 11h2M15 8h1.5M15 11h1.5" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function BadgeIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="10" r="5.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 15.5 7 20l5-2.7L17 20l-1.5-4.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SettingsIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.5 13.5v-3l-2-.5a6.9 6.9 0 0 0-.8-1.8l1.1-1.7-2.1-2.1-1.7 1.1c-.6-.3-1.2-.6-1.8-.8l-.5-2h-3l-.5 2c-.6.2-1.2.5-1.8.8L4.7 4.4 2.6 6.5l1.1 1.7c-.3.6-.6 1.2-.8 1.8l-2 .5v3l2 .5c.2.6.5 1.2.8 1.8l-1.1 1.7 2.1 2.1 1.7-1.1c.6.3 1.2.6 1.8.8l.5 2h3l.5-2c.6-.2 1.2-.5 1.8-.8l1.7 1.1 2.1-2.1-1.1-1.7c.3-.6.6-1.2.8-1.8l2-.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

export const parentNavSections: ParentNavSection[] = [
  {
    id: "overview",
    label: "Essentiel",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: DashboardIcon, href: "/parent/dashboard" },
      { id: "notifications", label: "Notifications", icon: BellIcon, href: "/parent/notifications", badgeKey: "notifications" },
      { id: "alarms", label: "Alarmes", icon: AlarmIcon, href: "/parent/alarms", badgeKey: "alarms" },
    ],
  },
  {
    id: "planning",
    label: "Organisation",
    items: [
      {
        id: "organization-hub",
        label: "Modules organisation",
        icon: TemplateIcon,
        href: "/parent/organization",
        badgeKey: "checklists",
        matchPrefixes: [
          "/parent/organization",
          "/parent/day-templates",
          "/parent/weekly-tasks",
          "/parent/school-diary",
          "/parent/checklists",
          "/parent/categories",
        ],
      },
    ],
  },
  {
    id: "fiches",
    label: "Fiches",
    items: [
      {
        id: "fiches-hub",
        label: "Fiches",
        icon: FichesIcon,
        href: "/parent/fiches",
        matchPrefixes: ["/parent/fiches"],
      },
    ],
  },
  {
    id: "learning",
    label: "Apprentissages",
    items: [
      {
        id: "learning-hub",
        label: "Modules apprentissages",
        icon: LibraryIcon,
        href: "/parent/learning",
        matchPrefixes: [
          "/parent/learning",
          "/parent/revisions",
          "/parent/resources/books",
          "/parent/knowledge",
        ],
        children: [
          {
            id: "revisions-library",
            label: "Bibliothèque",
            icon: LibraryIcon,
            href: "/parent/revisions",
            excludePrefixes: ["/parent/revisions/generate"],
          },
          {
            id: "revisions-books-resources",
            label: "Livres & fiches",
            icon: ResourcesIcon,
            href: "/parent/resources/books",
          },
          {
            id: "revisions-generate",
            label: "Générer (IA)",
            icon: GenerateIcon,
            href: "/parent/revisions/generate",
          },
          {
            id: "knowledge",
            label: "Connaissances",
            icon: KnowledgeIcon,
            href: "/parent/knowledge",
          },
        ],
      },
    ],
  },
  {
    id: "daily-life",
    label: "Vie quotidienne",
    items: [{ id: "meals", label: "Repas", icon: MealIcon, href: "/parent/meals" }],
  },
  {
    id: "motivation",
    label: "Vie familiale & motivation",
    items: [
      {
        id: "family-hub",
        label: "Modules famille",
        icon: BadgeIcon,
        href: "/parent/family",
        matchPrefixes: ["/parent/family", "/parent/achievements", "/parent/rewards", "/parent/gamification", "/parent/cinema"],
      },
    ],
  },
];

export const parentNavFooterItems: ParentNavItem[] = [
  { id: "settings", label: "Paramètres", icon: SettingsIcon, href: "/parent/settings" },
];


