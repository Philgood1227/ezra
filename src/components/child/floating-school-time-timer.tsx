"use client";

import * as React from "react";
import { Button } from "@/components/ds";
import {
  acknowledgeAlarmEventAction,
  getNextTimeTimerStateAction,
  pollDueAlarmEventsAction,
} from "@/lib/actions/alarms";
import type { AlarmEventWithRule } from "@/lib/day-templates/types";

interface FloatingSchoolTimeTimerProps {
  visible: boolean;
}

interface TimeTimerState {
  dueAtIso: string | null;
  message: string | null;
  soundKey: string | null;
  label: string | null;
}

interface SoundStep {
  frequency: number;
  durationMs: number;
  gapMs: number;
  type: OscillatorType;
}

const SOUND_PATTERNS: Record<string, SoundStep[]> = {
  cloche_douce: [
    { frequency: 784, durationMs: 220, gapMs: 140, type: "sine" },
    { frequency: 1047, durationMs: 260, gapMs: 0, type: "sine" },
  ],
  cloche_rapide: [
    { frequency: 932, durationMs: 130, gapMs: 80, type: "triangle" },
    { frequency: 932, durationMs: 130, gapMs: 80, type: "triangle" },
    { frequency: 1175, durationMs: 190, gapMs: 0, type: "triangle" },
  ],
  carillon: [
    { frequency: 659, durationMs: 160, gapMs: 80, type: "sine" },
    { frequency: 784, durationMs: 180, gapMs: 80, type: "sine" },
    { frequency: 988, durationMs: 260, gapMs: 0, type: "sine" },
  ],
  tonalite_spatiale: [
    { frequency: 523, durationMs: 120, gapMs: 70, type: "sawtooth" },
    { frequency: 659, durationMs: 150, gapMs: 70, type: "sawtooth" },
    { frequency: 880, durationMs: 240, gapMs: 0, type: "sawtooth" },
  ],
};

