import { cn } from "@/lib/utils";

interface HomeIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

type HomeTaskCategoryKey =
  | "category-routine"
  | "category-ecole"
  | "category-repas"
  | "category-sport"
  | "category-loisir"
  | "category-calme"
  | "category-sommeil";

type HomeTaskIconComponent = (props: HomeIconProps) => React.JSX.Element;

function RoutineTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <path
        d="M9.5 4h5v3h3v5h-3v3h-5v-3h-3V7h3V4Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SchoolTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <path
        d="M5 7.2 12 4l7 3.2-7 3.2L5 7.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M8.2 9.2V14a7 7 0 0 0 7.6 0V9.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M19 8.2v4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function MealTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <path d="M7 4v7M9 4v7M11 4v7M9 11v9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M15 4c0 3 2 4.5 2 7v9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SportTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.9v16.2M3.9 12h16.2M6.2 6.2l11.6 11.6M17.8 6.2 6.2 17.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function LeisureTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <path
        d="m12 4 1.7 3.7 4 .5-3 2.9.8 4-3.5-2-3.5 2 .8-4-3-2.9 4-.5L12 4Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalmTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <path
        d="M7 14c5.5 0 9-3.7 10-8.5 1.5 6.6-1.8 13-9 14-3 .4-5-1.2-5-4.2V13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SleepTaskIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <path
        d="M15.6 4.7a7.8 7.8 0 1 0 3.7 13 7.8 7.8 0 0 1-3.7-13Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function WorkToolsResourceIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.8v4.7l3 1.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function KnowledgeResourceIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden="true" {...props}>
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4H12v15H7.5A2.5 2.5 0 0 1 5 16.5v-10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 6.5A2.5 2.5 0 0 0 16.5 4H12v15h4.5a2.5 2.5 0 0 0 2.5-2.5v-10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 6.5v10.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function HeroDayVisualIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-10", className)} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.2v2.2M12 18.6v2.2M4.5 12h2.2M17.3 12h2.2M6.9 6.9l1.5 1.5M15.6 15.6l1.5 1.5M17.1 6.9l-1.5 1.5M8.4 15.6l-1.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function NowCardClockIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 8v4.5l3 1.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
    </svg>
  );
}

function NowLineIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-hidden="true" {...props}>
      <path d="m8 6 10 6-10 6V6Z" className="fill-current" />
    </svg>
  );
}

function NextLineIcon({ className, ...props }: HomeIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} aria-hidden="true" {...props}>
      <path
        d="M7 12h10m0 0-4-4m4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const HOME_TASK_ICONS: Record<HomeTaskCategoryKey, HomeTaskIconComponent> = {
  "category-routine": RoutineTaskIcon,
  "category-ecole": SchoolTaskIcon,
  "category-repas": MealTaskIcon,
  "category-sport": SportTaskIcon,
  "category-loisir": LeisureTaskIcon,
  "category-calme": CalmTaskIcon,
  "category-sommeil": SleepTaskIcon,
};

function isHomeTaskCategoryKey(value: string): value is HomeTaskCategoryKey {
  return value in HOME_TASK_ICONS;
}

export function getHomeTaskIconByCategory(colorKey: string | null | undefined): HomeTaskIconComponent {
  if (colorKey && isHomeTaskCategoryKey(colorKey)) {
    return HOME_TASK_ICONS[colorKey];
  }

  return RoutineTaskIcon;
}

export {
  HeroDayVisualIcon,
  KnowledgeResourceIcon,
  NextLineIcon,
  NowCardClockIcon,
  NowLineIcon,
  WorkToolsResourceIcon,
};
