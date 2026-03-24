# DS Harmonization (Parent + Child)

## Overview

Goal: align parent visual language with the existing child premium style **without splitting the Design System**.

Approach:

- keep one DS under `src/components/ds`
- add non-breaking visual variants
- adopt those variants first on parent dashboard/high-impact CTAs

## Data model / API impact

- No backend change.
- No domain type change.
- No route contract change.

## DS changes

### Button

File: `src/components/ds/button.tsx`

- Added `variant="premium"`:
  - stronger gradient
  - elevated shadow
  - subtle ring for focus/importance
- Added `variant="glass"`:
  - translucent elevated button
  - softer contextual action look

### Card

File: `src/components/ds/card.tsx`

- Added `surface` prop:
  - `default` (existing behavior)
  - `glass`
  - `child` (premium gradient panel)

### Badge

File: `src/components/ds/badge.tsx`

- Added `variant="glass"` for neutral-premium chips.

## Parent adoption

### Dashboard

File: `src/features/dashboard/components/parent-dashboard-view.tsx`

- top summary card uses `Card surface="child"`
- priorities card uses `Card surface="glass"`
- quick action CTAs use:
  - `Button variant="premium"` for high priority actions
  - `Button variant="glass"` for contextual actions
- quick action chip uses `Badge variant="glass"` when tone is neutral

### Parent managers (phase 2)

Files:

- `src/features/school-diary/components/school-diary-manager.tsx`
- `src/features/meals/components/parent-meals-manager.tsx`
- `src/features/alarms/components/parent-alarms-manager.tsx`

Applied:

- summary/overview panels moved to `Card surface="child"`
- form/list panels moved to `Card surface="glass"`
- primary create/save CTAs moved to `Button variant="premium"`
- secondary contextual actions moved to `Button variant="glass"`
- destructive actions moved to `Button variant="danger"`

## Tests

- Updated DS component tests:
  - `src/__tests__/ds/components.test.tsx`
  - added coverage for `Button variant="premium"`
  - added coverage for `Card surface="child"`

## Workflows

1. Parent opens dashboard.
2. Core action blocks use the same premium CTA language seen in child experiences.
3. Parent keeps the same functional flow but with clearer visual hierarchy.

## Limitations

- Harmonization is incremental.
- Not all parent modules are migrated yet to premium variants.

## Future work

1. Apply `premium/glass` variants to remaining parent managers (forms/lists).
2. Add DS stories for new variants (`Button`, `Card`, `Badge`).
3. Introduce page-level composition presets (parent cockpit, parent form-heavy, child mission).
