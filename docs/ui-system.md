# UI System Rules (Child Dashboard)

Date: 2026-02-24
Scope: `/child` shell and dashboard surfaces.

## 1) Width policy (single source of truth)

- `/child` is full-bleed: no centered max-width container.
- Horizontal padding is controlled by one variable only: `--page-x`.
- `--page-x` values:
  - phones: `16px`
  - tablet: `clamp(16px, 2vw, 24px)`
  - desktop: `clamp(20px, 2vw, 32px)`

Implementation:
- `src/app/globals.css`
  - defines `--page-x`, `--page-section-gap` by breakpoint.
- `src/components/layout/child-shell.tsx`
  - `/child` uses `w-full px-[var(--page-x)]` with no `max-w-*`.

Rule:
- Do not reintroduce page-level `max-w-*` wrappers inside `/child`.
- If line length must be constrained, do it locally on text blocks only.

## 2) Vertical rhythm

- `--page-section-gap` drives spacing between major sections.
- Values:
  - phones: `16px`
  - tablet: `20px`
  - desktop: `24px`

Implementation:
- `src/components/child/child-home-live.tsx`
  - section stack uses `space-y-[var(--page-section-gap)]`.

## 3) Surface and elevation tiers

- `S0 Page`
  - global `hero-soft` page background, no border.
- `S1 Panel`
  - base glass panel (`bg-bg-surface/66..82`, `border-border-subtle`, `shadow-card`, `backdrop-blur-sm`).
- `S2 Hero`
  - stronger panel (`bg-gradient-to-br`, subtle bloom overlays, `shadow-glass`, `backdrop-blur-md`).
- `S3 Active pill`
  - selected state with gradient fill, ring, and elevated shadow (`ring-brand-primary/25`, `shadow-glass|shadow-elevated`).

Rule:
- No random custom colors.
- Map each panel to one tier and avoid double heavy framing.

## 4) Header responsive spec

### Phone portrait (`<640`)
- stacked flow
- week strip: horizontal scroll
- segments: horizontal scroll pills
- weather panel compact
- target max header height: `<=260px`

### Tablet portrait (`640..999`)
- stacked or semi-stacked flow
- week strip remains compact
- target max header height: `<=300px`

### Tablet landscape (`>=1000`)
- 2-column layout
- right column width: `clamp(320px, 28vw, 400px)`
- target max header height: `220..260px`

### Desktop (`>=1440`)
- same 2-column layout
- relaxed spacing
- target max header height: `240..280px`

## 5) Weather rendering rules

- Reliable baseline: current weather only.
- `ok`: current weather + optional sun cycle.
- `degraded`: current weather + "Previsions indisponibles..." only.
- `fallback`: compact unavailable message only.
- Week strip must not depend on per-day weather.

## 6) No double-framing rule

- Use one dominant header shell (S1).
- One nested hero panel (S2) is allowed.
- Avoid stacking multiple thick borders/paddings that create narrow, boxed composition.

## 7) Visual regression checklist

Check at:
- iPhone `390x844`
- iPad portrait `820x1180`
- iPad landscape `1180x820`
- desktop `1440x900`

Validate:
- no centered width lock on `/child`
- header remains compact per caps
- right weather hero is visible on landscape
- degraded mode hides forecast-only sections

## 8) Mission Drawer DS Contract

- Mission drawer row/progress/footer visuals must use semantic DS classes from `src/app/globals.css` (`.mission-list-drawer-*`).
- Values are tokenized under `--ds-mission-list-*` and `--radius-mission-list-*`.
- Detailed spec: `docs/design-system-mission-drawer.md`.
