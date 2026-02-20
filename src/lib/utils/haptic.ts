import { readFeedbackPreferences } from "@/lib/preferences/feedback";

export function haptic(type: "tap" | "success" | "error" = "tap"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  const { hapticsEnabled } = readFeedbackPreferences();
  if (!hapticsEnabled) {
    return;
  }

  const patterns: Record<"tap" | "success" | "error", number | number[]> = {
    tap: 50,
    success: [100, 50, 100],
    error: [200],
  };

  navigator.vibrate(patterns[type]);
}
