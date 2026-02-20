# Time & Calendar UI

## Overview

This module helps the child orient in time at a glance:

- current time with a large digital clock;
- an analog clock with 12h + 24h visual cues;
- current date in French;
- current season and month position in the year.

All components are designed to remain calm, readable, and predictable for a child-facing experience.

## Data Model

This module has no database dependency.
It derives everything from a `Date` value:

- `useCurrentTime` updates current time every second.
- formatting helpers derive French labels for day/month/time.
- season helper derives current season metadata (label, icon, color class).

## Components

### `DigitalClock`

- File: `src/components/time/DigitalClock.tsx`
- Props:
  - `date: Date | { hours24: number; minutes: number; seconds?: number }`
  - `showSeconds?: boolean`
- Usage:
  - renders high-contrast 24h time (`16:37`).

### `AnalogClock`

- File: `src/components/time/AnalogClock.tsx`
- Props:
  - `date: Date`
  - `showSeconds?: boolean`
- Usage:
  - renders hour/minute hands (optional seconds),
  - shows numbers `1..12` and outer `13..24` references,
  - changes dial tone by time of day.

### `ClockPanel`

- File: `src/components/time/ClockPanel.tsx`
- Behavior:
  - gets real-time data with `useCurrentTime`,
  - renders `DigitalClock` and `AnalogClock`,
  - stacks on mobile, 2 columns on larger screens.

### `DateDisplay`

- File: `src/components/calendar/DateDisplay.tsx`
- Props:
  - `date: Date`
- Usage:
  - shows text like `Mardi 10 février 2026`.

### `MonthStrip`

- File: `src/components/calendar/MonthStrip.tsx`
- Props:
  - `currentMonthIndex: number`
- Usage:
  - displays 12 French months,
  - highlights current month,
  - visually softens past months.

### `SeasonBadge`

- File: `src/components/calendar/SeasonBadge.tsx`
- Props:
  - `date: Date`
- Usage:
  - shows current season icon + label (`❄️ Hiver`).

### `CalendarPanel`

- File: `src/components/calendar/CalendarPanel.tsx`
- Props:
  - `date: Date`
- Usage:
  - combines `DateDisplay`, `SeasonBadge`, and `MonthStrip`.

## UI Behaviour

- Real-time refresh cadence: 1 second.
- Digital and analog clocks are synchronized.
- Season color coding:
  - winter: cool blue
  - spring: soft green
  - summer: warm amber
  - autumn: warm orange/amber
- Month strip works in horizontal scrolling mode on small screens.

## Limitations

- No timezone/user locale settings yet.
- No agenda/task integration yet.
- No timeline or routine state in this module.

## Future Work

- Connect time panel to daily agenda blocks.
- Add transition cues between routine phases.
- Support localization extensions and explicit timezone preferences.

