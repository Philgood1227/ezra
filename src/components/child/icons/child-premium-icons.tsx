import { cn } from "@/lib/utils";
import { parseCategoryColorKey } from "@/lib/day-templates/constants";
import type { CategoryColorKey } from "@/lib/day-templates/types";

export interface ChildIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

type ActivityVisual = {
  borderClass: string;
  softClass: string;
  iconToneClass: string;
  haloClass: string;
};

const ACTIVITY_VISUALS: Record<CategoryColorKey, ActivityVisual> = {
  "category-routine": {
    borderClass: "border-category-routine/45",
    softClass: "bg-category-routine/16",
    iconToneClass: "text-category-routine",
    haloClass: "bg-category-routine/20",
  },
  "category-ecole": {
    borderClass: "border-category-ecole/45",
    softClass: "bg-category-ecole/16",
    iconToneClass: "text-category-ecole",
    haloClass: "bg-category-ecole/20",
  },
  "category-repas": {
    borderClass: "border-category-repas/45",
    softClass: "bg-category-repas/16",
    iconToneClass: "text-category-repas",
    haloClass: "bg-category-repas/20",
  },
  "category-sport": {
    borderClass: "border-category-sport/45",
    softClass: "bg-category-sport/16",
    iconToneClass: "text-category-sport",
    haloClass: "bg-category-sport/20",
  },
  "category-loisir": {
    borderClass: "border-category-loisir/45",
    softClass: "bg-category-loisir/16",
    iconToneClass: "text-category-loisir",
    haloClass: "bg-category-loisir/20",
  },
  "category-calme": {
    borderClass: "border-category-calme/45",
    softClass: "bg-category-calme/16",
    iconToneClass: "text-category-calme",
    haloClass: "bg-category-calme/20",
  },
  "category-sommeil": {
    borderClass: "border-category-sommeil/45",
    softClass: "bg-category-sommeil/16",
    iconToneClass: "text-category-sommeil",
    haloClass: "bg-category-sommeil/20",
  },
};

const DEFAULT_ACTIVITY_VISUAL: ActivityVisual = {
  borderClass: "border-brand-primary/40",
  softClass: "bg-brand-primary/12",
  iconToneClass: "text-brand-primary",
  haloClass: "bg-brand-primary/20",
};

function IconFrame({ children, className, ...props }: ChildIconProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SchoolIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="m3.8 9.2 8.2-4.2 8.2 4.2-8.2 4.2-8.2-4.2Z" />
      <path d="M6.4 10.7v4.4a7.8 7.8 0 0 0 11.2 0v-4.4" />
      <path d="M20.2 10v3.6" />
    </IconFrame>
  );
}

export function SportIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M12 3.8v16.4M3.8 12h16.4M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" strokeWidth="1.3" />
    </IconFrame>
  );
}

export function RoutineIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M12 4.6v3.2M12 16.2v3.2M4.6 12h3.2M16.2 12h3.2" />
      <circle cx="12" cy="12" r="4.2" />
    </IconFrame>
  );
}

export function MealIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M7 4v7M9 4v7M11 4v7M9 11v9" />
      <path d="M15 4c0 3 2 4.5 2 7v9" />
    </IconFrame>
  );
}

export function LeisureIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="m12 4.2 2.1 4.2 4.6.7-3.3 3.2.8 4.6-4.2-2.2-4.2 2.2.8-4.6-3.3-3.2 4.6-.7L12 4.2Z" />
    </IconFrame>
  );
}

export function CalmIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M7 14.3c5.4 0 8.9-3.6 9.9-8.3 1.5 6.5-1.7 12.7-8.9 13.7-2.9.4-5-1.2-5-4V13.2" />
    </IconFrame>
  );
}

export function SleepIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M15.9 4.9A7.8 7.8 0 1 0 19.6 18a7.8 7.8 0 0 1-3.7-13.1Z" />
    </IconFrame>
  );
}

