export interface FeedbackPreferences {
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export type FeedbackPreferencesScope = "global" | "parent" | "child";

export const FEEDBACK_PREFERENCES_DEFAULT: FeedbackPreferences = {
  hapticsEnabled: true,
  soundsEnabled: false,
};

export const FEEDBACK_PREFERENCES_EVENT = "ezra-feedback-preferences-change";

export function getFeedbackPreferencesStorageKey(
  scope: FeedbackPreferencesScope = "global",
): string {
  return `ezra-feedback-preferences:${scope}`;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parsePreferences(value: string | null): FeedbackPreferences {
  if (!value) {
    return FEEDBACK_PREFERENCES_DEFAULT;
  }

  try {
    const parsed = JSON.parse(value) as Partial<FeedbackPreferences>;
    return {
      hapticsEnabled: parseBoolean(parsed.hapticsEnabled, FEEDBACK_PREFERENCES_DEFAULT.hapticsEnabled),
      soundsEnabled: parseBoolean(parsed.soundsEnabled, FEEDBACK_PREFERENCES_DEFAULT.soundsEnabled),
    };
  } catch {
    return FEEDBACK_PREFERENCES_DEFAULT;
  }
}

export function readFeedbackPreferences(
  scope: FeedbackPreferencesScope = "global",
): FeedbackPreferences {
  if (typeof window === "undefined") {
    return FEEDBACK_PREFERENCES_DEFAULT;
  }

  return parsePreferences(window.localStorage.getItem(getFeedbackPreferencesStorageKey(scope)));
}

export function writeFeedbackPreferences(
  preferences: FeedbackPreferences,
  scope: FeedbackPreferencesScope = "global",
): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextPreferences: FeedbackPreferences = {
    hapticsEnabled: preferences.hapticsEnabled,
    soundsEnabled: preferences.soundsEnabled,
  };

  window.localStorage.setItem(getFeedbackPreferencesStorageKey(scope), JSON.stringify(nextPreferences));
  window.dispatchEvent(
    new CustomEvent(FEEDBACK_PREFERENCES_EVENT, {
      detail: {
        scope,
        preferences: nextPreferences,
      },
    }),
  );
}

