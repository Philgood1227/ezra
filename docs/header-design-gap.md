# Header Design Gap + Visual Pass Plan

Date: 2026-02-24
Scope: `/child` page shell, `TodayHeader`, `WeekdayStrip`, weather panel.

Reference rules for future screens are now centralized in `docs/ui-system.md`.

## Mock fidelity notes
- Mock image is the visual source of truth for `/child` header styling.
- Meteocons integration path: `public/icons/meteocons` via `src/components/weather/WeatherIcon.tsx`.
- Weekday pills are navigation only: no per-day weather icons/temperatures/pop in `WeekdayStrip`.
- Micro visual pass applied (balance + density + glass elevation): spacing/typography/shadows refined in header strip and weather widget.
- No logic changes in this pass: weather fetching/state/routing/selection behavior unchanged.
- Balanced header layout rule applied:
  - WeatherPanel aligned top-right with title row.
  - WeekdayStrip tightened closer to title.
  - Segments sit directly under WeekdayStrip with matched visual width.
  - Segment time ranges removed (labels only).

## Audit summary (before implementation)

### Width constraints found (root cause of side bands)
- `src/components/layout/child-shell.tsx`
  - previously constrained all child pages with `max-w-[960px]` + fixed side paddings.
- `src/components/child/child-home-live.tsx`
  - duplicated constraint with `mx-auto max-w-[960px]`.

Impact:
- On tablet landscape, content width was capped twice, causing large side gutters and underused viewport width.

### Tailwind / DS capabilities used for premium depth
- Surface tokens: `bg-bg-surface`, `bg-bg-elevated`, `border-border-subtle`, `border-border-default`.
- Elevation tokens: `shadow-card`, `shadow-glass`, `shadow-elevated`.
- Radius tokens: `rounded-radius-card`, `rounded-radius-button`, `rounded-radius-pill`.
- Background gradient: `bg-gradient-to-br` + global `hero-soft` background.
- Blur: `backdrop-blur-sm`, `backdrop-blur-md`.

### Encoding defect root cause
- Multiple UI strings were saved with mojibake bytes (`MÃ©tÃ©o`, `Â°C`) in header/weather files.
- This is a file encoding corruption issue (not weather API data).

Fix strategy:
- Rewrite affected UI files with clean text and no escaped `\uXXXX` visible output.
- Keep labels deterministic and test for absence of literal `\u` in rendered weather title.

## Responsive rules implemented

### Phone portrait (`<640`)
- Header stacks vertically.
- Week strip is horizontally scrollable (`flex + overflow-x-auto`).
- Weather card is compact and rendered below strips.

### Tablet portrait (`640..999`)
- Still mostly stacked for density and readability.
- Compact paddings preserved.
- Week strip remains stable without wrapping noise.

### Tablet landscape (`>=1000`)
- True two-column header:
  - left: title + semainier + primary segments + compact segment preview.
  - right: weather hero panel.
- Content uses wider shell and responsive side padding (no narrow centered 960px lock).

### Desktop (`>=1280`)
- Same two-column structure.
- Wider shell limit retained for comfortable line length.

## Depth levels (visual hierarchy)

1. Level 1 (header shell)
- Glass panel with gradient tint + blur + `shadow-glass`.

2. Level 2 (inner controls)
- Segments and strip containers with soft borders + `shadow-card`.

3. Level 3 (active pills)
- Selected day/segment uses stronger gradient fill + ring/glow + elevated shadow.

## Weather behavior decision (free plan)
- No simulated weather.
- Primary display is current weather only.
- Weekday pills keep visual style but do not render per-day mini weather values.
- Degraded mode shows current weather + prevision unavailable message.

## Preventing future encoding regressions
- Keep weather/header labels in plain source strings (no corrupted pasted bytes).
- Validate rendered strings in tests for no literal `\u` sequences.
- Keep files UTF-8.
