import type { ChildHomeTaskSummary } from "@/lib/api/child-home";
import { parseCategoryIconKey } from "@/lib/day-templates/constants";
import { resolveTaskInstructionsHtml } from "@/lib/day-templates/instructions";
import { timeToMinutes } from "@/lib/day-templates/time";
import type { ChildTimeBlockId, TaskInstanceStatus } from "@/lib/day-templates/types";
import { getChildTimeBlockForTimeRange, getChildTimeBlockLabel } from "@/lib/time/day-segments";
import { resolveMissionCategory } from "./mission-category";
import type { MissionHelpLink, MissionMicroStep, MissionStatus, MissionUI } from "./types";

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNonNegativeInt(input: number | null | undefined): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return 0;
  }

  return Math.max(0, Math.trunc(input));
}

function computeEstimatedMinutes(task: ChildHomeTaskSummary): number {
  const directValue = toNonNegativeInt(task.estimatedMinutes);
  if (directValue > 0) {
    return directValue;
  }

  const startMinutes = timeToMinutes(task.startTime);
  const endMinutes = timeToMinutes(task.endTime);
  const deltaMinutes = endMinutes - startMinutes;

  if (deltaMinutes > 0) {
    return deltaMinutes;
  }

  return 10;
}

function buildInstructionsHtml(task: ChildHomeTaskSummary): string {
  const resolvedInstructions = resolveTaskInstructionsHtml({
    instructionsHtml: task.instructionsHtml,
    description: task.description,
  });
  if (resolvedInstructions) {
    return resolvedInstructions;
  }

  return "<p>Aucune consigne pour le moment.</p>";
}

function buildMicroSteps(task: ChildHomeTaskSummary): MissionMicroStep[] {
  const fromText = (task.description ?? "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:\d+\.|[-*])\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 5)
    .map((line, index) => ({
      id: `${task.id ?? task.title}-step-${index + 1}`,
      label: line,
      done: false,
    }));

  if (fromText.length > 1) {
    return fromText;
  }

  const listMatches = task.instructionsHtml?.match(/<li[^>]*>(.*?)<\/li>/gi) ?? [];
  const fromHtml = listMatches
    .map((entry) => stripHtmlTags(entry).trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line, index) => ({
      id: `${task.id ?? task.title}-html-step-${index + 1}`,
      label: line,
      done: false,
    }));

  return fromHtml;
}

function normalizeHelpLinks(task: ChildHomeTaskSummary): MissionHelpLink[] {
  const fromTask = (task.helpLinks ?? [])
    .filter((link) => typeof link.href === "string" && link.href.trim().length > 0)
    .map((link, index) => ({
      id: link.id || `${task.id ?? task.title}-link-${index + 1}`,
      label: link.label?.trim() || "Fiche de revision",
      href: link.href,
    }));

  if (fromTask.length > 0) {
    return fromTask;
  }

  if (task.knowledgeCardId) {
    return [
      {
        id: `knowledge-${task.knowledgeCardId}`,
        label: task.knowledgeCardTitle?.trim() || "Fiche de revision",
        href: `/child/knowledge?card=${task.knowledgeCardId}`,
      },
    ];
  }

  return [];
}

export function mapTaskStatusToMissionStatus(
  status: TaskInstanceStatus | null | undefined,
): MissionStatus {
  if (status === "termine" || status === "ignore") {
    return "done";
  }

  if (status === "en_cours") {
    return "in_progress";
  }

  return "todo";
}

export function mapMissionStatusToTaskStatus(status: MissionStatus): TaskInstanceStatus {
  if (status === "done") {
    return "termine";
  }

  if (status === "in_progress") {
    return "en_cours";
  }

  return "a_faire";
}

function resolveBlockId(task: ChildHomeTaskSummary): ChildTimeBlockId {
  return (
    task.recommendedChildTimeBlockId ?? getChildTimeBlockForTimeRange(task.startTime, task.endTime)
  );
}

export function mapTaskToMission(task: ChildHomeTaskSummary): MissionUI | null {
  if ((task.itemKind ?? "mission") !== "mission") {
    return null;
  }

  const missionCategory = resolveMissionCategory({
    title: task.title,
    itemSubkind: task.itemSubkind ?? null,
    categoryName: task.categoryName ?? null,
    iconKey: task.iconKey,
  });

  if (!missionCategory) {
    return null;
  }

  const blockId = resolveBlockId(task);

  return {
    id: task.id ?? `mission-${task.title}-${task.startTime}`,
    title: task.title,
    iconKey: parseCategoryIconKey(task.iconKey),
    colorKey: task.colorKey,
    startTime: task.startTime,
    endTime: task.endTime,
    estimatedMinutes: computeEstimatedMinutes(task),
    points: toNonNegativeInt(task.pointsBase),
    status: mapTaskStatusToMissionStatus(task.status),
    sourceStatus: mapMissionStatusToTaskStatus(mapTaskStatusToMissionStatus(task.status)),
    instructionsHtml: buildInstructionsHtml(task),
    helpLinks: normalizeHelpLinks(task),
    recommendedBlockId: blockId,
    recommendedBlockLabel: getChildTimeBlockLabel(blockId),
    itemSubkind: task.itemSubkind ?? null,
    categoryName: task.categoryName?.trim() || null,
    missionCategory,
    microSteps: buildMicroSteps(task),
  };
}

export function mapTasksToMissions(tasks: ChildHomeTaskSummary[]): MissionUI[] {
  return tasks
    .map((task) => mapTaskToMission(task))
    .filter((task): task is MissionUI => task !== null)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }

      return left.title.localeCompare(right.title);
    });
}

export function getMissionStatusLabel(status: MissionStatus): string {
  if (status === "in_progress") {
    return "En cours";
  }

  if (status === "done") {
    return "Fait";
  }

  return "A faire";
}
