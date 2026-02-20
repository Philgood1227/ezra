import { ProgressBar } from "@/components/ds";

interface DailyProgressBarProps {
  pointsEarned: number;
  pointsTarget: number;
  tasksCompleted: number;
  tasksTotal: number;
}

export function DailyProgressBar({
  pointsEarned,
  pointsTarget,
  tasksCompleted,
  tasksTotal,
}: DailyProgressBarProps): React.JSX.Element {
  const safeTarget = Math.max(1, pointsTarget);
  const tasksLabel = tasksTotal === 0 ? "Aucune tache" : `${tasksCompleted}/${Math.max(0, tasksTotal)} taches`;

  return (
    <section className="rounded-radius-card border border-border-subtle bg-bg-surface/80 px-4 py-3 shadow-card backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base font-bold text-text-primary">Points du jour : {pointsEarned}/{safeTarget} pts</p>
        <div className="min-w-[180px] flex-1">
          <ProgressBar value={pointsEarned} max={safeTarget} variant="accent-warm" />
        </div>
        <p className="text-sm font-semibold text-text-secondary">{tasksLabel}</p>
      </div>
    </section>
  );
}
