"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { getActivityVisual } from "@/components/child/icons/child-premium-icons";
import { FocusInstructionsSections } from "@/components/child/focus/focus-instructions-sections";
import { Badge, Button, CategoryIcon } from "@/components/ds";
import { cn } from "@/lib/utils";
import { MISSION_TIMER_PRESETS, type MissionMicroStep, type MissionUI } from "./types";

interface FocusModeMissionProps {
  open: boolean;
  mission: MissionUI | null;
  onClose: () => void;
  onComplete: (missionId: string) => void | Promise<void>;
  onPauseMission?: (missionId: string) => void | Promise<void>;
}

const TIMER_SIZE = 420;
const TIMER_CENTER = TIMER_SIZE / 2;
const TIMER_RADIUS = 178;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function formatSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function pickNearestPreset(minutes: number): number {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.trunc(minutes)) : 15;

  return [...MISSION_TIMER_PRESETS].sort((left, right) => {
    const leftDelta = Math.abs(left - safeMinutes);
    const rightDelta = Math.abs(right - safeMinutes);

    if (leftDelta !== rightDelta) {
      return leftDelta - rightDelta;
    }

    return left - right;
  })[0] ?? 15;
}

function FocusTimerRing({
  ratio,
  label,
  points,
}: {
  ratio: number;
  label: string;
  points: number;
}): React.JSX.Element {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const strokeOffset = TIMER_CIRCUMFERENCE * (1 - clampedRatio);

  return (
    <div className="relative mx-auto grid aspect-square w-[min(88vw,34rem)] place-items-center">
      <svg
        className="h-full w-full -rotate-90 drop-shadow-xl"
        viewBox={`0 0 ${TIMER_SIZE} ${TIMER_SIZE}`}
        aria-hidden="true"
        data-testid="focus-timer-svg"
      >
        <defs>
          <linearGradient id="focusTimerProgress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--color-primary))" />
            <stop offset="70%" stopColor="rgb(var(--color-secondary))" />
            <stop offset="100%" stopColor="rgb(var(--color-accent-warm))" />
          </linearGradient>
        </defs>
        <circle
          cx={TIMER_CENTER}
          cy={TIMER_CENTER}
          r={TIMER_RADIUS}
          fill="none"
          stroke="rgb(var(--color-border-default))"
          strokeWidth="14"
        />
        <circle
          cx={TIMER_CENTER}
          cy={TIMER_CENTER}
          r={TIMER_RADIUS}
          fill="none"
          stroke="url(#focusTimerProgress)"
          strokeLinecap="round"
          strokeWidth="14"
          strokeDasharray={TIMER_CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
          style={{ transition: "stroke-dashoffset 240ms ease-out" }}
        />
      </svg>

      <div className="absolute inset-[14px] grid place-items-center rounded-full border border-border-subtle bg-bg-surface shadow-inner">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Temps restant
          </p>
          <p
            className="mt-2 font-display text-[clamp(3rem,8.2vw,5.6rem)] font-black leading-none tracking-tight text-text-primary"
            data-testid="focus-timer-value"
          >
            {label}
          </p>
          <Badge variant="info" className="mt-4 inline-flex px-3 py-1 text-sm font-semibold">
            +{points} pts
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function FocusModeMission({
  open,
  mission,
  onClose,
  onComplete,
  onPauseMission,
}: FocusModeMissionProps): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = React.useState(false);
  const [presetMinutes, setPresetMinutes] = React.useState<number>(15);
  const [remainingSeconds, setRemainingSeconds] = React.useState<number>(15 * 60);
  const [isRunning, setIsRunning] = React.useState(false);
  const [steps, setSteps] = React.useState<MissionMicroStep[]>([]);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateLayout = (): void => {
      setIsDesktopLayout(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  React.useEffect(() => {
    if (!open || !mission) {
      return;
    }

    const nextPreset = pickNearestPreset(mission.estimatedMinutes);
    setPresetMinutes(nextPreset);
    setRemainingSeconds(nextPreset * 60);
    setIsRunning(false);
    setSteps(mission.microSteps);
    setIsCompleting(false);
  }, [open, mission]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      if (lastFocusedElementRef.current) {
        lastFocusedElementRef.current.focus();
        lastFocusedElementRef.current = null;
      }
      return;
    }

    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    const focusTimeout = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(focusTimeout);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRunning, open]);

  const totalSeconds = Math.max(1, presetMinutes * 60);
  const progressRatio = Math.max(0, Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds));
  const timerLabel = formatSeconds(remainingSeconds);
  const categoryVisual = getActivityVisual(mission?.colorKey);

  if (!mounted) {
    return null;
  }

  async function handleFinish(): Promise<void> {
    if (!mission || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setIsRunning(false);

    try {
      await onComplete(mission.id);
    } finally {
      setIsCompleting(false);
    }
  }

  function resetTimer(): void {
    setIsRunning(false);
    setRemainingSeconds(presetMinutes * 60);
  }

  function renderControlButtons(buttonSize: "md" | "lg"): React.JSX.Element {
    if (!mission) {
      return <></>;
    }

    return (
      <>
        <Button
          size={buttonSize}
          variant="secondary"
          onClick={() => setIsRunning((current) => !current)}
          disabled={remainingSeconds === 0}
        >
          {isRunning ? "Pause" : "Demarrer"}
        </Button>
        <Button size={buttonSize} variant="tertiary" onClick={resetTimer}>
          Reinitialiser
        </Button>
        {onPauseMission ? (
          <Button
            size={buttonSize}
            variant="secondary"
            onClick={() => void onPauseMission(mission.id)}
          >
            Mettre en pause
          </Button>
        ) : null}
      </>
    );
  }

  return createPortal(
    <AnimatePresence>
      {open && mission ? (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label={`Mode Focus ${mission.title}`}
          className="mission-focus-shell fixed inset-0 z-[76] overflow-y-auto"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="mission-focus-mode"
        >
          <div
            className={cn(
              "mx-auto flex min-h-full w-full max-w-[1480px] flex-col px-3 pt-3 md:px-6 md:pt-4",
              isDesktopLayout ? "pb-6" : "pb-[calc(8.5rem+env(safe-area-inset-bottom))]",
            )}
          >
            <header
              className="mission-panel-surface sticky top-3 z-20 flex items-center justify-between gap-3 px-4 py-3 md:px-5"
              data-testid="focus-mode-header"
            >
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex min-h-touch-sm items-center justify-center rounded-radius-pill border border-border-default bg-bg-elevated px-3.5 text-sm font-semibold text-text-secondary transition-colors duration-200 hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                onClick={onClose}
              >
                Retour
              </button>

              <p className="rounded-radius-pill border border-border-default bg-bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Mode Focus
              </p>
            </header>

            <div className="mt-4 grid flex-1 gap-4 md:min-h-0 md:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] md:items-start">
              <main className="flex min-h-0 flex-col gap-4">
                <section className="mission-panel-surface p-5 md:p-6">
                  <div className="space-y-3 text-center md:text-left">
                    <div className="flex items-center justify-center gap-3 md:justify-start">
                      <span
                        className={cn(
                          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-button border",
                          categoryVisual.borderClass,
                          categoryVisual.softClass,
                          categoryVisual.iconToneClass,
                        )}
                      >
                        <CategoryIcon iconKey={mission.iconKey} className="size-6" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          {mission.categoryName ?? "Mission"}
                        </p>
                        <h1 className="font-display text-[clamp(2rem,3.5vw,3.15rem)] font-black tracking-tight text-text-primary">
                          {mission.title}
                        </h1>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                      <Badge variant="neutral">{mission.estimatedMinutes} min</Badge>
                      <Badge variant="info">+{mission.points} pts</Badge>
                    </div>
                  </div>
                </section>

                <section
                  className="mission-panel-surface focus-timer-stage p-5 md:p-6"
                  data-testid="focus-timer-stage"
                >
                  <FocusTimerRing ratio={progressRatio} label={timerLabel} points={mission.points} />

                  <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                    {MISSION_TIMER_PRESETS.map((preset) => (
                      <Button
                        key={preset}
                        size="sm"
                        variant={presetMinutes === preset ? "secondary" : "tertiary"}
                        className="rounded-radius-pill"
                        onClick={() => {
                          setPresetMinutes(preset);
                          setIsRunning(false);
                          setRemainingSeconds(preset * 60);
                        }}
                      >
                        {preset} min
                      </Button>
                    ))}
                  </div>

                  {isDesktopLayout ? (
                    <div
                      className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start"
                      data-testid="focus-action-shelf"
                    >
                      {renderControlButtons("md")}
                    </div>
                  ) : null}
                </section>

                {steps.length > 0 ? (
                  <section className="mission-panel-surface p-4 md:p-5">
                    <h2 className="font-display text-xl font-black tracking-tight text-text-primary">
                      Micro-etapes
                    </h2>
                    <ul className="mt-3 space-y-2.5">
                      {steps.map((step) => (
                        <li key={step.id}>
                          <button
                            type="button"
                            className="flex min-h-touch-sm w-full items-center gap-2 rounded-radius-button border border-border-subtle bg-bg-surface px-3 py-2 text-left"
                            onClick={() => {
                              setSteps((current) =>
                                current.map((entry) =>
                                  entry.id === step.id ? { ...entry, done: !entry.done } : entry,
                                ),
                              );
                            }}
                          >
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-radius-pill border text-sm",
                                step.done
                                  ? "border-status-success/35 bg-status-success/20 text-status-success"
                                  : "border-border-default text-text-secondary",
                              )}
                            >
                              {step.done ? "v" : "o"}
                            </span>
                            <span
                              className={cn(
                                "text-base font-medium text-text-primary",
                                step.done && "line-through opacity-70",
                              )}
                            >
                              {step.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {!isDesktopLayout ? (
                  <section className="space-y-3">
                    <FocusInstructionsSections instructionsHtml={mission.instructionsHtml} />
                    {mission.helpLinks.length > 0 ? (
                      <div className="mission-panel-surface p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          Fiches de revision
                        </h3>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {mission.helpLinks.slice(0, 3).map((link) => (
                            <a
                              key={link.id}
                              href={link.href}
                              className="inline-flex min-h-touch-sm items-center rounded-radius-pill border border-brand-primary/18 bg-brand-50 px-3 text-sm font-semibold text-brand-primary"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {isDesktopLayout ? (
                  <section className="mission-panel-surface focus-action-shelf p-4">
                    <Button
                      size="lg"
                      className="w-full font-black"
                      onClick={() => void handleFinish()}
                      loading={isCompleting}
                    >
                      J&apos;ai fini
                    </Button>
                  </section>
                ) : null}
              </main>

              {isDesktopLayout ? (
                <aside className="mission-panel-surface sticky top-[6.25rem] flex max-h-[calc(100dvh-7rem)] min-h-[26rem] flex-col overflow-hidden p-4">
                  <div className="flex-1 overflow-y-auto pr-1">
                    <FocusInstructionsSections instructionsHtml={mission.instructionsHtml} />
                  </div>

                  {mission.helpLinks.length > 0 ? (
                    <div className="mt-3 border-t border-border-subtle pt-3">
                      <h3 className="text-lg font-bold text-text-primary">Fiches de revision</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mission.helpLinks.slice(0, 3).map((link) => (
                          <a
                            key={link.id}
                            href={link.href}
                            className="inline-flex min-h-touch-sm items-center rounded-radius-pill border border-brand-primary/18 bg-brand-50 px-3 text-sm font-semibold text-brand-primary"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </div>

          {!isDesktopLayout ? (
            <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[77]">
              <section className="mission-panel-surface focus-action-shelf p-3" data-testid="focus-action-shelf">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{renderControlButtons("md")}</div>
                <Button
                  size="lg"
                  className="mt-2 w-full font-black"
                  onClick={() => void handleFinish()}
                  loading={isCompleting}
                >
                  J&apos;ai fini
                </Button>
              </section>
            </div>
          ) : null}
        </motion.section>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
