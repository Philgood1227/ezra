import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { WeatherIconKey } from "@/lib/weather/types";

interface WeatherHeroProps {
  icon: WeatherIconKey;
  tempC: number | null;
  feelsLikeC: number | null;
  summary: string | null;
  tempMinC?: number | null;
  tempMaxC?: number | null;
  subtitle?: string | null;
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "--";
  }
  return String(Math.round(value));
}

function formatMinMax(min: number, max: number): string {
  return `Min ${Math.round(min)}\u00B0 \u2022 Max ${Math.round(max)}\u00B0`;
}

export function WeatherHero({
  icon,
  tempC,
  feelsLikeC,
  summary,
  tempMinC,
  tempMaxC,
  subtitle,
}: WeatherHeroProps): React.JSX.Element {
  const hasMinMax = typeof tempMinC === "number" && typeof tempMaxC === "number";

  return (
    <div className="rounded-[1.2rem] border border-border-subtle bg-bg-surface/95 px-2.5 py-2 shadow-card">
      {subtitle ? <p className="text-section-title tracking-tight text-text-secondary">{subtitle}</p> : null}

      <div className="mt-1 flex items-start gap-2">
        <WeatherIcon iconKey={icon} alt="Meteo actuelle" className="size-12" />
        <div className="min-w-0">
          <p className="text-[2.45rem] font-black leading-none tracking-tight text-text-primary">{formatNumber(tempC)}°C</p>
          <p className="mt-0.5 text-[0.95rem] font-semibold leading-tight tracking-tight text-text-secondary">
            Ressenti {formatNumber(feelsLikeC)}°C
          </p>
          {summary ? <p className="text-card-title mt-1 tracking-tight text-text-primary">{summary}</p> : null}
        </div>
      </div>

      {hasMinMax ? (
        <div
          className="mt-1.5 border-t border-border-subtle/85 pt-1 text-xs font-semibold tracking-tight text-text-secondary"
          data-testid="weather-min-max-row"
        >
          {formatMinMax(tempMinC, tempMaxC)}
        </div>
      ) : null}
    </div>
  );
}
