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

function TagsIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 9.5V5.5h4l9.5 9.5-4 4L4 9.5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="8" cy="8" r="1" fill={active ? "rgb(var(--color-text-inverse))" : "currentColor"} />
    </svg>
  );
}

function NotebookIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 7.5h6M9 10.5h6M9 13.5h4.5" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function ChecklistIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.3 11.6 1.8 1.8 4.1-4.1M8.3 15.1h7.2" fill="none" stroke={active ? "rgb(var(--color-text-inverse))" : "currentColor"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
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

function BadgeIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="10" r="5.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 15.5 7 20l5-2.7L17 20l-1.5-4.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function RewardIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V11H4V8.5Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 11v2.5A3.5 3.5 0 0 0 9 17h6a3.5 3.5 0 0 0 3.5-3.5V11M12 6v11" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChartIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4.5 19.5h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <rect x="6.5" y="11" width="2.8" height="6.5" rx="1" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="10.9" y="8" width="2.8" height="9.5" rx="1" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <rect x="15.3" y="5" width="2.8" height="12.5" rx="1" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CinemaIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="m10 9 5 3-5 3Z" fill={active ? "rgb(var(--color-text-inverse))" : "currentColor"} />
    </svg>
  );
}

function HeartIcon({ className, active = false }: ParentNavIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 20.2 5.4 13.8a4.5 4.5 0 0 1 6.4-6.4L12 8l.2-.6a4.5 4.5 0 0 1 6.4 6.4L12 20.2Z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
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
    id: "dashboard",
    label: "Tableau de bord",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: DashboardIcon, href: "/parent/dashboard" },
      { id: "notifications", label: "Notifications", icon: BellIcon, href: "/parent/notifications", badgeKey: "notifications" },
      { id: "alarms", label: "Alarmes", icon: AlarmIcon, href: "/parent/alarms", badgeKey: "alarms" },
    ],
  },
  {
    id: "organization",
    label: "Organisation",
    items: [
      { id: "day-templates", label: "Journées types", icon: TemplateIcon, href: "/parent/day-templates" },
      { id: "categories", label: "Catégories", icon: TagsIcon, href: "/parent/categories" },
      { id: "school-diary", label: "Carnet scolaire", icon: NotebookIcon, href: "/parent/school-diary", badgeKey: "schoolDiary" },
      { id: "checklists", label: "Checklists", icon: ChecklistIcon, href: "/parent/checklists", badgeKey: "checklists" },
      { id: "meals", label: "Repas", icon: MealIcon, href: "/parent/meals" },
      { id: "knowledge", label: "Connaissances", icon: KnowledgeIcon, href: "/parent/knowledge" },
    ],
  },
  {
    id: "family-motivation",
    label: "Vie familiale & Motivation",
    items: [
      { id: "achievements", label: "Succès & badges", icon: BadgeIcon, href: "/parent/achievements" },
      { id: "rewards", label: "Récompenses", icon: RewardIcon, href: "/parent/rewards" },
      { id: "gamification", label: "Gamification", icon: ChartIcon, href: "/parent/gamification" },
      { id: "cinema", label: "Cinéma", icon: CinemaIcon, href: "/parent/cinema" },
      { id: "emotions", label: "Émotions", icon: HeartIcon, href: "/parent/dashboard#emotions", matchPrefixes: ["/parent/dashboard"] },
    ],
  },
];

export const parentNavFooterItems: ParentNavItem[] = [
  { id: "settings", label: "Paramètres", icon: SettingsIcon, href: "/parent/settings" },
];
