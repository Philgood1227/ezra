import type {
  CategoryColorKey,
  CategoryIconKey,
  ChildTimeBlockId,
  TaskInstanceStatus,
} from "@/lib/day-templates/types";
import type { MissionCategory } from "./mission-category";

export type MissionStatus = "todo" | "in_progress" | "done";
export type MissionDrawerView = "mission" | "all";

export interface MissionHelpLink {
  id: string;
  label: string;
  href: string;
}

export interface MissionMicroStep {
  id: string;
  label: string;
  done: boolean;
}

export interface MissionUI {
  id: string;
  title: string;
  iconKey: CategoryIconKey;
  colorKey: CategoryColorKey;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
  points: number;
  status: MissionStatus;
  sourceStatus: TaskInstanceStatus;
  instructionsHtml: string;
  helpLinks: MissionHelpLink[];
  recommendedBlockId: ChildTimeBlockId;
  recommendedBlockLabel: string;
  itemSubkind: string | null;
  categoryName: string | null;
  missionCategory?: MissionCategory;
  microSteps: MissionMicroStep[];
}

export const MISSION_TIMER_PRESETS = [10, 15, 20, 25] as const;
