import type { ComponentType, SVGProps } from "react";
import {
  CalmIcon,
  ChecklistIcon,
  DayPlannerIcon,
  EmotionsIcon,
  KnowledgeIcon,
  LeisureIcon,
  MealIcon,
  RoutineIcon,
  SchoolIcon,
  SleepIcon,
  SparkIcon,
  SportIcon,
  StarIcon,
} from "@/components/child/icons/child-premium-icons";
import { CATEGORY_ICON_KEYS as DOMAIN_CATEGORY_ICON_KEYS, parseCategoryIconKey } from "@/lib/day-templates/constants";
import type { CategoryIconKey } from "@/lib/day-templates/types";

export type CategoryIconComponent = ComponentType<{ className?: string }>;

const CATEGORY_ICON_COMPONENTS: Record<CategoryIconKey, CategoryIconComponent> = {
  default: RoutineIcon,
  school: SchoolIcon,
  activity: SportIcon,
  routine: RoutineIcon,
  leisure: LeisureIcon,
  social: EmotionsIcon,
  health: SparkIcon,
  homework: SchoolIcon,
  meal: MealIcon,
  sport: SportIcon,
  calm: CalmIcon,
  sleep: SleepIcon,
  transport: DayPlannerIcon,
  hygiene: SparkIcon,
  knowledge: KnowledgeIcon,
  checklist: ChecklistIcon,
  star: StarIcon,
};

export const CATEGORY_ICON_KEYS = DOMAIN_CATEGORY_ICON_KEYS;
export const DEFAULT_CATEGORY_ICON_KEY: CategoryIconKey = "default";

const DEFAULT_CATEGORY_ICON_COMPONENT: CategoryIconComponent =
  CATEGORY_ICON_COMPONENTS[DEFAULT_CATEGORY_ICON_KEY] ?? RoutineIcon;

export function resolveCategoryIcon(iconKey: CategoryIconKey | string | null | undefined): CategoryIconComponent {
  const normalizedKey = parseCategoryIconKey(iconKey);
  return CATEGORY_ICON_COMPONENTS[normalizedKey] ?? DEFAULT_CATEGORY_ICON_COMPONENT;
}

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  iconKey: CategoryIconKey | string | null | undefined;
}

export function CategoryIcon({
  iconKey,
  className,
  ...props
}: CategoryIconProps): React.JSX.Element {
  const Icon = resolveCategoryIcon(iconKey) as ComponentType<SVGProps<SVGSVGElement>>;
  return <Icon className={className} {...props} />;
}
