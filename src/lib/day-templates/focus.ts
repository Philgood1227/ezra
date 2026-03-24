import type { PlanActionableKind, TaskInstanceSummary } from "@/lib/day-templates/types";

const FOCUS_ELIGIBLE_KINDS: readonly PlanActionableKind[] = ["mission"];

function resolveTaskKind(task: TaskInstanceSummary): PlanActionableKind | null {
  return task.itemKind ?? task.category.defaultItemKind ?? null;
}

export function canOpenFocusForTask(task: TaskInstanceSummary): boolean {
  const kind = resolveTaskKind(task);
  if (!kind) {
    return false;
  }

  return FOCUS_ELIGIBLE_KINDS.includes(kind);
}
