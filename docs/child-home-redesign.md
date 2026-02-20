# Child Home Visual Redesign

## Goal

Make `/child` feel more engaging and "fun to tap" while keeping the same low-density structure and ADHD-safe clarity.

## Visual Hierarchy

The page keeps exactly three tiers above the bottom nav:

1. Hero: `TodayHeader`
2. Main action: `En ce moment`
3. Support: `Pour t'aider`

Spacing between tiers uses existing DS spacing classes and avoids extra separators.

## Responsive Layout Frame

The redesign now uses a single responsive implementation aligned with the design catalogue patterns:

1. Tablet compact mode is applied from `md` up to `lg` widths.
2. Desktop comfort spacing resumes at `xl`.
3. Bottom-nav overlap is prevented by shell-level content bottom padding and compact block heights.

Target behavior:

1. Tablet landscape (iPad class): `TodayHeader`, `En ce moment`, `Pour t'aider`, and bottom nav are visible without initial scroll.
2. Tablet portrait: slight scroll is acceptable, with `TodayHeader` + `En ce moment` fully visible first.
3. Smartphone: compact hero remains short enough to keep cognitive orientation fast.

## Component-Level Changes

### TodayHeader

1. Promoted to a premium calm hero using DS `bg-hero-soft`, layered glows, and elevated depth.
2. Includes a small decorative visual on the right (`today-hero-visual`) that stays secondary to text.
3. Maintains date + week strip as primary orientation content.
4. Tablet compact variant keeps 44x44 day chips while reducing vertical density.

### En ce moment

1. Kept as the strongest visual card (highest elevation among Home blocks) with premium surface treatment.
2. Adds task-category iconography beside the `Maintenant` item.
3. Keeps exactly two information rows and one CTA.
4. CTA remains a DS primary button and still opens `/child/my-day`.
5. Tablet compact variant reduces title/text scale and internal vertical gaps.

### Pour t'aider

1. Keeps exactly two entries: `Fiches d'aide` and `Outils de travail`.
2. Entries are large icon-led premium tiles with subtle hover/press states.
3. Elevation remains lower than `En ce moment` to preserve hierarchy.
4. Tablet compact variant trims block spacing while preserving touch target height (`h-touch-lg`).

## Motion Behavior

1. Uses existing motion primitive `ScaleOnTap` only.
2. Interactions are subtle and event-driven (tap/press + hover feedback).
3. Reduced motion disables tap scaling through `useReducedMotion`.

## Non-Goals

1. No new business logic.
2. No new sections above the fold.
3. No routing or data-loading changes.
4. No custom color system outside DS tokens.

## Future Work

1. Contextual hero visual variants by school/vacation period can be added later without changing the responsive frame.
