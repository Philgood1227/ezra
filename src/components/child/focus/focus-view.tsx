"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getActivityVisual } from "@/components/child/icons/child-premium-icons";
import { FocusInstructionsSections } from "@/components/child/focus/focus-instructions-sections";
import { Badge, Button, CategoryIcon } from "@/components/ds";
import { useToast } from "@/components/ds/toast";
import { CircularTimer } from "@/components/timers/circular-timer";
import { PomodoroView } from "@/components/timers/pomodoro-view";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";

interface FocusViewProps {
  instance: TaskInstanceSummary;
  presentation?: "page" | "overlay";
  isTaskPaused?: boolean;
  onClose?: () => void;
  onSessionComplete?: (focusedMinutes: number) => void;
  calmPomodoroOnly?: boolean;
}

type FocusMode = "timer" | "pomodoro";

interface PomodoroPreset {
  key: string;
  workMinutes: number;
  breakMinutes: number;
}

const TIMER_PRESETS = [5, 10, 15, 20];
const POMODORO_PRESETS: PomodoroPreset[] = [
  { key: "10-5", workMinutes: 10, breakMinutes: 5 },
  { key: "15-5", workMinutes: 15, breakMinutes: 5 },
  { key: "20-5", workMinutes: 20, breakMinutes: 5 },
];
const DEFAULT_POMODORO_PRESET = POMODORO_PRESETS[0] ?? {
  key: "10-5",
  workMinutes: 10,
  breakMinutes: 5,
};
const CALM_POMODORO_PRESET =
  POMODORO_PRESETS.find((preset) => preset.workMinutes === 20 && preset.breakMinutes === 5) ??
  DEFAULT_POMODORO_PRESET;

function getGradientClass(hour: number): string {
  if (hour >= 6 && hour < 12) {
    return "from-accent-warm/22 via-brand-primary/14 to-bg-base";
  }

  if (hour >= 12 && hour < 18) {
    return "from-brand-secondary/18 via-brand-primary/16 to-bg-base";
  }

  if (hour >= 18 && hour < 22) {
    return "from-category-sommeil/20 via-brand-primary/18 to-bg-base";
  }

  return "from-bg-elevated via-brand-primary/14 to-bg-base";
}

