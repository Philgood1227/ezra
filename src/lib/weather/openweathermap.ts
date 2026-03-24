export type WeatherEndpoint = "current" | "onecall";

export type WeatherFetchErrorKind =
  | "missing_api_key"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "invalid_payload"
  | "network_error"
  | "unknown_error";

export interface WeatherFetchFailure {
  ok: false;
  endpoint: WeatherEndpoint;
  kind: WeatherFetchErrorKind;
  status?: number | undefined;
  message: string;
}

export interface WeatherFetchSuccess<T> {
  ok: true;
  endpoint: WeatherEndpoint;
  data: T;
}

export type WeatherFetchResult<T> = WeatherFetchSuccess<T> | WeatherFetchFailure;

interface OpenWeatherWeatherPayload {
  id?: number;
  description?: string;
}

interface OpenWeatherCurrentResponse {
  dt?: number;
  timezone?: number;
  main?: {
    temp?: number;
    feels_like?: number;
    temp_min?: number;
    temp_max?: number;
    humidity?: number;
  };
  wind?: {
    speed?: number;
  };
  rain?: {
    "1h"?: number;
  };
  snow?: {
    "1h"?: number;
  };
  sys?: {
    sunrise?: number;
    sunset?: number;
  };
  weather?: OpenWeatherWeatherPayload[];
}

interface OpenWeatherOneCallHourlyResponse {
  dt?: number;
  temp?: number;
  feels_like?: number;
  wind_speed?: number;
  pop?: number;
  weather?: OpenWeatherWeatherPayload[];
}

interface OpenWeatherOneCallDailyResponse {
  dt?: number;
  sunrise?: number;
  sunset?: number;
  temp?: {
    min?: number;
    max?: number;
  };
  pop?: number;
  weather?: OpenWeatherWeatherPayload[];
}

interface OpenWeatherOneCallCurrentResponse {
  dt?: number;
  sunrise?: number;
  sunset?: number;
  temp?: number;
  feels_like?: number;
  wind_speed?: number;
  humidity?: number;
  weather?: OpenWeatherWeatherPayload[];
}

interface OpenWeatherOneCallResponse {
  lat?: number;
  lon?: number;
  timezone?: string;
  timezone_offset?: number;
  current?: OpenWeatherOneCallCurrentResponse;
  hourly?: OpenWeatherOneCallHourlyResponse[];
  daily?: OpenWeatherOneCallDailyResponse[];
}

export interface OpenWeatherCurrentNormalized {
  timestampTs: number;
  sunriseTs: number;
  sunsetTs: number;
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  tempMinC: number;
  tempMaxC: number;
  humidityPct: number;
  precipMm1h: number;
  weatherId: number;
  summary: string;
  timezoneOffsetSec: number;
}

export interface OpenWeatherHourlyNormalized {
  timestampTs: number;
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  popPct: number;
  weatherId: number;
  summary: string;
}

export interface OpenWeatherDailyNormalized {
  timestampTs: number;
  sunriseTs: number;
  sunsetTs: number;
  minC: number;
  maxC: number;
  popPct: number;
  weatherId: number;
  summary: string;
}

export interface OpenWeatherOneCallNormalized {
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffsetSec: number;
  generatedAtTs: number;
  current: OpenWeatherCurrentNormalized;
  hourly: OpenWeatherHourlyNormalized[];
  daily: OpenWeatherDailyNormalized[];
}

const OPEN_WEATHER_CURRENT_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather";
const OPEN_WEATHER_ONECALL_ENDPOINT = "https://api.openweathermap.org/data/3.0/onecall";
const OPEN_WEATHER_REVALIDATE_SECONDS = 600;
const ONE_SECOND_MS = 1_000;
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
const WEATHER_FETCH_TIMEOUT_MS = 1_800;
const WEATHER_SUCCESS_CACHE_MS = 2 * ONE_MINUTE_MS;

