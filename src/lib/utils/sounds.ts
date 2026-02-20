import { readFeedbackPreferences } from "@/lib/preferences/feedback";

export type FeedbackSound = "taskComplete" | "checklistComplete" | "badgeUnlock";

interface SoundStep {
  frequency: number;
  durationMs: number;
  gapMs: number;
  type: OscillatorType;
  gain: number;
}

const SOUND_PATTERNS: Record<FeedbackSound, SoundStep[]> = {
  taskComplete: [
    { frequency: 622, durationMs: 120, gapMs: 50, type: "sine", gain: 0.07 },
    { frequency: 784, durationMs: 140, gapMs: 0, type: "sine", gain: 0.08 },
  ],
  checklistComplete: [
    { frequency: 523, durationMs: 100, gapMs: 40, type: "triangle", gain: 0.07 },
    { frequency: 659, durationMs: 110, gapMs: 40, type: "triangle", gain: 0.07 },
    { frequency: 784, durationMs: 150, gapMs: 0, type: "triangle", gain: 0.08 },
  ],
  badgeUnlock: [
    { frequency: 698, durationMs: 110, gapMs: 45, type: "sine", gain: 0.08 },
    { frequency: 880, durationMs: 120, gapMs: 45, type: "sine", gain: 0.08 },
    { frequency: 1175, durationMs: 170, gapMs: 0, type: "sine", gain: 0.09 },
  ],
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getAudioContextConstructor():
  | (new () => AudioContext)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const browserWindow = window as Window & {
    webkitAudioContext?: new () => AudioContext;
  };

  return globalThis.AudioContext ?? browserWindow.webkitAudioContext;
}

function canPlaySound(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const { soundsEnabled } = readFeedbackPreferences();
  if (!soundsEnabled) {
    return false;
  }

  if (prefersReducedMotion()) {
    return false;
  }

  return Boolean(getAudioContextConstructor());
}

export function playSound(sound: FeedbackSound): void {
  if (!canPlaySound()) {
    return;
  }

  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    return;
  }

  const pattern = SOUND_PATTERNS[sound];
  if (!pattern) {
    return;
  }

  const context = new AudioContextCtor();
  void context.resume().catch(() => undefined);

  let cursor = context.currentTime;
  for (const step of pattern) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = step.type;
    oscillator.frequency.setValueAtTime(step.frequency, cursor);

    gain.gain.setValueAtTime(0.0001, cursor);
    gain.gain.exponentialRampToValueAtTime(step.gain, cursor + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      cursor + step.durationMs / 1000,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(cursor);
    oscillator.stop(cursor + step.durationMs / 1000);

    cursor += (step.durationMs + step.gapMs) / 1000;
  }

  window.setTimeout(() => {
    void context.close().catch(() => undefined);
  }, Math.ceil((cursor - context.currentTime) * 1000) + 220);
}

