import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { SunCycleUI } from "@/lib/weather/types";

interface SunCycleProps {
  cycle: SunCycleUI;
}

function formatDayDuration(cycle: SunCycleUI): string {
  const totalSeconds = Math.max(cycle.sunsetTs - cycle.sunriseTs, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `+ ${hours}h ${String(minutes).padStart(2, "0")}m de jour`;
}

export function SunCycle({ cycle }: SunCycleProps): React.JSX.Element {
  return (
    <div className="rounded-[1.35rem] border border-border-subtle bg-bg-surface px-3 py-2 shadow-card">
      <p className="text-card-title tracking-tight text-text-primary">Cycle du jour</p>

      <div className="mt-2 px-1.5">
        <div className="relative">
          <div className="h-2.5 rounded-radius-pill bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400" />
          <span
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-radius-pill border-2 border-bg-surface bg-brand-100 shadow-card"
            style={{ left: `${Math.round(cycle.dayProgress * 100)}%` }}
            aria-hidden="true"
          />
          <span
            className="absolute -top-7 -translate-x-1/2"
            style={{ left: `${Math.round(cycle.dayProgress * 100)}%` }}
            aria-hidden="true"
          >
            <WeatherIcon iconKey="clear" alt="" className="size-6" />
          </span>
          <span className="absolute -left-5 top-1/2 -translate-y-1/2" aria-hidden="true">
            <WeatherIcon iconKey="partly_cloudy" alt="" className="size-5" />
          </span>
          <span className="absolute -right-5 top-1/2 -translate-y-1/2" aria-hidden="true">
            <WeatherIcon iconKey="partly_cloudy" alt="" className="size-5" />
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[0.82rem] font-semibold text-text-secondary">
        <span className="rounded-radius-pill border border-border-subtle bg-bg-surface px-2.5 py-0.5">
          Lever {cycle.sunriseLabel}
        </span>
        <span className="text-center">{formatDayDuration(cycle)}</span>
        <span className="rounded-radius-pill border border-border-subtle bg-bg-surface px-2.5 py-0.5">
          Coucher {cycle.sunsetLabel}
        </span>
      </div>
    </div>
  );
}
