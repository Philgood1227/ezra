import { SunCycle } from "@/components/weather/SunCycle";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { getDayFromWeatherWeek, type WeatherWeekUI } from "@/lib/weather/types";

interface WeatherPanelProps {
  weatherWeek: WeatherWeekUI;
  selectedDateISO: string;
}

function formatCurrentTime(timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function hasRenderableSun(day: ReturnType<typeof getDayFromWeatherWeek>): boolean {
  if (!day?.sun) {
    return false;
  }
  if (day.sun.sunriseLabel === "--:--" || day.sun.sunsetLabel === "--:--") {
    return false;
  }
  return true;
}

export function WeatherPanel({ weatherWeek, selectedDateISO }: WeatherPanelProps): React.JSX.Element {
  const day = getDayFromWeatherWeek(weatherWeek, selectedDateISO);
  const subtitle = `Maintenant \u00B7 ${formatCurrentTime(weatherWeek.location.timezone)}`;
  const showSunCycle = weatherWeek.dataState === "ok" && hasRenderableSun(day);
  const minC = day?.minC ?? weatherWeek.now.tempMinC;
  const maxC = day?.maxC ?? weatherWeek.now.tempMaxC;

  return (
    <div
      className="h-full w-full rounded-radius-card border border-border-subtle bg-bg-surface/90 p-2 shadow-glass backdrop-blur-sm md:w-[clamp(260px,26vw,340px)]"
      data-testid="weather-panel"
      data-weather-state={weatherWeek.dataState}
    >
      <div className={showSunCycle ? "grid gap-2 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : undefined}>
        <WeatherHero
          subtitle={subtitle}
          icon={weatherWeek.now.icon}
          tempC={weatherWeek.now.tempC}
          feelsLikeC={weatherWeek.now.feelsLikeC}
          summary={weatherWeek.now.summary}
          tempMinC={minC}
          tempMaxC={maxC}
        />

        {showSunCycle ? (
          <div data-testid="weather-sun-cycle">
            <SunCycle cycle={day!.sun!} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
