import { inferActionableKind, toContextSubkind } from "@/lib/day-templates/kind-inference";
import { timeToMinutes } from "@/lib/day-templates/time";
import type {
  CategoryColorKey,
  CategoryIconKey,
  DayTemplateBlockSummary,
  DayTimelineItemSummary,
  TaskInstanceSummary,
} from "@/lib/day-templates/types";

interface BuildUnifiedTimelineItemsInput {
  tasks: TaskInstanceSummary[];
  blocks: DayTemplateBlockSummary[];
  includeVirtualHomeGaps?: boolean;
  dayRangeStartTime?: string;
  dayRangeEndTime?: string;
}

interface HomeGapInput {
  contextItems: DayTimelineItemSummary[];
  rangeStartTime: string;
  rangeEndTime: string;
}

function minutesToTimeLabel(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDefaultContextTitle(subkind: DayTimelineItemSummary["subkind"]): string {
  if (subkind === "school") {
    return "Ecole";
  }

  if (subkind === "home") {
    return "Maison";
  }

  if (subkind === "transport") {
    return "Trajet";
  }

  if (subkind === "club") {
    return "Club";
  }

  return "Contexte";
}

function getContextColorKey(subkind: DayTimelineItemSummary["subkind"]): CategoryColorKey {
  if (subkind === "school") {
    return "category-ecole";
  }

  if (subkind === "home") {
    return "category-calme";
  }

  if (subkind === "transport") {
    return "category-routine";
  }

  if (subkind === "club") {
    return "category-sport";
  }

  return "category-routine";
}

function getContextIcon(subkind: DayTimelineItemSummary["subkind"]): CategoryIconKey {
  if (subkind === "school") {
    return "school";
  }

  if (subkind === "home") {
    return "routine";
  }

  if (subkind === "transport") {
    return "transport";
  }

  if (subkind === "club") {
    return "sport";
  }

  return "default";
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getOverlapMinutes(
  left: { startTime: string; endTime: string },
  right: { startTime: string; endTime: string },
): number {
  const leftStart = timeToMinutes(left.startTime);
  const leftEnd = timeToMinutes(left.endTime);
  const rightStart = timeToMinutes(right.startTime);
  const rightEnd = timeToMinutes(right.endTime);

  return Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart));
}

function isSchoolLikeTask(task: TaskInstanceSummary): boolean {
  const text = normalizeText(`${task.title} ${task.category.name} ${task.category.colorKey}`);
  if (!text) {
    return false;
  }

  return (
    text.includes("ecole") ||
    text.includes("school") ||
    text.includes("classe") ||
    text.includes("cours")
  );
}

export function isSchoolContextMirrorTask(task: TaskInstanceSummary, blocks: DayTemplateBlockSummary[]): boolean {
  if (!isSchoolLikeTask(task)) {
    return false;
  }

  const taskDuration = Math.max(1, timeToMinutes(task.endTime) - timeToMinutes(task.startTime));
  return blocks
    .filter((block) => block.blockType === "school")
    .some((block) => {
      const overlap = getOverlapMinutes(task, block);
      return overlap / taskDuration >= 0.7;
    });
}

export function filterOutSchoolContextMirrorTasks(
  tasks: TaskInstanceSummary[],
  blocks: DayTemplateBlockSummary[],
): TaskInstanceSummary[] {
  if (tasks.length === 0 || blocks.length === 0) {
    return tasks;
  }

  return tasks.filter((task) => !isSchoolContextMirrorTask(task, blocks));
}

export function sortTimelineItems(items: DayTimelineItemSummary[]): DayTimelineItemSummary[] {
  return [...items].sort((left, right) => {
    const leftStart = timeToMinutes(left.startTime);
    const rightStart = timeToMinutes(right.startTime);
    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }

    const leftKindPriority = left.kind === "context" ? 0 : 1;
    const rightKindPriority = right.kind === "context" ? 0 : 1;
    if (leftKindPriority !== rightKindPriority) {
      return leftKindPriority - rightKindPriority;
    }

    return left.sortOrder - right.sortOrder;
  });
}

function buildContextItems(blocks: DayTemplateBlockSummary[]): DayTimelineItemSummary[] {
  return blocks.map((block) => {
    const subkind = toContextSubkind(block.blockType);
    const title = block.label?.trim() || getDefaultContextTitle(subkind);

    return {
      id: `context-${block.id}`,
      kind: "context",
      subkind,
      title,
      description: null,
      startTime: block.startTime,
      endTime: block.endTime,
      sortOrder: block.sortOrder,
      status: "context",
      isActionable: false,
      isReadOnly: true,
      pointsBase: 0,
      pointsEarned: 0,
      source: "template_block",
      sourceRefId: block.id,
      category: {
        name: getDefaultContextTitle(subkind),
        icon: getContextIcon(subkind),
        colorKey: getContextColorKey(subkind),
      },
    };
  });
}