export function FocusView({
  instance,
  presentation = "page",
  isTaskPaused = false,
  onClose,
  onSessionComplete,
  calmPomodoroOnly = false,
}: FocusViewProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { date } = useCurrentTime(undefined, 60_000);
  const [mode, setMode] = useState<FocusMode>(calmPomodoroOnly ? "pomodoro" : "timer");
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(10);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerResetVersion, setTimerResetVersion] = useState(0);
  const [selectedPomodoroPreset, setSelectedPomodoroPreset] = useState<PomodoroPreset>(
    calmPomodoroOnly ? CALM_POMODORO_PRESET : DEFAULT_POMODORO_PRESET,
  );
  const [pomodoroResetVersion, setPomodoroResetVersion] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  const isOverlay = presentation === "overlay";
  const gradientClass = useMemo(() => getGradientClass(date.getHours()), [date]);
  const categoryVisual = getActivityVisual(instance.category.colorKey);

  useEffect(() => {
    if (!isTaskPaused) {
      return;
    }

    // Freeze currently active timers when the task is paused from the task card.
    setTimerRunning(false);
    if (mode === "pomodoro") {
      setPomodoroResetVersion((current) => current + 1);
    }
  }, [isTaskPaused, mode]);

  useEffect(() => {
    if (!calmPomodoroOnly) {
      return;
    }

    setMode("pomodoro");
    setSelectedPomodoroPreset(CALM_POMODORO_PRESET);
  }, [calmPomodoroOnly]);

  const closeAndRefreshPage = useCallback(() => {
    if (isOverlay) {
      onClose?.();
      return;
    }

    router.push("/child/my-day");
  }, [isOverlay, onClose, router]);

  const handleSessionCompleted = useCallback(
    (focusedMinutes: number) => {
      haptic("success");

      if (isOverlay) {
        onSessionComplete?.(focusedMinutes);
        return;
      }

      setSessionMinutes(focusedMinutes);
    },
    [isOverlay, onSessionComplete],
  );

  async function handleCompleteTask(): Promise<void> {
    if (isCompletingTask) {
      return;
    }

    if (!isOnline()) {
      toast.error("Mode hors-ligne active, validation indisponible.");
      return;
    }

    setIsCompletingTask(true);
    const result = await updateTaskStatusAction({ instanceId: instance.id, newStatus: "termine" });
    if (!result.success) {
      haptic("error");
      toast.error("Erreur lors de la validation de la tache.");
      setIsCompletingTask(false);
      return;
    }

    haptic("success");
    toast.success("Tache terminee, bravo !");
    setIsCompletingTask(false);
    closeAndRefreshPage();
    router.refresh();
  }

  return (
    <section
      className={cn(
        isOverlay ? "px-1 pb-1 pt-1" : "min-h-[100dvh] bg-gradient-to-b px-4 pb-8 pt-4 md:px-6",
        !isOverlay ? gradientClass : "",
      )}
      data-testid="focus-view-root"
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-5",
          isOverlay ? "max-w-3xl" : "max-w-[920px]",
        )}
      >
        <header className="mission-panel-surface space-y-4 p-4 md:p-5" data-testid="focus-view-header">
          {!isOverlay ? (
            <div className="flex items-start justify-between gap-3">
              <Button size="md" variant="tertiary" onClick={closeAndRefreshPage}>
                Retour
              </Button>
              <div className="rounded-radius-pill border border-border-subtle bg-bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Mode Focus
              </div>
            </div>
          ) : null}

          <div className={cn("space-y-3", isOverlay ? "text-left" : "text-center")}>
            <div className={cn("flex items-center gap-3", isOverlay ? "justify-start" : "justify-center")}>
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-button border",
                  categoryVisual.borderClass,
                  categoryVisual.softClass,
                  categoryVisual.iconToneClass,
                )}
              >
                <CategoryIcon iconKey={instance.category.icon} className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  {instance.category.name}
                </p>
                <h1
                  className={cn(
                    "font-display font-black tracking-tight text-text-primary",
                    isOverlay ? "text-2xl" : "text-3xl md:text-4xl",
                  )}
                >
                  {instance.title}
                </h1>
              </div>
            </div>

            <div className={cn("flex flex-wrap gap-2", isOverlay ? "" : "justify-center")}>
              <Badge variant="neutral">{instance.estimatedMinutes} min</Badge>
              <Badge variant="info">+{instance.pointsBase} pts</Badge>
            </div>
          </div>

          {isTaskPaused ? (
            <p className="text-base font-semibold text-status-warning">
              Tache en pause. Reprends pour demarrer le timer.
            </p>
          ) : null}
        </header>

        <section
          className="mission-panel-surface focus-timer-stage space-y-4 p-4 md:p-6"
          data-testid="focus-timer-stage"
        >
          {!calmPomodoroOnly ? (
            <div className={cn("flex flex-wrap gap-2", isOverlay ? "" : "justify-center")}>
              <Button
                size="lg"
                variant={mode === "timer" ? "secondary" : "tertiary"}
                onClick={() => {
                  setMode("timer");
                  setSessionMinutes(null);
                }}
                disabled={isTaskPaused}
              >
                Timer simple
              </Button>
              <Button
                size="lg"
                variant={mode === "pomodoro" ? "secondary" : "tertiary"}
                onClick={() => {
                  setMode("pomodoro");
                  setSessionMinutes(null);
                }}
                disabled={isTaskPaused}
              >
                Pomodoro
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-radius-pill border border-border-subtle bg-bg-surface px-3 py-1 text-sm font-semibold text-text-secondary",
                isOverlay ? "inline-flex" : "mx-auto inline-flex",
              )}
            >
              Pomodoro 20 / 5
            </div>
          )}

          {mode === "timer" && !calmPomodoroOnly ? (
            <div className="space-y-5">
              <div className={cn("flex flex-wrap gap-2", isOverlay ? "" : "justify-center")}>
                {TIMER_PRESETS.map((minutes) => (
                  <Button
                    key={minutes}
                    size="lg"
                    variant={timerPresetMinutes === minutes ? "secondary" : "tertiary"}
                    onClick={() => {
                      setTimerPresetMinutes(minutes);
                      setTimerRunning(false);
                      setSessionMinutes(null);
                      setTimerResetVersion((current) => current + 1);
                    }}
                    disabled={isTaskPaused}
                  >
                    {minutes} min
                  </Button>
                ))}
              </div>

              <CircularTimer
                className="mx-auto w-full max-w-[420px] border-border-default bg-bg-elevated shadow-elevated"
                durationSeconds={timerPresetMinutes * 60}
                isRunning={timerRunning}
                onFinished={() => {
                  setTimerRunning(false);
                  handleSessionCompleted(timerPresetMinutes);
                }}
                resetKey={`timer-${timerPresetMinutes}-${timerResetVersion}`}
              />

              <div
                className={cn("flex flex-wrap gap-2", isOverlay ? "" : "justify-center")}
                data-testid="focus-action-shelf"
              >
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setTimerRunning((current) => !current)}
                  disabled={isTaskPaused}
                >
                  {timerRunning ? "Pause" : "Demarrer"}
                </Button>
                <Button
                  size="lg"
                  variant="tertiary"
                  onClick={() => {
                    setTimerRunning(false);
                    setSessionMinutes(null);
                    setTimerResetVersion((current) => current + 1);
                  }}
                >
                  Reinitialiser
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!calmPomodoroOnly ? (
                <div className={cn("flex flex-wrap gap-2", isOverlay ? "" : "justify-center")}>
                  {POMODORO_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      size="lg"
                      variant={selectedPomodoroPreset.key === preset.key ? "secondary" : "tertiary"}
                      onClick={() => {
                        setSelectedPomodoroPreset(preset);
                        setSessionMinutes(null);
                      }}
                      disabled={isTaskPaused}
                    >
                      Pomodoro {preset.workMinutes}/{preset.breakMinutes}
                    </Button>
                  ))}
                </div>
              ) : (
                <p
                  className={cn(
                    "reading text-base leading-relaxed text-text-secondary",
                    isOverlay ? "" : "text-center",
                  )}
                >
                  Cycle doux: 20 min de focus puis 5 min de pause.
                </p>
              )}

              <fieldset disabled={isTaskPaused} className="contents">
                <PomodoroView
                  className="focus-pomodoro-stage"
                  key={`pomodoro-${selectedPomodoroPreset.key}-${pomodoroResetVersion}`}
                  workMinutes={selectedPomodoroPreset.workMinutes}
                  breakMinutes={selectedPomodoroPreset.breakMinutes}
                  onMissionFinished={(minutes) => {
                    handleSessionCompleted(minutes);
                  }}
                />
              </fieldset>
            </div>
          )}
        </section>

        <div
          className={cn(isOverlay ? "max-h-[36vh] overflow-y-auto pr-1" : "")}
          data-testid="focus-instructions-scroll"
        >
          <FocusInstructionsSections instructionsHtml={instance.instructionsHtml} />
        </div>

        {sessionMinutes && !isOverlay ? (
          <div className="mission-panel-surface border-status-success/30 bg-status-success/10 p-4 text-center">
            <p className="text-base font-black text-status-success">
              Bravo ! Tu as tenu {sessionMinutes} minutes.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={handleCompleteTask} loading={isCompletingTask}>
                Terminer la tache
              </Button>
              <Button size="lg" variant="secondary" onClick={closeAndRefreshPage}>
                Continuer sans terminer
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
