# Weather Architecture (Current)

Date: 2026-02-24

## Overview
Weather now follows one pipeline:

`openweathermap.ts` (fetch + cache + normalize only)
-> `forecast-aggregation.ts` (hourly -> buckets, sun cycle, icon/pop mapping)
-> `service.ts` (ok/degraded/fallback decision)
-> SSR (`child-home.ts`)
-> UI (`TodayHeader` + `WeekdayStrip` + weather panel components)

## Data flow
1. `/child?date=YYYY-MM-DD` is parsed in `src/app/(child)/child/page.tsx`.
2. SSR calls `getChildHomeData(..., { selectedDate, timezone })`.
3. `src/lib/api/child-home.ts` calls `getWeatherWeekUI(...)`.
4. `src/lib/weather/service.ts` fetches OpenWeather and builds `WeatherWeekUI`.
5. `src/components/child/child-home-live.tsx` passes `weatherWeek` + selected date to `TodayHeader`.
6. `TodayHeader` renders weather based on `dataState`.

## Server weather layer

### `src/lib/weather/openweathermap.ts`
- Carouge coordinates:
  - `lat=46.1816`
  - `lon=6.1390`
- Endpoints:
  - `https://api.openweathermap.org/data/2.5/weather`
  - `https://api.openweathermap.org/data/3.0/onecall`
- Server cache:
  - `fetch(..., { next: { revalidate: 600 } })`
- API key:
  - `OPENWEATHERMAP_API_KEY` (server-only, never exposed to client)
- Responsibility:
  - Network calls + minimal normalized DTOs only.
  - Status-aware classification of failures (`unauthorized`, `rate_limited`, etc.).
  - Safe logs only (no secret values).

## Aggregation single source of truth

### `src/lib/weather/forecast-aggregation.ts`
- `iconKeyFromWeatherId(id)`:
  - storm / drizzle / rain / snow / fog / clear / partly_cloudy / cloudy.
- `precipLevelFromPop(popPct)`:
  - `<20 none`, `20-49 light`, `50-79 rain`, `>=80 heavy`.
- `microLabelFromPop(popPct)`:
  - `Pas de pluie`
  - `Petite pluie possible`
  - `Pluie probable`
  - `Grosse pluie`
- `aggregateHourlyToBuckets(...)` (hourly granularity):
  - Matin `06:00-11:59`
  - Midi `12:00-13:59`
  - Apres-midi `14:00-17:59`
  - Maison `18:00-19:59`
  - Soir `20:00-23:59`
- `buildSunCycleUI(...)`:
  - `dayProgress` clamped `0..1`
  - localized sunrise/sunset labels

## Shared UI model

### `src/lib/weather/types.ts`
Top-level model now includes:
- `WeatherWeekUI.dataState: "ok" | "degraded" | "fallback"`

Semantics:
- `ok`: One Call is available, full week/day forecast available.
- `degraded`: One Call failed but current weather succeeded.
  - Real `now` values are preserved (temp/feels/wind/icon/summary).
  - Forecast-only fields are intentionally unavailable (`min/max`, `sun`, buckets).
- `fallback`: both One Call and current failed.

Factories:
- `createFallbackWeatherWeekUI(...)`
- `createDegradedWeatherWeekUIFromCurrent(...)`

## Service decision tree

### `src/lib/weather/service.ts`
- Fetches One Call and current in parallel.
- Decision:
  1. One Call success -> build full week (`dataState="ok"`).
  2. One Call fail + current success -> degraded week with real `now` (`dataState="degraded"`).
  3. Both fail -> fallback week (`dataState="fallback"`).

This prevents all-zero weather when only One Call fails.

## Header behavior for degraded mode

### `src/components/child/today/today-header.tsx`
- `dataState="ok"`:
  - renders full weather panel (hero + sun cycle + buckets).
- `dataState="degraded"`:
  - renders compact "Meteo actuelle" block with real current values.
  - shows subtle message: `Previsions indisponibles pour le moment.`
  - does not render sun cycle / forecast panel.
- `dataState="fallback"`:
  - renders stable fallback message: `Meteo indisponible pour le moment.`

## Shared date utilities

### `src/lib/weather/date.ts`
Single helper source for:
- date key in timezone
- timezone-aware date equality
- date key parsing / shifting
- unix+offset day key/hour extraction
- localized time labels

## Known limitation
- `Maison` bucket uses `18:00-19:59` because aggregation is hourly (no half-hour split such as 17:30).

## Free-plan rendering policy
- With One Call 3.0 not entitled (HTTP 401), UI stays in `degraded`:
  - show real current weather from `/data/2.5/weather`.
  - show prevision unavailable message.
  - do not simulate per-day weather values in weekday pills.

## Future work (out of scope)
- Header visual redesign phase (layout hierarchy, control deduplication).
- SVG weather icons in place of emoji.
- Optional `app/api/weather/route.ts` transport wrapper if client-side refresh is later required.
