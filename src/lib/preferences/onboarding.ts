export type ParentOnboardingObjective =
  | "routines"
  | "devoirs"
  | "motivation"
  | null;

export interface ParentOnboardingState {
  completed: boolean;
  skipped: boolean;
  objective: ParentOnboardingObjective;
  completedAt: string | null;
}

export interface ChildOnboardingState {
  completed: boolean;
  remindLater: boolean;
  completedAt: string | null;
}

const PARENT_ONBOARDING_KEY_PREFIX = "ezra-parent-onboarding";
const CHILD_ONBOARDING_KEY_PREFIX = "ezra-child-onboarding";

const DEFAULT_PARENT_STATE: ParentOnboardingState = {
  completed: false,
  skipped: false,
  objective: null,
  completedAt: null,
};

const DEFAULT_CHILD_STATE: ChildOnboardingState = {
  completed: false,
  remindLater: false,
  completedAt: null,
};

function getScopedKey(prefix: string, profileId: string | null | undefined): string {
  const scope = profileId && profileId.trim().length > 0 ? profileId.trim() : "default";
  return `${prefix}:${scope}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseParentState(raw: string | null): ParentOnboardingState {
  if (!raw) {
    return DEFAULT_PARENT_STATE;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return DEFAULT_PARENT_STATE;
    }

    return {
      completed: parsed.completed === true,
      skipped: parsed.skipped === true,
      objective:
        parsed.objective === "routines" ||
        parsed.objective === "devoirs" ||
        parsed.objective === "motivation"
          ? parsed.objective
          : null,
      completedAt:
        typeof parsed.completedAt === "string" && parsed.completedAt.length > 0
          ? parsed.completedAt
          : null,
    };
  } catch {
    return DEFAULT_PARENT_STATE;
  }
}

function parseChildState(raw: string | null): ChildOnboardingState {
  if (!raw) {
    return DEFAULT_CHILD_STATE;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return DEFAULT_CHILD_STATE;
    }

    return {
      completed: parsed.completed === true,
      remindLater: parsed.remindLater === true,
      completedAt:
        typeof parsed.completedAt === "string" && parsed.completedAt.length > 0
          ? parsed.completedAt
          : null,
    };
  } catch {
    return DEFAULT_CHILD_STATE;
  }
}

export function readParentOnboardingState(
  profileId: string | null | undefined,
): ParentOnboardingState {
  if (typeof window === "undefined") {
    return DEFAULT_PARENT_STATE;
  }

  const key = getScopedKey(PARENT_ONBOARDING_KEY_PREFIX, profileId);
  return parseParentState(window.localStorage.getItem(key));
}

export function writeParentOnboardingState(
  profileId: string | null | undefined,
  nextState: ParentOnboardingState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = getScopedKey(PARENT_ONBOARDING_KEY_PREFIX, profileId);
  window.localStorage.setItem(key, JSON.stringify(nextState));
}

export function readChildOnboardingState(
  profileId: string | null | undefined,
): ChildOnboardingState {
  if (typeof window === "undefined") {
    return DEFAULT_CHILD_STATE;
  }

  const key = getScopedKey(CHILD_ONBOARDING_KEY_PREFIX, profileId);
  return parseChildState(window.localStorage.getItem(key));
}

export function writeChildOnboardingState(
  profileId: string | null | undefined,
  nextState: ChildOnboardingState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const key = getScopedKey(CHILD_ONBOARDING_KEY_PREFIX, profileId);
  window.localStorage.setItem(key, JSON.stringify(nextState));
}