const WEATHER_FAILURE_BACKOFF_MS: Record<WeatherFetchErrorKind, number> = {
  missing_api_key: 10 * ONE_MINUTE_MS,
  unauthorized: 30 * ONE_MINUTE_MS,
  forbidden: 30 * ONE_MINUTE_MS,
  rate_limited: 2 * ONE_MINUTE_MS,
  server_error: 30 * ONE_SECOND_MS,
  invalid_payload: 10 * ONE_MINUTE_MS,
  network_error: 45 * ONE_SECOND_MS,
  unknown_error: 60 * ONE_SECOND_MS,
};

interface WeatherFailureBackoffEntry {
  failure: WeatherFetchFailure;
  expiresAt: number;
}

interface WeatherSuccessCacheEntry {
  endpoint: WeatherEndpoint;
  data: unknown;
  expiresAt: number;
}

const weatherFailureBackoffCache = new Map<string, WeatherFailureBackoffEntry>();
const weatherSuccessCache = new Map<string, WeatherSuccessCacheEntry>();
const weatherInFlightRequests = new Map<string, Promise<WeatherFetchResult<unknown>>>();

const CAROUGE_LOCATION = {
  label: "Carouge, CH",
  latitude: 46.1816,
  longitude: 6.139,
  timezone: "Europe/Zurich",
} as const;

function getApiKey(): string | null {
  const key = process.env.OPENWEATHERMAP_API_KEY?.trim();
  return key ? key : null;
}

function getFailureCacheKey(endpoint: WeatherEndpoint, apiKey: string | null): string {
  return `${endpoint}:${apiKey ?? "__missing_api_key__"}`;
}

function getSuccessCacheKey(endpoint: WeatherEndpoint, apiKey: string): string {
  return `${endpoint}:${apiKey}`;
}

function getCachedSuccess<T>(
  endpoint: WeatherEndpoint,
  apiKey: string | null,
): WeatherFetchSuccess<T> | null {
  if (!apiKey) {
    return null;
  }

  const cacheKey = getSuccessCacheKey(endpoint, apiKey);
  const entry = weatherSuccessCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    weatherSuccessCache.delete(cacheKey);
    return null;
  }

  return {
    ok: true,
    endpoint,
    data: entry.data as T,
  };
}

function cacheSuccess<T>(endpoint: WeatherEndpoint, apiKey: string, data: T): void {
  weatherSuccessCache.set(getSuccessCacheKey(endpoint, apiKey), {
    endpoint,
    data,
    expiresAt: Date.now() + WEATHER_SUCCESS_CACHE_MS,
  });
}

function getCachedFailure(
  endpoint: WeatherEndpoint,
  apiKey: string | null,
): WeatherFetchFailure | null {
  const cacheKey = getFailureCacheKey(endpoint, apiKey);
  const entry = weatherFailureBackoffCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    weatherFailureBackoffCache.delete(cacheKey);
    return null;
  }

  return entry.failure;
}

function cacheFailure(failure: WeatherFetchFailure, apiKey: string | null): void {
  const backoffMs = WEATHER_FAILURE_BACKOFF_MS[failure.kind] ?? ONE_MINUTE_MS;
  if (backoffMs <= 0) {
    return;
  }

  const cacheKey = getFailureCacheKey(failure.endpoint, apiKey);
  weatherFailureBackoffCache.set(cacheKey, {
    failure,
    expiresAt: Date.now() + backoffMs,
  });
}

function clearFailureCacheForEndpoint(endpoint: WeatherEndpoint): void {
  for (const cacheKey of weatherFailureBackoffCache.keys()) {
    if (cacheKey.startsWith(`${endpoint}:`)) {
      weatherFailureBackoffCache.delete(cacheKey);
    }
  }
}

function withInFlightDedup<T>(
  endpoint: WeatherEndpoint,
  apiKey: string | null,
  execute: () => Promise<WeatherFetchResult<T>>,
): Promise<WeatherFetchResult<T>> {
  const requestKey = getFailureCacheKey(endpoint, apiKey);
  const inFlightRequest = weatherInFlightRequests.get(requestKey);
  if (inFlightRequest) {
    return inFlightRequest as Promise<WeatherFetchResult<T>>;
  }

  const requestPromise = execute()
    .then((result) => result as WeatherFetchResult<unknown>)
    .finally(() => {
      weatherInFlightRequests.delete(requestKey);
    });

  weatherInFlightRequests.set(requestKey, requestPromise);
  return requestPromise as Promise<WeatherFetchResult<T>>;
}

