import type * as React from "react";
import type { WeatherIconKey } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

interface WeatherIconProps {
  iconKey: WeatherIconKey;
  className?: string | undefined;
  alt?: string | undefined;
}

const WEATHER_ICON_FILE_MAP: Record<WeatherIconKey, string> = {
  clear: "wi_clear-day.svg",
  partly_cloudy: "wi_partly-cloudy-day.svg",
  cloudy: "wi_cloudy.svg",
  rain: "wi_rain.svg",
  drizzle: "wi_drizzle.svg",
  storm: "wi_thunderstorms.svg",
  snow: "wi_snow.svg",
  fog: "wi_fog.svg",
};

export function WeatherIcon({
  iconKey,
  className,
  alt = "Icone meteo",
}: WeatherIconProps): React.JSX.Element {
  const iconFileName = WEATHER_ICON_FILE_MAP[iconKey] ?? "wi_not-available.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static Meteocons SVG files under /public/icons/meteocons
    <img
      src={`/icons/meteocons/${iconFileName}`}
      alt={alt}
      className={cn("size-6 object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
