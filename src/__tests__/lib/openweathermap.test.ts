import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetWeatherFailureBackoffForTests,
  fetchCurrentWeatherCarouge,
  fetchOneCallWeatherCarouge,
} from "@/lib/weather/openweathermap";

const ORIGINAL_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("OpenWeatherMap normalization", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.OPENWEATHERMAP_API_KEY = "test-api-key";
    __resetWeatherFailureBackoffForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (typeof ORIGINAL_API_KEY === "string") {
      process.env.OPENWEATHERMAP_API_KEY = ORIGINAL_API_KEY;
      return;
    }

    delete process.env.OPENWEATHERMAP_API_KEY;
  });

  it("fetchCurrentWeatherCarouge returns normalized current payload", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        dt: 1_772_000_000,
        timezone: 3600,
        main: { temp: 8.4, feels_like: 7.1, temp_min: 5.2, temp_max: 10.8, humidity: 72 },
        wind: { speed: 3.0 },
        rain: { "1h": 0.6 },
        sys: { sunrise: 1_771_980_000, sunset: 1_772_020_000 },
        weather: [{ id: 501, description: "pluie moderee" }],
      }),
    );

    const result = await fetchCurrentWeatherCarouge();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.tempC).toBe(8.4);
    expect(result.data.feelsLikeC).toBe(7.1);
    expect(result.data.tempMinC).toBe(5.2);
    expect(result.data.tempMaxC).toBe(10.8);
    expect(result.data.humidityPct).toBe(72);
    expect(result.data.precipMm1h).toBe(0.6);
    expect(result.data.weatherId).toBe(501);
    expect(result.data.summary).toBe("pluie moderee");
    expect(Math.round(result.data.windKph)).toBe(11);

    const firstCallUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(firstCallUrl.pathname).toContain("/data/2.5/weather");
    expect(firstCallUrl.searchParams.get("lat")).toBe("46.1816");
    expect(firstCallUrl.searchParams.get("lon")).toBe("6.139");
  });

  it("fetchOneCallWeatherCarouge returns normalized one call payload", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        lat: 46.1816,
        lon: 6.139,
        timezone: "Europe/Zurich",
        timezone_offset: 3600,
        current: {
          dt: 1_772_000_000,
          sunrise: 1_771_980_000,
          sunset: 1_772_020_000,
          temp: 9.1,
          feels_like: 8.3,
          wind_speed: 2.4,
          weather: [{ id: 800, description: "ciel degage" }],
        },
        hourly: [
          {
            dt: 1_772_000_000,
            temp: 9.1,
            feels_like: 8.3,
            wind_speed: 2.4,
            pop: 0.2,
            weather: [{ id: 800, description: "ciel degage" }],
          },
        ],
        daily: [
          {
            dt: 1_772_000_000,
            sunrise: 1_771_980_000,
            sunset: 1_772_020_000,
            temp: { min: 4.2, max: 10.9 },
            pop: 0.3,
            weather: [{ id: 802, description: "nuageux" }],
          },
        ],
      }),
    );

    const result = await fetchOneCallWeatherCarouge();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.timezone).toBe("Europe/Zurich");
    expect(result.data.hourly).toHaveLength(1);
    expect(result.data.daily).toHaveLength(1);
    expect(result.data.daily[0]?.popPct).toBe(30);
    expect(result.data.current.weatherId).toBe(800);

    const firstCallUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(firstCallUrl.pathname).toContain("/data/3.0/onecall");
    expect(firstCallUrl.searchParams.get("lat")).toBe("46.1816");
    expect(firstCallUrl.searchParams.get("lon")).toBe("6.139");
  });

  it("classifies one call 401 as unauthorized", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(createJsonResponse({ message: "Unauthorized" }, 401));

    const result = await fetchOneCallWeatherCarouge();

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.endpoint).toBe("onecall");
    expect(result.kind).toBe("unauthorized");
    expect(result.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses one call unauthorized failure from backoff cache", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(createJsonResponse({ message: "Unauthorized" }, 401));

    const firstResult = await fetchOneCallWeatherCarouge();
    const secondResult = await fetchOneCallWeatherCarouge();

    expect(firstResult.ok).toBe(false);
    expect(secondResult.ok).toBe(false);
    if (!firstResult.ok) {
      expect(firstResult.kind).toBe("unauthorized");
    }
    if (!secondResult.ok) {
      expect(secondResult.kind).toBe("unauthorized");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses one call success payload from short-lived success cache", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        lat: 46.1816,
        lon: 6.139,
        timezone: "Europe/Zurich",
        timezone_offset: 3600,
        current: {
          dt: 1_772_000_000,
          sunrise: 1_771_980_000,
          sunset: 1_772_020_000,
          temp: 9.1,
          feels_like: 8.3,
          wind_speed: 2.4,
          weather: [{ id: 800, description: "ciel degage" }],
        },
        hourly: [],
        daily: [],
      }),
    );

    const firstResult = await fetchOneCallWeatherCarouge();
    const secondResult = await fetchOneCallWeatherCarouge();

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent one call requests", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockImplementationOnce(
      async () =>
        createJsonResponse({
          lat: 46.1816,
          lon: 6.139,
          timezone: "Europe/Zurich",
          timezone_offset: 3600,
          current: {
            dt: 1_772_000_000,
            sunrise: 1_771_980_000,
            sunset: 1_772_020_000,
            temp: 9.1,
            feels_like: 8.3,
            wind_speed: 2.4,
            weather: [{ id: 800, description: "ciel degage" }],
          },
          hourly: [],
          daily: [],
        }),
    );

    const [resultA, resultB] = await Promise.all([
      fetchOneCallWeatherCarouge(),
      fetchOneCallWeatherCarouge(),
    ]);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
