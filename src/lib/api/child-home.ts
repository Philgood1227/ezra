import { getChecklistsForCurrentChildByDay } from "@/lib/api/checklists";
import { getTodayTemplateWithTasksForProfile } from "@/lib/api/day-view";
import { getKnowledgeSubjectsForCurrentFamily } from "@/lib/api/knowledge";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { getCurrentAndNextTasks, sortTemplateTasks } from "@/lib/day-templates/timeline";
import { getCurrentMinutes, timeToMinutes } from "@/lib/day-templates/time";
import { getMomentLabel } from "@/lib/day-templates/school-calendar";
import type {
  ChecklistInstanceSummary,
  DayPeriod,
  DayTemplateBlockSummary,
  TaskInstanceSummary,
} from "@/lib/day-templates/types";

export interface ChildHomeTaskSummary {
  title: string;
  icon: string;
  colorKey: string;
  startTime: string;
  endTime: string;
}

export type ChildHomeNowState =
  | "no_tasks"
  | "school_block"
  | "active_task"
  | "before_first_task"
  | "between_tasks"
  | "after_last_task";

export interface ChildHomeData {
  childName: string;
  date: Date;
  currentTask: ChildHomeTaskSummary | null;
  nextTask: ChildHomeTaskSummary | null;
  nowState: ChildHomeNowState;
  dayPeriod: DayPeriod;
  dayPeriodLabel: string;
  daysUntilNextVacation: number | null;
  nextVacationLabel: string | null;
  nextVacationStartDate: string | null;
  hasSchoolPeriodsConfigured: boolean;
  currentMomentLabel: string;
  currentContextLabel: string;
  isInSchoolBlock: boolean;
  activeSchoolBlockEndTime: string | null;
  dayBlocks: DayTemplateBlockSummary[];
  pointsEarned: number;
  pointsTarget: number;
  tasksCompleted: number;
  tasksTotal: number;
  nextRewardLabel: string | null;
  checklistTodayCount: number;
  checklistTodayDone: number;
  checklistTomorrowCount: number;
  checklistTomorrowDone: number;
  checklistUncheckedCount: number;
  knowledgeCardsCount: number;
  knowledgeSubjectsCount: number;
}

function getFirstName(displayName: string | null | undefined): string {
  if (!displayName) {
    return "Ezra";
  }

  const trimmed = displayName.trim();
  if (!trimmed) {
    return "Ezra";
  }

  return trimmed.split(/\s+/)[0] ?? "Ezra";
}

function toTaskSummary(task: TaskInstanceSummary | null): ChildHomeTaskSummary | null {
  if (!task) {
    return null;
  }

  return {
    title: task.title,
    icon: task.category.icon,
    colorKey: task.category.colorKey,
    startTime: task.startTime,
    endTime: task.endTime,
  };
}

function getChecklistStats(items: ChecklistInstanceSummary[]): { count: number; done: number } {
  const flattenedItems = items.flatMap((entry) => entry.items);
  return {
    count: flattenedItems.length,
    done: flattenedItems.filter((item) => item.isChecked).length,
  };
}

function getActionableTasks(tasks: TaskInstanceSummary[]): TaskInstanceSummary[] {
  return tasks.filter((task) => !task.isReadOnly && task.status !== "ignore");
}

function getNowState(input: {
  tasks: TaskInstanceSummary[];
  currentTask: TaskInstanceSummary | null;
  nextTask: TaskInstanceSummary | null;
  currentMinutes: number;
  isInSchoolBlock: boolean;
}): ChildHomeNowState {
  if (input.tasks.length === 0) {
    return "no_tasks";
  }

  if (input.isInSchoolBlock) {
    return "school_block";
  }

  if (input.currentTask) {
    return "active_task";
  }

  const orderedTasks = sortTemplateTasks(input.tasks);
  const firstTask = orderedTasks[0];
  const lastTask = orderedTasks[orderedTasks.length - 1];

  if (input.nextTask && firstTask && input.currentMinutes < timeToMinutes(firstTask.startTime)) {
    return "before_first_task";
  }

  if (lastTask && input.currentMinutes >= timeToMinutes(lastTask.endTime) && !input.nextTask) {
    return "after_last_task";
  }

  return "between_tasks";
}

function getPointsTarget(input: {
  tasks: TaskInstanceSummary[];
  pointsEarned: number;
  rewardPointsRequired: number[];
}): number {
  const baseTaskTarget = input.tasks.reduce((total, task) => total + task.pointsBase, 0);
  const upcomingRewardTarget =
    input.rewardPointsRequired
      .sort((left, right) => left - right)
      .find((requiredPoints) => requiredPoints > input.pointsEarned) ?? 0;

  const computedTarget = Math.max(baseTaskTarget, upcomingRewardTarget);
  return computedTarget > 0 ? computedTarget : 0;
}