function toNumber(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toPopPct(popRatio: number | undefined): number {
  if (typeof popRatio !== "number" || !Number.isFinite(popRatio)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(popRatio * 100)));
}

function toWindKph(windMetersPerSecond: number | undefined): number {
  return toNumber(windMetersPerSecond, 0) * 3.6;
}

function normalizeSummary(value: string | undefined): string {
  return value?.trim() || "Donnees indisponibles";
}

function getPrimaryWeather(payload: OpenWeatherWeatherPayload[] | undefined): OpenWeatherWeatherPayload {
  return payload?.[0] ?? {};
}

function isValidUnixTimestamp(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function classifyStatus(status: number): WeatherFetchErrorKind {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "server_error";
  }

  return "unknown_error";
}

function createFailure(
  endpoint: WeatherEndpoint,
  kind: WeatherFetchErrorKind,
  message: string,
  status?: number,
): WeatherFetchFailure {
  return {
    ok: false,
    endpoint,
    kind,
    status,
    message,
  };
}

function logFailure(failure: WeatherFetchFailure): void {
  const statusPart = typeof failure.status === "number" ? ` status=${failure.status}` : "";
  console.warn(`[weather:${failure.endpoint}] kind=${failure.kind}${statusPart} message=${failure.message}`);

  if (
    failure.endpoint === "onecall" &&
    failure.kind === "unauthorized" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      "[weather:onecall] HTTP 401. One Call 3.0 may not be enabled for this API key/account.",
    );
  }
}

function normalizeCurrentResponse(
  payload: OpenWeatherCurrentResponse,
): OpenWeatherCurrentNormalized | null {
  const timestampTs = toNumber(payload.dt);
  const sunriseTs = toNumber(payload.sys?.sunrise);
  const sunsetTs = toNumber(payload.sys?.sunset);
  if (
    !isValidUnixTimestamp(timestampTs) ||
    !isValidUnixTimestamp(sunriseTs) ||
    !isValidUnixTimestamp(sunsetTs)
  ) {
    return null;
  }

  const weather = getPrimaryWeather(payload.weather);

  return {
    timestampTs,
    sunriseTs,
    sunsetTs,
    tempC: toNumber(payload.main?.temp),
    feelsLikeC: toNumber(payload.main?.feels_like),
    windKph: toWindKph(payload.wind?.speed),
    tempMinC: toNumber(payload.main?.temp_min, toNumber(payload.main?.temp)),
    tempMaxC: toNumber(payload.main?.temp_max, toNumber(payload.main?.temp)),
    humidityPct: toNumber(payload.main?.humidity),
    precipMm1h: toNumber(payload.rain?.["1h"], toNumber(payload.snow?.["1h"])),
    weatherId: Math.trunc(toNumber(weather.id)),
    summary: normalizeSummary(weather.description),
    timezoneOffsetSec: Math.trunc(toNumber(payload.timezone)),
  };
}

function normalizeOneCallCurrent(
  payload: OpenWeatherOneCallCurrentResponse | undefined,
  timezoneOffsetSec: number,
): OpenWeatherCurrentNormalized | null {
  const timestampTs = toNumber(payload?.dt);
  const sunriseTs = toNumber(payload?.sunrise);
  const sunsetTs = toNumber(payload?.sunset);
  if (
    !isValidUnixTimestamp(timestampTs) ||
    !isValidUnixTimestamp(sunriseTs) ||
    !isValidUnixTimestamp(sunsetTs)
  ) {
    return null;
  }

  const weather = getPrimaryWeather(payload?.weather);

  return {
    timestampTs,
    sunriseTs,
    sunsetTs,
    tempC: toNumber(payload?.temp),
    feelsLikeC: toNumber(payload?.feels_like),
    windKph: toWindKph(payload?.wind_speed),
    tempMinC: toNumber(payload?.temp),
    tempMaxC: toNumber(payload?.temp),
    humidityPct: toNumber(payload?.humidity),
    precipMm1h: 0,
    weatherId: Math.trunc(toNumber(weather.id)),
    summary: normalizeSummary(weather.description),
    timezoneOffsetSec,
  };
}

