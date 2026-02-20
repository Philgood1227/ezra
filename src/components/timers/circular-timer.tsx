"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CircularTimerProps {
  durationSeconds: number;
  isRunning: boolean;
  onFinished: () => void;
  colorClass?: string;
  className?: string;
  onRemainingChange?: (remainingSeconds: number) => void;
  resetKey?: string | number;
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function buildAriaLabel(remainingSeconds: number): string {
  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.max(0, remainingSeconds) % 60;
  return `Minuteur : ${minutes} minute${minutes > 1 ? "s" : ""} ${seconds} seconde${seconds > 1 ? "s" : ""} restantes`;
}

export function CircularTimer({
  durationSeconds,
  isRunning,
  onFinished,
  colorClass = "stroke-brand-primary",
  className,
  onRemainingChange,
  resetKey,
}: CircularTimerProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const safeDurationSeconds = Math.max(1, Math.round(durationSeconds));
  const [remainingSeconds, setRemainingSeconds] = useState(safeDurationSeconds);
  const [liveMessage, setLiveMessage] = useState("Minuteur pret.");
  const [finishCount, setFinishCount] = useState(0);
  const didFinishRef = useRef(false);
  const handledFinishCountRef = useRef(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    setRemainingSeconds(safeDurationSeconds);
    setLiveMessage("Minuteur pret.");
    didFinishRef.current = false;
  }, [safeDurationSeconds, resetKey]);

  useEffect(() => {
    onRemainingChange?.(remainingSeconds);
  }, [onRemainingChange, remainingSeconds]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);
          if (!didFinishRef.current) {
            didFinishRef.current = true;
            setFinishCount((count) => count + 1);
          }
          setLiveMessage("Minuteur termine.");
          return 0;
        }

        const nextSeconds = currentSeconds - 1;
        if (nextSeconds % 30 === 0 || nextSeconds <= 10) {
          setLiveMessage(buildAriaLabel(nextSeconds));
        }
        return nextSeconds;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (finishCount === 0 || handledFinishCountRef.current === finishCount) {
      return;
    }

    handledFinishCountRef.current = finishCount;
    onFinished();
  }, [finishCount, onFinished]);

  const progress = useMemo(() => remainingSeconds / safeDurationSeconds, [remainingSeconds, safeDurationSeconds]);
  const strokeDashoffset = useMemo(() => circumference * (1 - progress), [circumference, progress]);

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[320px] flex-col items-center gap-4 rounded-radius-card border border-border-subtle bg-bg-surface/80 p-4 shadow-card backdrop-blur-sm",
        className,
      )}
      aria-label={buildAriaLabel(remainingSeconds)}
    >
      <div className="relative grid place-items-center">
        <svg viewBox="0 0 120 120" className="size-[250px]" role="img" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} className="fill-none stroke-border-subtle" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            className={cn("fill-none", colorClass)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            style={{
              transition: prefersReducedMotion ? "none" : "stroke-dashoffset 400ms linear",
            }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="font-display text-5xl font-black tracking-tight text-text-primary">
            {formatTime(remainingSeconds)}
          </span>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>
    </section>
  );
}
