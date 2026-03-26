"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import {
  acknowledgeAlarmEventAction,
  pollDueAlarmEventsAction,
} from "@/lib/actions/alarms";
import type { AlarmEventWithRule } from "@/lib/day-templates/types";

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

function playAlarmSound(soundKey: string): number {
  const pattern = SOUND_PATTERNS[soundKey] ?? SOUND_PATTERNS.cloche_douce;
  if (!pattern) {
    return 0;
  }

  if (typeof window === "undefined") {
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

function startPersistentAlarmSound(soundKey: string): () => void {
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

export function ChildAlarmCenter(): React.JSX.Element | null {
  const [events, setEvents] = useState<AlarmEventWithRule[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const playedEventIdsRef = useRef<Set<string>>(new Set<string>());
  const stopSoundRef = useRef<(() => void) | null>(null);

  const poll = useCallback(async () => {
    const result = await pollDueAlarmEventsAction({
      nowIso: new Date().toISOString(),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      toleranceMinutes: 2,
    });

    if (!result.success) {
      setFeedback(result.error ?? "Impossible de verifier les alarmes.");
      return;
    }

    setFeedback(null);
    setEvents(result.data?.events ?? []);
  }, []);

  useEffect(() => {
    void poll();

    const interval = window.setInterval(() => {
      void poll();
    }, 20_000);

    return () => window.clearInterval(interval);
  }, [poll]);

  const activeEvent = events[0] ?? null;

  useEffect(() => {
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

  useEffect(() => {
    return () => {
      stopSoundRef.current?.();
      stopSoundRef.current = null;
    };
  }, []);

  function handleAcknowledge(eventId: string): void {
    setFeedback(null);
    stopSoundRef.current?.();
    stopSoundRef.current = null;

    startTransition(async () => {
      const result = await acknowledgeAlarmEventAction({ eventId });
      if (!result.success) {
        setFeedback(result.error ?? "Impossible d'acquitter cette alarme.");
        return;
      }

      setEvents((current) => current.filter((entry) => entry.id !== eventId));
      await poll();
    });
  }

  if (!activeEvent && !feedback) {
    return null;
  }

  return (
    <>
      {feedback ? (
        <div className="fixed inset-x-4 top-4 z-50 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-floating">
          {feedback}
        </div>
      ) : null}

      {activeEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <Card className="w-full max-w-2xl border-brand-200 bg-white shadow-floating">
            <CardHeader className="items-center text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
                Alarme
              </p>
              <CardTitle className="text-2xl">{activeEvent.ruleLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <p className="font-display text-4xl font-black leading-tight text-ink-strong">
                {activeEvent.ruleMessage}
              </p>
              <p className="text-sm text-ink-muted">
                {new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(activeEvent.dueAt))}
              </p>
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => handleAcknowledge(activeEvent.id)}
                  loading={isPending}
                >
                  J&apos;ai compris
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