function normalizeOneCallHourly(
  entries: OpenWeatherOneCallHourlyResponse[] | undefined,
): OpenWeatherHourlyNormalized[] {
  return (entries ?? [])
    .map((entry) => {
      const timestampTs = toNumber(entry.dt);
      if (!isValidUnixTimestamp(timestampTs)) {
        return null;
      }

      const weather = getPrimaryWeather(entry.weather);
      return {
        timestampTs,
        tempC: toNumber(entry.temp),
        feelsLikeC: toNumber(entry.feels_like),
        windKph: toWindKph(entry.wind_speed),
        popPct: toPopPct(entry.pop),
        weatherId: Math.trunc(toNumber(weather.id)),
        summary: normalizeSummary(weather.description),
      } satisfies OpenWeatherHourlyNormalized;
    })
    .filter((entry): entry is OpenWeatherHourlyNormalized => entry !== null);
}

function normalizeOneCallDaily(
  entries: OpenWeatherOneCallDailyResponse[] | undefined,
): OpenWeatherDailyNormalized[] {
  return (entries ?? [])
    .map((entry) => {
      const timestampTs = toNumber(entry.dt);
      const sunriseTs = toNumber(entry.sunrise);
      const sunsetTs = toNumber(entry.sunset);
      if (
        !isValidUnixTimestamp(timestampTs) ||
        !isValidUnixTimestamp(sunriseTs) ||
        !isValidUnixTimestamp(sunsetTs)
      ) {
        return null;
      }

      const weather = getPrimaryWeather(entry.weather);
      return {
        timestampTs,
        sunriseTs,
        sunsetTs,
        minC: toNumber(entry.temp?.min),
        maxC: toNumber(entry.temp?.max),
        popPct: toPopPct(entry.pop),
        weatherId: Math.trunc(toNumber(weather.id)),
        summary: normalizeSummary(weather.description),
      } satisfies OpenWeatherDailyNormalized;
    })
    .filter((entry): entry is OpenWeatherDailyNormalized => entry !== null);
}

function normalizeOneCallResponse(
  payload: OpenWeatherOneCallResponse,
): OpenWeatherOneCallNormalized | null {
  const timezoneOffsetSec = Math.trunc(toNumber(payload.timezone_offset));
  const current = normalizeOneCallCurrent(payload.current, timezoneOffsetSec);
  if (!current) {
    return null;
  }

  return {
    latitude: toNumber(payload.lat, CAROUGE_LOCATION.latitude),
    longitude: toNumber(payload.lon, CAROUGE_LOCATION.longitude),
    timezone: payload.timezone?.trim() || CAROUGE_LOCATION.timezone,
    timezoneOffsetSec,
    generatedAtTs: current.timestampTs,
    current,
    hourly: normalizeOneCallHourly(payload.hourly),
    daily: normalizeOneCallDaily(payload.daily),
  };
}

async function fetchJson<T>(
  url: URL,
  endpoint: WeatherEndpoint,
): Promise<WeatherFetchResult<T>> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, WEATHER_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: abortController.signal,
      next: {
        revalidate: OPEN_WEATHER_REVALIDATE_SECONDS,
      },
    });

    if (!response.ok) {
      return createFailure(
        endpoint,
        classifyStatus(response.status),
        `OpenWeatherMap request failed (${response.status})`,
        response.status,
      );
    }

    return {
      ok: true,
      endpoint,
      data: (await response.json()) as T,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return createFailure(
        endpoint,
        "network_error",
        `OpenWeatherMap request timed out after ${Math.round(WEATHER_FETCH_TIMEOUT_MS / 1000)}s`,
      );
    }

    return createFailure(endpoint, "network_error", "Network error while requesting OpenWeatherMap");
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function createCurrentWeatherUrl(apiKey: string): URL {
  const url = new URL(OPEN_WEATHER_CURRENT_ENDPOINT);
  url.searchParams.set("lat", String(CAROUGE_LOCATION.latitude));
  url.searchParams.set("lon", String(CAROUGE_LOCATION.longitude));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "fr");
  return url;
}