export async function getChildHomeData(profileId: string): Promise<ChildHomeData> {
  const now = new Date();
  const currentMinutes = getCurrentMinutes(now);
  const context = await getCurrentProfile();
  const [timelineData, checklistsByDay, knowledgeSubjects] = await Promise.all([
    getTodayTemplateWithTasksForProfile(profileId),
    getChecklistsForCurrentChildByDay(),
    getKnowledgeSubjectsForCurrentFamily(),
  ]);

  const actionableTasks = getActionableTasks(timelineData.instances);
  const { currentTask, nextTask } = getCurrentAndNextTasks(actionableTasks, currentMinutes);
  const shouldHideCurrentTask = timelineData.dayContext.isInSchoolBlock;
  const nowState = getNowState({
    tasks: actionableTasks,
    currentTask,
    nextTask,
    currentMinutes,
    isInSchoolBlock: timelineData.dayContext.isInSchoolBlock,
  });
  const pointsEarned = timelineData.dailyPoints?.pointsTotal ?? 0;
  const pointsTarget = getPointsTarget({
    tasks: actionableTasks,
    pointsEarned,
    rewardPointsRequired: timelineData.rewardTiers.map((tier) => tier.pointsRequired),
  });
  const tasksCompleted = actionableTasks.filter((task) => task.status === "termine").length;
  const tasksTotal = actionableTasks.length;

  const checklistTodayStats = getChecklistStats(checklistsByDay.today);
  const checklistTomorrowStats = getChecklistStats(checklistsByDay.tomorrow);
  const knowledgeCardsCount = knowledgeSubjects.reduce((total, subject) => total + subject.cardCount, 0);

  return {
    childName: getFirstName(context.profile?.display_name),
    date: now,
    currentTask: shouldHideCurrentTask ? null : toTaskSummary(currentTask),
    nextTask: toTaskSummary(nextTask),
    nowState,
    dayPeriod: timelineData.dayContext.period,
    dayPeriodLabel: timelineData.dayContext.periodLabel,
    daysUntilNextVacation: timelineData.dayContext.daysUntilNextVacation,
    nextVacationLabel: timelineData.dayContext.nextVacationLabel,
    nextVacationStartDate: timelineData.dayContext.nextVacationStartDate,
    hasSchoolPeriodsConfigured: timelineData.dayContext.hasSchoolPeriodsConfigured,
    currentMomentLabel: getMomentLabel(timelineData.dayContext.currentMoment),
    currentContextLabel: timelineData.dayContext.currentContextLabel,
    isInSchoolBlock: timelineData.dayContext.isInSchoolBlock,
    activeSchoolBlockEndTime: timelineData.dayContext.activeSchoolBlockEndTime,
    dayBlocks: timelineData.blocks,
    pointsEarned,
    pointsTarget,
    tasksCompleted,
    tasksTotal,
    nextRewardLabel:
      timelineData.rewardTiers
        .sort((left, right) => left.pointsRequired - right.pointsRequired)
        .find((tier) => tier.pointsRequired > pointsEarned)?.label ?? null,
    checklistTodayCount: checklistTodayStats.count,
    checklistTodayDone: checklistTodayStats.done,
    checklistTomorrowCount: checklistTomorrowStats.count,
    checklistTomorrowDone: checklistTomorrowStats.done,
    checklistUncheckedCount:
      checklistTodayStats.count -
      checklistTodayStats.done +
      (checklistTomorrowStats.count - checklistTomorrowStats.done),
    knowledgeCardsCount,
    knowledgeSubjectsCount: knowledgeSubjects.length,
  };
}

export function getEmptyChildHomeData(date = new Date()): ChildHomeData {
  return {
    childName: "Ezra",
    date,
    currentTask: null,
    nextTask: null,
    nowState: "no_tasks",
    dayPeriod: "ecole",
    dayPeriodLabel: "Ecole",
    daysUntilNextVacation: null,
    nextVacationLabel: null,
    nextVacationStartDate: null,
    hasSchoolPeriodsConfigured: false,
    currentMomentLabel: "Matin",
    currentContextLabel: "Temps a la maison",
    isInSchoolBlock: false,
    activeSchoolBlockEndTime: null,
    dayBlocks: [],
    pointsEarned: 0,
    pointsTarget: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    nextRewardLabel: null,
    checklistTodayCount: 0,
    checklistTodayDone: 0,
    checklistTomorrowCount: 0,
    checklistTomorrowDone: 0,
    checklistUncheckedCount: 0,
    knowledgeCardsCount: 0,
    knowledgeSubjectsCount: 0,
  };
}