function formatTimerLabel(totalSeconds: number): string {
  const safe = Math.max(0, Math.trunc(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function playAlarmSound(soundKey: string | null): number {
  const pattern = SOUND_PATTERNS[soundKey ?? "cloche_douce"] ?? SOUND_PATTERNS.cloche_douce;
  if (!pattern || typeof window === "undefined") {
    return 0;
  }

  const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextCtor = globalThis.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) {
    return 0;
  }

  const context = new AudioContextCtor();
  void context.resume().catch(() => undefined);

  let cursor = context.currentTime;
  for (const step of pattern) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = step.type;
    oscillator.frequency.setValueAtTime(step.frequency, cursor);

    gain.gain.setValueAtTime(0.001, cursor);
    gain.gain.exponentialRampToValueAtTime(0.14, cursor + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + step.durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(cursor);
    oscillator.stop(cursor + step.durationMs / 1000);
    cursor += (step.durationMs + step.gapMs) / 1000;
  }

  window.setTimeout(() => {
    void context.close().catch(() => undefined);
  }, Math.ceil((cursor - context.currentTime) * 1000) + 400);

  return pattern.reduce((total, step) => total + step.durationMs + step.gapMs, 0);
}

function startPersistentAlarmSound(soundKey: string | null): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let stopped = false;
  let timeoutId: number | null = null;

  const loop = (): void => {
    if (stopped) {
      return;
    }
    const patternDurationMs = playAlarmSound(soundKey);
    const nextDelayMs = Math.max(1200, patternDurationMs + 180);
    timeoutId = window.setTimeout(loop, nextDelayMs);
  };

  loop();

  return () => {
    stopped = true;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}

export function FloatingSchoolTimeTimer({ visible }: FloatingSchoolTimeTimerProps): React.JSX.Element | null {
  const [now, setNow] = React.useState(() => new Date());
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [timeTimer, setTimeTimer] = React.useState<TimeTimerState>({
    dueAtIso: null,
    message: null,
    soundKey: null,
    label: null,
  });
  const [activeEvent, setActiveEvent] = React.useState<AlarmEventWithRule | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const playedEventIdsRef = React.useRef<Set<string>>(new Set<string>());
  const stopSoundRef = React.useRef<(() => void) | null>(null);

  const refreshData = React.useCallback(async () => {
    const payload = {
      nowIso: new Date().toISOString(),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      toleranceMinutes: 2,
      ruleKind: "time_timer",
    };

    const [pollResult, nextResult] = await Promise.all([
      pollDueAlarmEventsAction(payload),
      getNextTimeTimerStateAction(payload),
    ]);

    if (!pollResult.success) {
      setFeedback(pollResult.error ?? "Impossible de verifier les Time Timers.");
    } else {
      setFeedback(null);
      setActiveEvent(pollResult.data?.events?.[0] ?? null);
    }

    if (nextResult.success && nextResult.data) {
      setTimeTimer(nextResult.data);
    }
  }, []);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    void refreshData();
    const secondTick = window.setInterval(() => setNow(new Date()), 1000);
    const pollTick = window.setInterval(() => {
      void refreshData();
    }, 20_000);

    return () => {
      window.clearInterval(secondTick);
      window.clearInterval(pollTick);
    };
  }, [refreshData, visible]);

  React.useEffect(() => {
    if (!visible || typeof window === "undefined" || position) {
      return;
    }

    const width = 236;
    const x = Math.max(12, window.innerWidth - width - 16);
    setPosition({ x, y: 96 });
  }, [position, visible]);

  React.useEffect(() => {
    if (!activeEvent) {
      stopSoundRef.current?.();
      stopSoundRef.current = null;
      return;
    }

    if (playedEventIdsRef.current.has(activeEvent.id)) {
      return;
    }

    playedEventIdsRef.current.add(activeEvent.id);
    stopSoundRef.current?.();
    stopSoundRef.current = startPersistentAlarmSound(activeEvent.ruleSoundKey);
  }, [activeEvent]);

  React.useEffect(() => {
    return () => {
      stopSoundRef.current?.();
      stopSoundRef.current = null;
    };
  }, []);

  const dueAtIso = activeEvent?.dueAt ?? timeTimer.dueAtIso;
  const targetTimestamp = React.useMemo(() => {
    if (!dueAtIso) {
      return null;
    }
    const parsed = new Date(dueAtIso).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [dueAtIso]);
  const isValidTarget = targetTimestamp !== null;

  const remainingMs = isValidTarget ? Math.max(0, targetTimestamp - now.getTime()) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const countdownWindowMs = 60 * 60 * 1000;
  const progressRatio = isValidTarget ? Math.min(1, Math.max(0, remainingMs / countdownWindowMs)) : 0;
  const shouldShowCountdown = isValidTarget && remainingMs <= countdownWindowMs;
  const timerTitle = activeEvent?.ruleLabel ?? timeTimer.label ?? "Time Timer";
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progressRatio);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    target.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const maxX = Math.max(12, window.innerWidth - width - 12);
    const maxY = Math.max(12, window.innerHeight - height - 12);
    const x = Math.min(maxX, Math.max(12, event.clientX - dragRef.current.offsetX));
    const y = Math.min(maxY, Math.max(12, event.clientY - dragRef.current.offsetY));
    setPosition({ x, y });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  async function handleAcknowledge(): Promise<void> {
    if (!activeEvent) {
      return;
    }
    stopSoundRef.current?.();
    stopSoundRef.current = null;

    const result = await acknowledgeAlarmEventAction({ eventId: activeEvent.id });
    if (!result.success) {
      setFeedback(result.error ?? "Impossible d'acquitter ce Time Timer.");
      return;
    }

    setActiveEvent(null);
    void refreshData();
  }

  if (!visible || !position || (!shouldShowCountdown && !activeEvent && !feedback)) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fixed z-40 w-60 rounded-2xl border-2 border-orange-200 bg-white p-3 shadow-floating"
        style={{ left: position.x, top: position.y, touchAction: "none" }}
      >
        <div
          className="mb-2 cursor-move rounded-lg bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          Time Timer
        </div>

        <div className="mb-3 rounded-xl border border-border-muted bg-surface-elevated px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Programme</p>
          <p className="truncate text-sm font-bold text-text-primary">{timerTitle}</p>
        </div>

        <div className="flex flex-col items-center">
          <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r="98" fill="none" stroke="#fbcfe8" strokeWidth="1.5" />
            <circle cx="110" cy="110" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="14" />
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="#f97316"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 110 110)"
              style={{ transition: "stroke-dashoffset 220ms linear" }}
            />
            <text
              x="110"
              y="114"
              textAnchor="middle"
              style={{ fontSize: 36, fontWeight: 800, fill: "rgb(30, 41, 59)" }}
            >
              {formatTimerLabel(remainingSeconds)}
            </text>
            <text x="110" y="142" textAnchor="middle" style={{ fontSize: 13, fill: "rgb(71, 85, 105)" }}>
              {shouldShowCountdown ? "En cours" : "En attente"}
            </text>
          </svg>
        </div>
      </div>

      {activeEvent ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto w-full max-w-xl rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-floating">
          <p className="text-sm font-semibold text-orange-900">{activeEvent.ruleMessage}</p>
          <div className="mt-3">
            <Button size="sm" onClick={() => void handleAcknowledge()}>
              J&apos;ai compris
            </Button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto w-full max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-floating">
          {feedback}
        </div>
      ) : null}
    </>
  );
}