function buildTaskItems(tasks: TaskInstanceSummary[], blocks: DayTemplateBlockSummary[]): DayTimelineItemSummary[] {
  return filterOutSchoolContextMirrorTasks(tasks, blocks).map((task) => {
    const inferredKind = inferActionableKind({
      colorKey: task.category.colorKey,
      categoryName: task.category.name,
      title: task.title,
    });
    const kind = task.itemKind ?? inferredKind;

    return {
      id: `item-${task.id}`,
      kind,
      subkind: task.itemSubkind ?? null,
      title: task.title,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      sortOrder: task.sortOrder,
      status: task.status,
      isActionable: !task.isReadOnly,
      isReadOnly: Boolean(task.isReadOnly),
      pointsBase: task.pointsBase,
      pointsEarned: task.pointsEarned,
      source: task.source === "movie_session" ? "movie_session" : "task_instance",
      sourceRefId: task.sourceRefId ?? task.id,
      category: {
        name: task.category.name,
        icon: task.category.icon,
        colorKey: task.category.colorKey,
      },
    };
  });
}

function buildVirtualHomeContextItems({
  contextItems,
  rangeStartTime,
  rangeEndTime,
}: HomeGapInput): DayTimelineItemSummary[] {
  const ordered = sortTimelineItems(contextItems);
  const startMinutes = timeToMinutes(rangeStartTime);
  const endMinutes = timeToMinutes(rangeEndTime);
  const virtualItems: DayTimelineItemSummary[] = [];

  let cursor = startMinutes;
  let syntheticIndex = 0;

  for (const item of ordered) {
    const itemStart = timeToMinutes(item.startTime);
    const itemEnd = timeToMinutes(item.endTime);

    if (itemStart > cursor) {
      syntheticIndex += 1;
      virtualItems.push({
        id: `virtual-home-${syntheticIndex}`,
        kind: "context",
        subkind: "home",
        title: "Maison",
        description: null,
        startTime: minutesToTimeLabel(cursor),
        endTime: minutesToTimeLabel(itemStart),
        sortOrder: -10_000 + syntheticIndex,
        status: "context",
        isActionable: false,
        isReadOnly: true,
        pointsBase: 0,
        pointsEarned: 0,
        source: "virtual_context",
        sourceRefId: null,
        category: {
          name: "Maison",
          icon: "routine",
          colorKey: "category-calme",
        },
      });
    }

    cursor = Math.max(cursor, itemEnd);
  }

  if (cursor < endMinutes) {
    syntheticIndex += 1;
    virtualItems.push({
      id: `virtual-home-${syntheticIndex}`,
      kind: "context",
      subkind: "home",
      title: "Maison",
      description: null,
      startTime: minutesToTimeLabel(cursor),
      endTime: minutesToTimeLabel(endMinutes),
      sortOrder: -10_000 + syntheticIndex,
      status: "context",
      isActionable: false,
      isReadOnly: true,
      pointsBase: 0,
      pointsEarned: 0,
      source: "virtual_context",
      sourceRefId: null,
      category: {
        name: "Maison",
        icon: "routine",
        colorKey: "category-calme",
      },
    });
  }

  return virtualItems;
}

export function buildUnifiedTimelineItems({
  tasks,
  blocks,
  includeVirtualHomeGaps = true,
  dayRangeStartTime = "06:00",
  dayRangeEndTime = "22:00",
}: BuildUnifiedTimelineItemsInput): DayTimelineItemSummary[] {
  const contextItems = buildContextItems(blocks);
  const taskItems = buildTaskItems(tasks, blocks);
  const virtualHomeItems = includeVirtualHomeGaps
    ? buildVirtualHomeContextItems({
        contextItems,
        rangeStartTime: dayRangeStartTime,
        rangeEndTime: dayRangeEndTime,
      })
    : [];

  return sortTimelineItems([...contextItems, ...virtualHomeItems, ...taskItems]);
}

function isCurrent(item: DayTimelineItemSummary, currentMinutes: number): boolean {
  const start = timeToMinutes(item.startTime);
  const end = timeToMinutes(item.endTime);
  return currentMinutes >= start && currentMinutes < end;
}

export function findCurrentContextItem(
  items: DayTimelineItemSummary[],
  currentMinutes: number,
): DayTimelineItemSummary | null {
  const activeContexts = items.filter((item) => item.kind === "context" && isCurrent(item, currentMinutes));
  if (activeContexts.length === 0) {
    return null;
  }

  return activeContexts.sort((left, right) => timeToMinutes(right.startTime) - timeToMinutes(left.startTime))[0] ?? null;
}

export function findCurrentActionItem(
  items: DayTimelineItemSummary[],
  currentMinutes: number,
): DayTimelineItemSummary | null {
  const activeItems = items.filter((item) => {
    if (item.kind === "context") {
      return false;
    }

    if (!item.isActionable) {
      return false;
    }

    if (item.status === "termine" || item.status === "ignore") {
      return false;
    }

    return isCurrent(item, currentMinutes);
  });

  if (activeItems.length === 0) {
    return null;
  }

  return activeItems.sort((left, right) => timeToMinutes(right.startTime) - timeToMinutes(left.startTime))[0] ?? null;
}

export function findNextTimelineItem(
  items: DayTimelineItemSummary[],
  currentMinutes: number,
): DayTimelineItemSummary | null {
  const next = sortTimelineItems(items).find((item) => timeToMinutes(item.startTime) > currentMinutes);
  return next ?? null;
}