function createOneCallUrl(apiKey: string): URL {
  const url = new URL(OPEN_WEATHER_ONECALL_ENDPOINT);
  url.searchParams.set("lat", String(CAROUGE_LOCATION.latitude));
  url.searchParams.set("lon", String(CAROUGE_LOCATION.longitude));
  url.searchParams.set("exclude", "minutely,alerts");
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "fr");
  return url;
}

export async function fetchCurrentWeatherCarouge(): Promise<WeatherFetchResult<OpenWeatherCurrentNormalized>> {
  const apiKey = getApiKey();
  const cachedSuccess = getCachedSuccess<OpenWeatherCurrentNormalized>("current", apiKey);
  if (cachedSuccess) {
    return cachedSuccess;
  }

  const cachedFailure = getCachedFailure("current", apiKey);
  if (cachedFailure) {
    return cachedFailure;
  }

  if (!apiKey) {
    const failure = createFailure("current", "missing_api_key", "OPENWEATHERMAP_API_KEY is missing");
    cacheFailure(failure, apiKey);
    logFailure(failure);
    return failure;
  }

  const payloadResult = await withInFlightDedup("current", apiKey, async () =>
    fetchJson<OpenWeatherCurrentResponse>(createCurrentWeatherUrl(apiKey), "current"),
  );
  if (!payloadResult.ok) {
    cacheFailure(payloadResult, apiKey);
    logFailure(payloadResult);
    return payloadResult;
  }

  const normalized = normalizeCurrentResponse(payloadResult.data);
  if (!normalized) {
    const failure = createFailure("current", "invalid_payload", "Current weather payload missing required fields");
    cacheFailure(failure, apiKey);
    logFailure(failure);
    return failure;
  }

  clearFailureCacheForEndpoint("current");
  cacheSuccess("current", apiKey, normalized);

  return {
    ok: true,
    endpoint: "current",
    data: normalized,
  };
}

export async function fetchOneCallWeatherCarouge(): Promise<WeatherFetchResult<OpenWeatherOneCallNormalized>> {
  const apiKey = getApiKey();
  const cachedSuccess = getCachedSuccess<OpenWeatherOneCallNormalized>("onecall", apiKey);
  if (cachedSuccess) {
    return cachedSuccess;
  }

  const cachedFailure = getCachedFailure("onecall", apiKey);
  if (cachedFailure) {
    return cachedFailure;
  }

  if (!apiKey) {
    const failure = createFailure("onecall", "missing_api_key", "OPENWEATHERMAP_API_KEY is missing");
    cacheFailure(failure, apiKey);
    logFailure(failure);
    return failure;
  }

  const payloadResult = await withInFlightDedup("onecall", apiKey, async () =>
    fetchJson<OpenWeatherOneCallResponse>(createOneCallUrl(apiKey), "onecall"),
  );
  if (!payloadResult.ok) {
    cacheFailure(payloadResult, apiKey);
    logFailure(payloadResult);
    return payloadResult;
  }

  const normalized = normalizeOneCallResponse(payloadResult.data);
  if (!normalized) {
    const failure = createFailure("onecall", "invalid_payload", "One Call payload missing required fields");
    cacheFailure(failure, apiKey);
    logFailure(failure);
    return failure;
  }

  clearFailureCacheForEndpoint("onecall");
  cacheSuccess("onecall", apiKey, normalized);

  return {
    ok: true,
    endpoint: "onecall",
    data: normalized,
  };
}

export function __resetWeatherFailureBackoffForTests(): void {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true" && process.env.VITEST !== "1") {
    return;
  }

  weatherFailureBackoffCache.clear();
  weatherSuccessCache.clear();
  weatherInFlightRequests.clear();
}
