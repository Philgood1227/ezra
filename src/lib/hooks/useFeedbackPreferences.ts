"use client";

import * as React from "react";
import {
  FEEDBACK_PREFERENCES_DEFAULT,
  FEEDBACK_PREFERENCES_EVENT,
  getFeedbackPreferencesStorageKey,
  readFeedbackPreferences,
  type FeedbackPreferences,
  type FeedbackPreferencesScope,
  writeFeedbackPreferences,
} from "@/lib/preferences/feedback";

interface UseFeedbackPreferencesResult {
  preferences: FeedbackPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<FeedbackPreferences>>;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  resetPreferences: () => void;
}

interface FeedbackPreferencesChangeEventDetail {
  scope?: FeedbackPreferencesScope;
  preferences?: FeedbackPreferences;
}

function matchesScope(
  detail: FeedbackPreferencesChangeEventDetail | null | undefined,
  scope: FeedbackPreferencesScope,
): boolean {
  return detail?.scope === scope;
}

export function useFeedbackPreferences(
  scope: FeedbackPreferencesScope = "global",
): UseFeedbackPreferencesResult {
  const [preferences, setPreferencesState] = React.useState<FeedbackPreferences>(
    FEEDBACK_PREFERENCES_DEFAULT,
  );

  React.useEffect(() => {
    setPreferencesState(readFeedbackPreferences(scope));
  }, [scope]);

  const setPreferences = React.useCallback<
    React.Dispatch<React.SetStateAction<FeedbackPreferences>>
  >(
    (nextValue) => {
      setPreferencesState((current) => {
        const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
        writeFeedbackPreferences(resolved, scope);
        return resolved;
      });
    },
    [scope],
  );

  React.useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== getFeedbackPreferencesStorageKey(scope)) {
        return;
      }

      setPreferencesState(readFeedbackPreferences(scope));
    };

    const onCustomEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<FeedbackPreferencesChangeEventDetail>;
      if (!matchesScope(customEvent.detail, scope)) {
        return;
      }

      if (customEvent.detail.preferences) {
        setPreferencesState(customEvent.detail.preferences);
      } else {
        setPreferencesState(readFeedbackPreferences(scope));
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(FEEDBACK_PREFERENCES_EVENT, onCustomEvent);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FEEDBACK_PREFERENCES_EVENT, onCustomEvent);
    };
  }, [scope]);

  const setHapticsEnabled = React.useCallback(
    (enabled: boolean) => {
      setPreferences((current) => ({ ...current, hapticsEnabled: enabled }));
    },
    [setPreferences],
  );

  const setSoundsEnabled = React.useCallback(
    (enabled: boolean) => {
      setPreferences((current) => ({ ...current, soundsEnabled: enabled }));
    },
    [setPreferences],
  );

  const resetPreferences = React.useCallback(() => {
    setPreferences(FEEDBACK_PREFERENCES_DEFAULT);
  }, [setPreferences]);

  return {
    preferences,
    setPreferences,
    setHapticsEnabled,
    setSoundsEnabled,
    resetPreferences,
  };
}

