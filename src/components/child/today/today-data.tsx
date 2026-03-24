import * as React from "react";
import {
  HomeIcon,
  MealIcon,
  SchoolIcon,
  SleepIcon,
  SportIcon,
} from "@/components/child/icons/child-premium-icons";
import type {
  RewardsSummary,
  TimeBlock,
  TimeBlockActivity,
  TimeBlockId,
} from "@/components/child/today/types";
import type { ChildHomeData, ChildHomeTaskSummary } from "@/lib/api/child-home";
import { resolveCategoryCode } from "@/lib/day-templates/constants";
import type { DayTemplateBlockSummary } from "@/lib/day-templates/types";
import { timeToMinutes } from "@/lib/day-templates/time";
import {
  getChildTimeBlockForTimeRange,
  getCurrentDaySegmentId,
  getDaySegmentDefinitions,
  getDaySegmentState,
  resolveChildTimeBlockForDay,
} from "@/lib/time/day-segments";

interface BuildTodayViewModelInput {
  date: Date;
  data: ChildHomeData;
}

export interface TodayViewModel {
  currentSegmentId: TimeBlockId;
  segments: Array<{
    id: TimeBlockId;
    label: string;
  }>;
  timeBlocks: TimeBlock[];
  rewards: RewardsSummary;
}

interface TimeBlockActivityDraft extends TimeBlockActivity {
  startMinutes: number;
  sourcePriority: number;
}

type HighlightCandidate = {
  id: string;
  label: string;
  type: "activity" | "leisure";
  startTime: string;
};

function getTimeBlockIcon(blockId: TimeBlockId): React.ReactNode {
  if (blockId === "morning") {
    return <SchoolIcon className="size-4" />;
  }
  if (blockId === "noon") {
    return <MealIcon className="size-4" />;
  }
  if (blockId === "afternoon") {
    return <SportIcon className="size-4" />;
  }
  if (blockId === "home") {
    return <HomeIcon className="size-4" />;
  }
  return <SleepIcon className="size-4" />;
}

function getBlockFallbackLabel(block: DayTemplateBlockSummary): string {
  if (block.blockType === "school") {
    return "Ecole";
  }
  if (block.blockType === "home") {
    return "Maison";
  }
  if (block.blockType === "transport") {
    return "Trajet";
  }
  if (block.blockType === "club") {
    return "Club";
  }
  if (block.blockType === "daycare") {
    return "Garderie";
  }
  if (block.blockType === "free_time") {
    return "Temps libre";
  }

  return "Plage";
}

function getDurationMinutes(startTime: string, endTime: string): number | undefined {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) {
    return undefined;
  }

  return end - start;
}

function getTaskActivityType(task: ChildHomeTaskSummary): TimeBlockActivity["type"] {
  if ((task.itemKind ?? "mission") === "mission") {
    return "homework";
  }

  if (task.itemKind === "leisure") {
    return "fun";
  }

  return "activity";
}

function getTaskBlockId(task: ChildHomeTaskSummary, segmentIds: TimeBlockId[]): TimeBlockId {
  const resolved = task.recommendedChildTimeBlockId ?? getChildTimeBlockForTimeRange(task.startTime, task.endTime);
  return resolveChildTimeBlockForDay(resolved, segmentIds);
}

function getBlockBlockId(block: DayTemplateBlockSummary, segmentIds: TimeBlockId[]): TimeBlockId {
  const resolved = block.childTimeBlockId ?? getChildTimeBlockForTimeRange(block.startTime, block.endTime);
  return resolveChildTimeBlockForDay(resolved, segmentIds);
}

function pushActivity(
  map: Map<TimeBlockId, TimeBlockActivityDraft[]>,
  blockId: TimeBlockId,
  activity: TimeBlockActivityDraft,
): void {
  const current = map.get(blockId) ?? [];
  current.push(activity);
  map.set(blockId, current);
}

function sortAndStripActivityDrafts(
  drafts: Map<TimeBlockId, TimeBlockActivityDraft[]>,
  orderedSegmentIds: TimeBlockId[],
): Map<TimeBlockId, TimeBlockActivity[]> {
  const result = new Map<TimeBlockId, TimeBlockActivity[]>();

  for (const segmentId of orderedSegmentIds) {
    const entries = drafts.get(segmentId) ?? [];
    entries.sort((left, right) => {
      if (left.startMinutes !== right.startMinutes) {
        return left.startMinutes - right.startMinutes;
      }
      return left.sourcePriority - right.sourcePriority;
    });

    result.set(
      segmentId,
      entries.map((entry) => {
        const activity: TimeBlockActivity = {
          id: entry.id,
          label: entry.label,
          type: entry.type,
        };

        if (typeof entry.durationMinutes === "number") {
          activity.durationMinutes = entry.durationMinutes;
        }

        if (entry.note) {
          activity.note = entry.note;
        }

        return activity;
      }),
    );
  }

  return result;
}

