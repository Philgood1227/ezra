import { afterEach, describe, expect, it, vi } from "vitest";
import { getWeatherWeekUI } from "@/lib/weather/service";
import {
  fetchCurrentWeatherCarouge,
  fetchOneCallWeatherCarouge,
  type OpenWeatherCurrentNormalized,
  type OpenWeatherOneCallNormalized,
} from "@/lib/weather/openweathermap";

vi.mock("@/lib/weather/openweathermap", () => ({
  fetchCurrentWeatherCarouge: vi.fn(),
  fetchOneCallWeatherCarouge: vi.fn(),
}));

const fetchCurrentMock = vi.mocked(fetchCurrentWeatherCarouge);
const fetchOneCallMock = vi.mocked(fetchOneCallWeatherCarouge);

function createCurrentData(): OpenWeatherCurrentNormalized {
  return {
    timestampTs: 1_772_000_000,
    sunriseTs: 1_771_980_000,
    sunsetTs: 1_772_020_000,
    tempC: 13.2,
    feelsLikeC: 12.1,
    windKph: 10.7,
    tempMinC: 8.2,
    tempMaxC: 14.5,
    humidityPct: 66,
    precipMm1h: 0.4,
    weatherId: 801,
    summary: "quelques nuages",
    timezoneOffsetSec: 3600,
  };
}

function createOneCallData(): OpenWeatherOneCallNormalized {
  const current = createCurrentData();
  return {
    latitude: 46.1816,
    longitude: 6.139,
    timezone: "Europe/Zurich",
    timezoneOffsetSec: 3600,
    generatedAtTs: current.timestampTs,
    current,
    hourly: [
      {
        timestampTs: current.timestampTs,
        tempC: current.tempC,
        feelsLikeC: current.feelsLikeC,
        windKph: current.windKph,
        popPct: 15,
        weatherId: current.weatherId,
        summary: current.summary,
      },
    ],
    daily: [
      {
        timestampTs: current.timestampTs,
        sunriseTs: current.sunriseTs,
        sunsetTs: current.sunsetTs,
        minC: 8,
        maxC: 15,
        popPct: 20,
        weatherId: 801,
        summary: "nuageux",
      },
    ],
  };
}

describe("weather service decision tree", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns dataState ok when one call succeeds", async () => {
    fetchOneCallMock.mockResolvedValueOnce({
      ok: true,
      endpoint: "onecall",
      data: createOneCallData(),
    });
    fetchCurrentMock.mockResolvedValueOnce({
      ok: true,
      endpoint: "current",
      data: createCurrentData(),
    });

    const week = await getWeatherWeekUI({
      timezone: "Europe/Zurich",
      selectedDateISO: "2026-02-24",
    });

    expect(week.dataState).toBe("ok");
    expect(week.days.length).toBeGreaterThan(0);
    expect(week.now.tempC).toBe(13);
  });

  it("returns dataState degraded when one call fails but current succeeds", async () => {
    fetchOneCallMock.mockResolvedValueOnce({
      ok: false,
      endpoint: "onecall",
      kind: "unauthorized",
      status: 401,
      message: "OpenWeatherMap request failed (401)",
    });
    fetchCurrentMock.mockResolvedValueOnce({
      ok: true,
      endpoint: "current",
      data: createCurrentData(),
    });

    const week = await getWeatherWeekUI({
      timezone: "Europe/Zurich",
      selectedDateISO: "2026-02-24",
    });

    expect(week.dataState).toBe("degraded");
    expect(week.now.tempC).toBe(13);
    expect(week.now.feelsLikeC).toBe(12);
    expect(week.now.tempMinC).toBe(8);
    expect(week.now.tempMaxC).toBe(15);
    expect(week.now.humidityPct).toBe(66);
    expect(week.now.precipMm1h).toBe(0.4);
    expect(week.days.every((day) => day.minC === null && day.maxC === null)).toBe(true);
    expect(week.days.every((day) => day.sun === null)).toBe(true);
  });

  it("returns dataState fallback when both one call and current fail", async () => {
    fetchOneCallMock.mockResolvedValueOnce({
      ok: false,
      endpoint: "onecall",
      kind: "unauthorized",
      status: 401,
      message: "OpenWeatherMap request failed (401)",
    });
    fetchCurrentMock.mockResolvedValueOnce({
      ok: false,
      endpoint: "current",
      kind: "network_error",
      message: "Network error while requesting OpenWeatherMap",
    });

    const week = await getWeatherWeekUI({
      timezone: "Europe/Zurich",
      selectedDateISO: "2026-02-24",
    });

    expect(week.dataState).toBe("fallback");
    expect(week.now.tempC).toBeNull();
    expect(week.days.every((day) => day.minC === null && day.maxC === null)).toBe(true);
  });
});
