export interface AssignmentDescriptor {
  assignedProfileId?: string | null;
  assignedProfileDisplayName?: string | null;
  assignedProfileRole?: "parent" | "child" | "viewer" | null;
  childProfileId?: string | null;
}

export type AssignmentKind = "famille" | "child" | "parent";

export function getAssignmentKind(input: AssignmentDescriptor): AssignmentKind {
  if (!input.assignedProfileId) {
    return "famille";
  }

  if (
    input.assignedProfileRole === "child" ||
    (input.childProfileId && input.assignedProfileId === input.childProfileId)
  ) {
    return "child";
  }

  return "parent";
}

export function getChildAssignmentLabel(input: AssignmentDescriptor): string {
  const kind = getAssignmentKind(input);
  if (kind === "famille") {
    return "Famille";
  }

  if (kind === "child") {
    return "Moi";
  }

  return input.assignedProfileDisplayName ?? "Parent";
}

export function getParentAssignmentLabel(input: AssignmentDescriptor): string {
  const kind = getAssignmentKind(input);
  if (kind === "famille") {
    return "Famille";
  }

  if (kind === "child") {
    return "Enfant";
  }

  return input.assignedProfileDisplayName ?? "Parent";
}

export function isTaskPrimarilyForChild(input: AssignmentDescriptor): boolean {
  return getAssignmentKind(input) !== "parent";
}
