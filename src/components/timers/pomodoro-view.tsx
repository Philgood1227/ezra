"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ds";
import { CircularTimer } from "@/components/timers/circular-timer";
import { cn } from "@/lib/utils";

type PomodoroPhase = "work" | "break";

interface PomodoroViewProps {
  workMinutes: number;
  breakMinutes: number;
  cycles?: number;
  onMissionFinished?: (focusedMinutes: number) => void;
  className?: string;
}

export function PomodoroView({
  workMinutes,
  breakMinutes,
  cycles = 3,
  onMissionFinished,
  className,
}: PomodoroViewProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const workSeconds = Math.max(60, Math.round(workMinutes * 60));
  const breakSeconds = Math.max(30, Math.round(breakMinutes * 60));
  const safeCycles = Math.max(1, cycles);
  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [cycleIndex, setCycleIndex] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isMissionDone, setIsMissionDone] = useState(false);
  const [completedWorkSeconds, setCompletedWorkSeconds] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    setPhase("work");
    setCycleIndex(1);
    setIsRunning(false);
    setIsMissionDone(false);
    setCompletedWorkSeconds(0);
    setResetVersion((version) => version + 1);
  }, [breakSeconds, safeCycles, workSeconds]);

  const durationSeconds = phase === "work" ? workSeconds : breakSeconds;
  const phaseLabel = phase === "work" ? `Mission travail ${cycleIndex}/${safeCycles}` : `Pause ${cycleIndex}/${safeCycles}`;
  const colorClass = phase === "work" ? "stroke-brand-primary" : "stroke-brand-secondary";

  const focusedMinutes = useMemo(() => Math.max(1, Math.round(completedWorkSeconds / 60)), [completedWorkSeconds]);

  function completeMission(): void {
    if (isMissionDone) {
      return;
    }

    setIsMissionDone(true);
    setIsRunning(false);
    onMissionFinished?.(Math.max(1, Math.round(completedWorkSeconds / 60)));
  }

  function handlePhaseFinished(): void {
    if (phase === "work") {
      const nextCompletedWorkSeconds = completedWorkSeconds + workSeconds;
      setCompletedWorkSeconds(nextCompletedWorkSeconds);

      if (cycleIndex >= safeCycles) {
        setIsMissionDone(true);
        setIsRunning(false);
        onMissionFinished?.(Math.max(1, Math.round(nextCompletedWorkSeconds / 60)));
        return;
      }

      setPhase("break");
      setIsRunning(true);
      setResetVersion((version) => version + 1);
      return;
    }

    setPhase("work");
    setCycleIndex((currentCycle) => Math.min(safeCycles, currentCycle + 1));
    setIsRunning(true);
    setResetVersion((version) => version + 1);
  }

  return (
    <section className={cn("space-y-4", className)}>
      <AnimatePresence mode="wait">
        <motion.p
          key={`${phase}-${cycleIndex}-${isMissionDone ? "done" : "active"}`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: "easeOut" }}
          className="text-center text-lg font-black text-text-primary"
        >
          {isMissionDone ? `Mission terminee en ${focusedMinutes} min` : phaseLabel}
        </motion.p>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: safeCycles }).map((_, index) => {
          const dotIndex = index + 1;
          const isCompleted = dotIndex < cycleIndex || (isMissionDone && dotIndex <= cycleIndex);
          const isActive = !isMissionDone && dotIndex === cycleIndex;

          return (
            <span
              key={dotIndex}
              className={cn(
                "size-2.5 rounded-radius-pill border transition-colors duration-200",
                isCompleted ? "border-brand-secondary bg-brand-secondary" : "border-border-default bg-bg-surface",
                isActive ? "ring-2 ring-brand-primary/30" : "",
              )}
              aria-hidden="true"
            />
          );
        })}
      </div>

      <CircularTimer
        durationSeconds={durationSeconds}
        isRunning={isRunning && !isMissionDone}
        onFinished={handlePhaseFinished}
        colorClass={colorClass}
        resetKey={`${phase}-${cycleIndex}-${resetVersion}`}
      />

      <div className="flex flex-wrap justify-center gap-2">
        {!isMissionDone ? (
          <Button size="lg" variant={isRunning ? "secondary" : "primary"} onClick={() => setIsRunning((value) => !value)}>
            {isRunning ? "Pause" : "Demarrer"}
          </Button>
        ) : null}
        {!isMissionDone && phase === "break" ? (
          <Button
            size="lg"
            variant="tertiary"
            onClick={() => {
              setPhase("work");
              setCycleIndex((currentCycle) => Math.min(safeCycles, currentCycle + 1));
              setIsRunning(true);
              setResetVersion((version) => version + 1);
            }}
          >
            Passer la pause
          </Button>
        ) : null}
        <Button size="lg" variant="ghost" onClick={completeMission}>
          Terminer la mission
        </Button>
      </div>
    </section>
  );
}
