import type { TaskInstanceStatus } from "@/lib/day-templates/types";

export const TASK_STATUS_LABELS: Record<TaskInstanceStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
  en_retard: "En retard",
  ignore: "Ignoré",
};

export function canTransitionTaskStatus(
  currentStatus: TaskInstanceStatus,
  nextStatus: TaskInstanceStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (currentStatus === "a_faire" && (nextStatus === "en_cours" || nextStatus === "termine")) {
    return true;
  }

  if (currentStatus === "en_cours" && nextStatus === "a_faire") {
    return true;
  }

  if (currentStatus === "en_cours" && nextStatus === "termine") {
    return true;
  }

  return false;
}
