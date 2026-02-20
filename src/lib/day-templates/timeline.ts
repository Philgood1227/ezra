import type { TaskInstanceStatus, TaskPhaseFlags } from "@/lib/day-templates/types";
import { timeToMinutes } from "@/lib/day-templates/time";

interface TimelineSortable {
  startTime: string;
  endTime: string;
  sortOrder: number;
}

interface TimelineStatusAware {
  status?: TaskInstanceStatus;
}

export function sortTemplateTasks<TTask extends TimelineSortable>(tasks: TTask[]): TTask[] {
  return [...tasks].sort((left, right) => {
    const startCompare = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    if (startCompare !== 0) {
      return startCompare;
    }

    return left.sortOrder - right.sortOrder;
  });
}

export function getTaskPhase(
  task: TimelineSortable & TimelineStatusAware,
  currentMinutes: number,
): TaskPhaseFlags {
  if (task.status === "termine" || task.status === "ignore" || task.status === "en_retard") {
    return { isPast: true, isCurrent: false, isFuture: false };
  }

  const startMinutes = timeToMinutes(task.startTime);
  const endMinutes = timeToMinutes(task.endTime);

  if (currentMinutes < startMinutes) {
    return { isPast: false, isCurrent: false, isFuture: true };
  }

  if (currentMinutes >= endMinutes) {
    return { isPast: true, isCurrent: false, isFuture: false };
  }

  return { isPast: false, isCurrent: true, isFuture: false };
}

export interface CurrentNextTasks<TTask> {
  currentTask: TTask | null;
  nextTask: TTask | null;
}

export function getCurrentAndNextTasks<TTask extends TimelineSortable & TimelineStatusAware>(
  tasks: TTask[],
  currentMinutes: number,
): CurrentNextTasks<TTask> {
  const orderedTasks = sortTemplateTasks(tasks);

  let currentTask: TTask | null = null;
  let nextTask: TTask | null = null;

  for (const task of orderedTasks) {
    const phase = getTaskPhase(task, currentMinutes);
    if (!currentTask && phase.isCurrent) {
      currentTask = task;
      continue;
    }

    if (!nextTask && phase.isFuture) {
      nextTask = task;
      if (currentTask) {
        break;
      }
    }
  }

  return { currentTask, nextTask };
}

export function getNowCursorPositionPercent(
  currentMinutes: number,
  rangeStartMinutes = 6 * 60,
  rangeEndMinutes = 21 * 60,
): number {
  if (rangeEndMinutes <= rangeStartMinutes) {
    return 0;
  }

  if (currentMinutes <= rangeStartMinutes) {
    return 0;
  }

  if (currentMinutes >= rangeEndMinutes) {
    return 100;
  }

  return ((currentMinutes - rangeStartMinutes) / (rangeEndMinutes - rangeStartMinutes)) * 100;
}
