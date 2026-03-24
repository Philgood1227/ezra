import { describe, expect, it } from "vitest";
import {
  aggregateHourlyToBuckets,
  buildSunCycleUI,
  precipLevelFromPop,
} from "@/lib/weather/forecast-aggregation";
import type { OpenWeatherHourlyNormalized } from "@/lib/weather/openweathermap";
import { WEATHER_BUCKET_DEFINITIONS } from "@/lib/weather/types";

const TZ_OFFSET_SEC = 3600; // Europe/Zurich (winter)
const DAY_START_TS = Math.floor(new Date("2026-02-23T23:00:00Z").getTime() / 1000); // 2026-02-24 00:00 local

function createHourlyEntry(input: {
  localHour: number;
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  popPct: number;
  weatherId: number;
  summary: string;
}): OpenWeatherHourlyNormalized {
  return {
    timestampTs: DAY_START_TS + input.localHour * 3600,
    tempC: input.tempC,
    feelsLikeC: input.feelsLikeC,
    windKph: input.windKph,
    popPct: input.popPct,
    weatherId: input.weatherId,
    summary: input.summary,
  };
}

describe("forecast aggregation", () => {
  it("maps precipitation boundaries correctly", () => {
    expect(precipLevelFromPop(19)).toBe("none");
    expect(precipLevelFromPop(20)).toBe("light");
    expect(precipLevelFromPop(49)).toBe("light");
    expect(precipLevelFromPop(50)).toBe("rain");
    expect(precipLevelFromPop(79)).toBe("rain");
    expect(precipLevelFromPop(80)).toBe("heavy");
  });

  it("aggregates hourly samples into Matin/Midi/Apres-midi/Maison/Soir buckets", () => {
    const hourly: OpenWeatherHourlyNormalized[] = [
      createHourlyEntry({
        localHour: 6,
        tempC: 6,
        feelsLikeC: 5,
        windKph: 10,
        popPct: 10,
        weatherId: 800,
        summary: "clair",
      }),
      createHourlyEntry({
        localHour: 12,
        tempC: 8,
        feelsLikeC: 7,
        windKph: 11,
        popPct: 35,
        weatherId: 801,
        summary: "nuageux",
      }),
      createHourlyEntry({
        localHour: 14,
        tempC: 10,
        feelsLikeC: 9,
        windKph: 14,
        popPct: 65,
        weatherId: 501,
        summary: "pluie moderee",
      }),
      createHourlyEntry({
        localHour: 18,
        tempC: 9,
        feelsLikeC: 8,
        windKph: 16,
        popPct: 90,
        weatherId: 502,
        summary: "forte pluie",
      }),
      createHourlyEntry({
        localHour: 20,
        tempC: 5,
        feelsLikeC: 4,
        windKph: 9,
        popPct: 5,
        weatherId: 803,
        summary: "couvert",
      }),
    ];

    const buckets = aggregateHourlyToBuckets(hourly, DAY_START_TS, TZ_OFFSET_SEC);

    expect(buckets).toHaveLength(5);
    expect(buckets.map((bucket) => bucket.label)).toEqual(
      WEATHER_BUCKET_DEFINITIONS.map((bucket) => bucket.label),
    );

    expect(buckets[0]?.precipLevel).toBe("none");
    expect(buckets[1]?.precipLevel).toBe("light");
    expect(buckets[2]?.precipLevel).toBe("rain");
    expect(buckets[3]?.precipLevel).toBe("heavy");
    expect(buckets[4]?.precipLevel).toBe("none");
  });

  it("clamps SunCycle dayProgress between 0 and 1", () => {
    const beforeSunrise = buildSunCycleUI({
      sunriseTs: 100,
      sunsetTs: 200,
      nowTs: 50,
      timezone: "Europe/Zurich",
    });
    expect(beforeSunrise.dayProgress).toBe(0);

    const afterSunset = buildSunCycleUI({
      sunriseTs: 100,
      sunsetTs: 200,
      nowTs: 250,
      timezone: "Europe/Zurich",
    });
    expect(afterSunset.dayProgress).toBe(1);

    const midday = buildSunCycleUI({
      sunriseTs: 100,
      sunsetTs: 200,
      nowTs: 150,
      timezone: "Europe/Zurich",
    });
    expect(midday.dayProgress).toBe(0.5);
  });
});