export function buildTimeBlocksForToday(input: {
  date: Date;
  dayBlocks: DayTemplateBlockSummary[];
  todayTasks: ChildHomeTaskSummary[];
}): {
  currentSegmentId: TimeBlockId;
  segments: Array<{ id: TimeBlockId; label: string }>;
  blocks: TimeBlock[];
} {
  const segmentDefinitions = getDaySegmentDefinitions(input.date);
  const orderedSegmentIds = segmentDefinitions.map((segment) => segment.id);
  const currentSegmentId = getCurrentDaySegmentId(input.date);
  const activitiesBySegment = new Map<TimeBlockId, TimeBlockActivityDraft[]>();

  for (const segment of segmentDefinitions) {
    activitiesBySegment.set(segment.id, []);
  }

  for (const block of input.dayBlocks) {
    const blockId = getBlockBlockId(block, orderedSegmentIds);
    const label = block.label?.trim() ? block.label.trim() : getBlockFallbackLabel(block);
    const blockDurationMinutes = getDurationMinutes(block.startTime, block.endTime);
    const blockActivity: TimeBlockActivityDraft = {
      id: `template-block-${block.id}`,
      label,
      type: block.blockType === "school" ? "school" : "activity",
      note: `${block.startTime} - ${block.endTime}`,
      startMinutes: timeToMinutes(block.startTime),
      sourcePriority: 0,
    };

    if (typeof blockDurationMinutes === "number") {
      blockActivity.durationMinutes = blockDurationMinutes;
    }

    pushActivity(activitiesBySegment, blockId, blockActivity);
  }

  for (const task of input.todayTasks) {
    const blockId = getTaskBlockId(task, orderedSegmentIds);
    const taskDurationMinutes = getDurationMinutes(task.startTime, task.endTime);
    const taskActivity: TimeBlockActivityDraft = {
      id: task.id ?? `task-${task.title}-${task.startTime}-${task.endTime}`,
      label: task.title,
      type: getTaskActivityType(task),
      note: task.description?.trim() ? task.description.trim() : `${task.startTime} - ${task.endTime}`,
      startMinutes: timeToMinutes(task.startTime),
      sourcePriority: 1,
    };

    if (typeof taskDurationMinutes === "number") {
      taskActivity.durationMinutes = taskDurationMinutes;
    }

    pushActivity(activitiesBySegment, blockId, taskActivity);
  }

  const sortedActivities = sortAndStripActivityDrafts(activitiesBySegment, orderedSegmentIds);
  const blocks: TimeBlock[] = segmentDefinitions.map((segment) => ({
    id: segment.id,
    label: segment.label,
    icon: getTimeBlockIcon(segment.id),
    state: getDaySegmentState(orderedSegmentIds, segment.id, currentSegmentId),
    activities: sortedActivities.get(segment.id) ?? [],
  }));

  return {
    currentSegmentId,
    segments: segmentDefinitions.map((segment) => ({
      id: segment.id,
      label: segment.label,
    })),
    blocks,
  };
}

function buildRewards(input: {
  tasks: ChildHomeTaskSummary[];
}): RewardsSummary {
  const candidates: HighlightCandidate[] = input.tasks
    .map((task) => {
      const categoryCode = resolveCategoryCode({
        name: task.categoryName ?? null,
        iconKey: task.iconKey,
        colorKey: task.colorKey,
      });

      const resolvedType: "activity" | "leisure" | null =
        task.itemKind === "activity"
          ? "activity"
          : task.itemKind === "leisure"
            ? "leisure"
            : categoryCode === "activity"
              ? "activity"
              : categoryCode === "leisure"
                ? "leisure"
                : null;

      if (!resolvedType) {
        return null;
      }

      return {
        id: task.id ?? `highlight-${task.title}-${task.startTime}`,
        label: task.title,
        type: resolvedType,
        startTime: task.startTime,
      };
    })
    .filter((entry): entry is HighlightCandidate => entry !== null)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  let selectedCandidates = candidates.slice(0, 3);

  const firstActivity = candidates.find((entry) => entry.type === "activity");
  const firstLeisure = candidates.find((entry) => entry.type === "leisure");
  const hasBothTypes = Boolean(firstActivity && firstLeisure);
  if (candidates.length > 3 && hasBothTypes && firstActivity && firstLeisure) {
    const selected = [firstActivity, firstLeisure];
    const third = candidates.find((entry) => !selected.some((picked) => picked.id === entry.id));
    if (third) {
      selected.push(third);
    }
    selectedCandidates = selected.slice(0, 3);
  }

  const highlights = selectedCandidates.map((entry) => ({
    id: entry.id,
    label: entry.label,
    type: entry.type,
  }));

  return {
    highlights,
    emptyMessage: "C'est du fun aujourd'hui",
  };
}

export function buildTodayViewModel({
  date,
  data,
}: BuildTodayViewModelInput): TodayViewModel {
  const timeline = buildTimeBlocksForToday({
    date,
    dayBlocks: data.dayBlocks,
    todayTasks: data.todayTasks,
  });

  return {
    currentSegmentId: timeline.currentSegmentId,
    segments: timeline.segments,
    timeBlocks: timeline.blocks,
    rewards: buildRewards({
      tasks: data.todayTasks,
    }),
  };
}
