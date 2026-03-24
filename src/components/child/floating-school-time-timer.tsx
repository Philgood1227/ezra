"use client";

import * as React from "react";
import { Button } from "@/components/ds";

interface FloatingSchoolTimeTimerProps {
  visible: boolean;
  targetHour?: number;
  targetMinute?: number;
}

const ALARM_TEXT = "Il est temps de se brosser les dents et de finir de se preparer.";

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function playAlarmSound(): void {
  if (typeof window === "undefined") {
    return;
  }

  const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextCtor = globalThis.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  void context.resume().catch(() => undefined);
  const now = context.currentTime;
  const notes = [784, 988, 1175];

  notes.forEach((frequency, index) => {
    const start = now + index * 0.22;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
  });

  window.setTimeout(() => {
    void context.close().catch(() => undefined);
  }, 1200);
}

function getStorageKeyForDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `ezra_school_timer_alert_${year}-${month}-${day}`;
}

export function FloatingSchoolTimeTimer({
  visible,
  targetHour = 7,
  targetMinute = 40,
}: FloatingSchoolTimeTimerProps): React.JSX.Element | null {
  const [now, setNow] = React.useState(() => new Date());
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [showMessage, setShowMessage] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const totalDurationRef = React.useRef<number>(1);
  const dragRef = React.useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [visible]);

  React.useEffect(() => {
    if (!visible || typeof window === "undefined" || position) {
      return;
    }
    const width = 224;
    const x = Math.max(12, window.innerWidth - width - 16);
    setPosition({ x, y: 96 });
  }, [position, visible]);

  const targetDate = React.useMemo(() => {
    const next = new Date(now);
    next.setHours(targetHour, targetMinute, 0, 0);
    return next;
  }, [now, targetHour, targetMinute]);

  const remainingMs = Math.max(0, targetDate.getTime() - now.getTime());
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  React.useEffect(() => {
    if (!visible) {
      totalDurationRef.current = 1;
      return;
    }
    if (remainingMs > 0 && totalDurationRef.current <= 1) {
      totalDurationRef.current = Math.max(1, remainingMs);
    }
  }, [remainingMs, visible]);

  React.useEffect(() => {
    if (!visible || remainingMs > 0 || typeof window === "undefined") {
      return;
    }
    const storageKey = getStorageKeyForDate(now);
    const alreadyTriggered = window.localStorage.getItem(storageKey) === "1";
    if (alreadyTriggered) {
      return;
    }
    window.localStorage.setItem(storageKey, "1");
    setShowMessage(true);
    playAlarmSound();
  }, [now, remainingMs, visible]);

  const progressRatio = Math.min(1, Math.max(0, remainingMs / totalDurationRef.current));
  const circleRadius = 40;
  const circumference = 2 * Math.PI * circleRadius;
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

  if (!visible || !position) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fixed z-40 w-56 rounded-2xl border border-brand-200 bg-white/95 p-3 shadow-floating backdrop-blur"
        style={{ left: position.x, top: position.y, touchAction: "none" }}
      >
        <div
          className="mb-2 cursor-move rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          Time Timer ecole
        </div>

        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="h-20 w-20">
            <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={circleRadius}
              fill="none"
              stroke="#2563EB"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div>
            <p className="text-xs text-text-secondary">Jusqu&apos;a 07:40</p>
            <p className="font-mono text-lg font-bold text-text-primary">{formatDuration(remainingSeconds)}</p>
          </div>
        </div>
      </div>

      {showMessage ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto w-full max-w-xl rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-floating">
          <p className="text-sm font-semibold text-orange-900">{ALARM_TEXT}</p>
          <div className="mt-3">
            <Button size="sm" onClick={() => setShowMessage(false)}>
              OK
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
