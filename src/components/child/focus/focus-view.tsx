"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import { CircularTimer } from "@/components/timers/circular-timer";
import { PomodoroView } from "@/components/timers/pomodoro-view";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import type { TaskInstanceSummary } from "@/lib/day-templates/types";
import { useCurrentTime } from "@/lib/hooks/useCurrentTime";
import { haptic } from "@/lib/utils/haptic";
import { isOnline } from "@/lib/utils/network";
import { useToast } from "@/components/ds/toast";
import { cn } from "@/lib/utils";

interface FocusViewProps {
  instance: TaskInstanceSummary;
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

export function FocusView({ instance }: FocusViewProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { date } = useCurrentTime(undefined, 60_000);
  const [mode, setMode] = useState<FocusMode>("timer");
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(10);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerResetVersion, setTimerResetVersion] = useState(0);
  const [selectedPomodoroPreset, setSelectedPomodoroPreset] = useState<PomodoroPreset>(
    POMODORO_PRESETS[0] ?? { key: "10-5", workMinutes: 10, breakMinutes: 5 },
  );
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  const gradientClass = useMemo(() => getGradientClass(date.getHours()), [date]);
  const heading = `${instance.category.icon} ${instance.title}`;

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
    router.push("/child/my-day");
    router.refresh();
  }

  return (
    <section className={cn("min-h-[100dvh] bg-gradient-to-b px-4 pb-8 pt-4 md:px-6", gradientClass)}>
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <Button size="md" variant="ghost" onClick={() => router.push("/child/my-day")}>
            Retour
          </Button>
          <div className="rounded-radius-pill border border-border-subtle bg-bg-surface/70 px-3 py-1 text-xs font-semibold text-text-secondary backdrop-blur-sm">
            Mode focus
          </div>
        </div>

        <header className="space-y-2 text-center">
          <h1 className="font-display text-3xl font-black tracking-tight text-text-primary md:text-4xl">{heading}</h1>
          <p className="text-base font-semibold text-text-secondary">Tu peux gagner {instance.pointsBase} points</p>
        </header>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="lg"
            variant={mode === "timer" ? "primary" : "secondary"}
            onClick={() => {
              setMode("timer");
              setSessionMinutes(null);
            }}
          >
            Timer simple
          </Button>
          <Button
            size="lg"
            variant={mode === "pomodoro" ? "primary" : "secondary"}
            onClick={() => {
              setMode("pomodoro");
              setSessionMinutes(null);
            }}
          >
            Pomodoro
          </Button>
        </div>

        {mode === "timer" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-center gap-2">
              {TIMER_PRESETS.map((minutes) => (
                <Button
                  key={minutes}
                  size="lg"
                  variant={timerPresetMinutes === minutes ? "primary" : "secondary"}
                  onClick={() => {
                    setTimerPresetMinutes(minutes);
                    setTimerRunning(false);
                    setSessionMinutes(null);
                    setTimerResetVersion((current) => current + 1);
                  }}
                >
                  {minutes} min
                </Button>
              ))}
            </div>

            <CircularTimer
              durationSeconds={timerPresetMinutes * 60}
              isRunning={timerRunning}
              onFinished={() => {
                setTimerRunning(false);
                setSessionMinutes(timerPresetMinutes);
                haptic("success");
              }}
              resetKey={`timer-${timerPresetMinutes}-${timerResetVersion}`}
            />

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                size="lg"
                variant={timerRunning ? "secondary" : "primary"}
                onClick={() => setTimerRunning((current) => !current)}
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
            <div className="flex flex-wrap justify-center gap-2">
              {POMODORO_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  size="lg"
                  variant={selectedPomodoroPreset.key === preset.key ? "primary" : "secondary"}
                  onClick={() => {
                    setSelectedPomodoroPreset(preset);
                    setSessionMinutes(null);
                  }}
                >
                  Pomodoro {preset.workMinutes}/{preset.breakMinutes}
                </Button>
              ))}
            </div>

            <PomodoroView
              workMinutes={selectedPomodoroPreset.workMinutes}
              breakMinutes={selectedPomodoroPreset.breakMinutes}
              onMissionFinished={(minutes) => {
                setSessionMinutes(minutes);
                haptic("success");
              }}
            />
          </div>
        )}

        {sessionMinutes ? (
          <div className="rounded-radius-card border border-status-success/30 bg-status-success/14 p-4 text-center shadow-card">
            <p className="text-base font-black text-status-success">Bravo ! Tu as tenu {sessionMinutes} minutes 🎉</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={handleCompleteTask} loading={isCompletingTask}>
                Terminer la tache
              </Button>
              <Button size="lg" variant="secondary" onClick={() => router.push("/child/my-day")}>
                Continuer sans terminer
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