export function HomeIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M3.8 10.2 12 4l8.2 6.2" />
      <path d="M6.7 9.8V20h10.6V9.8" />
      <path d="M10 20v-5h4v5" />
    </IconFrame>
  );
}

export function DayPlannerIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <rect x="4.3" y="5.1" width="15.4" height="14.9" rx="3.1" />
      <path d="M8 9.8h8M8 13h8M8 16.2h5M8 5.2V8M16 5.2V8" />
    </IconFrame>
  );
}

export function ChecklistIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="m8.5 12 2.2 2.4 4.8-4.8" />
    </IconFrame>
  );
}

export function KnowledgeIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H12v15H7.5A2.5 2.5 0 0 1 5 16.5v-10Z" />
      <path d="M19 6.5A2.5 2.5 0 0 0 16.5 4H12v15h4.5a2.5 2.5 0 0 0 2.5-2.5v-10Z" />
      <path d="M12 6.5v10.5" strokeWidth="1.6" />
    </IconFrame>
  );
}

export function TrophyIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a2 2 0 0 0 2 3h1M16 6h3a2 2 0 0 1-2 3h-1" />
      <path d="M10 14h4M9 18h6" />
    </IconFrame>
  );
}

export function CinemaIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <rect x="4" y="6" width="16" height="12" rx="2.6" />
      <path d="m10 9.5 5 2.5-5 2.5V9.5Z" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function EmotionsIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M12 19.5 5.5 13a4.1 4.1 0 0 1 0-5.8 4.1 4.1 0 0 1 5.8 0L12 8l.7-.8a4.1 4.1 0 0 1 5.8 0 4.1 4.1 0 0 1 0 5.8L12 19.5Z" />
    </IconFrame>
  );
}

export function StarIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="m12 4.2 2.1 4.2 4.6.7-3.3 3.2.8 4.6-4.2-2.2-4.2 2.2.8-4.6-3.3-3.2 4.6-.7L12 4.2Z" />
    </IconFrame>
  );
}

export function LockIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <rect x="5.5" y="10.2" width="13" height="9.5" rx="2.2" />
      <path d="M8.5 10.2V8.3a3.5 3.5 0 1 1 7 0v1.9" />
      <circle cx="12" cy="14.9" r="1.2" />
    </IconFrame>
  );
}

export function ArrowRightIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M7 12h10m0 0-4-4m4 4-4 4" />
    </IconFrame>
  );
}

export function ClockIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M12 8v4.5l3 1.7" />
    </IconFrame>
  );
}

export function SparkIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M12 4.8v3.2M12 16v3.2M4.8 12H8M16 12h3.2M6.9 6.9l1.9 1.9M15.2 15.2l1.9 1.9M17.1 6.9l-1.9 1.9M8.8 15.2l-1.9 1.9" />
    </IconFrame>
  );
}

export function SwimIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <circle cx="9" cy="7.5" r="2" />
      <path d="M6.8 10.6 12 9.9l2.7 2.2M3.8 15c1.1.9 2.1 1.3 3.2 1.3s2.1-.4 3.2-1.3c1.1.9 2.1 1.3 3.2 1.3s2.1-.4 3.2-1.3c1.1.9 2.1 1.3 3.2 1.3" />
    </IconFrame>
  );
}

export function TreeIcon(props: ChildIconProps): React.JSX.Element {
  return (
    <IconFrame {...props}>
      <path d="M12 4.2c2.9 0 5.2 2.2 5.2 5.1 0 .4 0 .8-.1 1.1h1.2c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5H5.7a2.5 2.5 0 0 1 0-5h1.2c0-.3-.1-.7-.1-1.1 0-2.9 2.3-5.1 5.2-5.1Z" />
      <path d="M12 15.4V20" />
    </IconFrame>
  );
}

export function getActivityVisual(colorKey: string | null | undefined): ActivityVisual {
  return ACTIVITY_VISUALS[parseCategoryColorKey(colorKey)] ?? DEFAULT_ACTIVITY_VISUAL;
}
