# Design System Basics

## Overview

The Ezra Design System (`src/components/ds`) provides reusable, typed UI primitives for all app shells.
Goals:

- Keep visual consistency across parent and child interfaces.
- Centralize tokens and variants.
- Prevent ad-hoc Tailwind usage in feature pages.

## Tokens

Tokens are defined in `tailwind.config.ts` and consumed through DS components.

### Colors

- `brand.*`: primary action color ramp.
- `accent.*`: secondary interactive palette.
- `surface.*`: app surfaces and backgrounds.
- `ink.*`: text hierarchy.
- semantic: `success`, `warning`, `danger`.

### Typography

- Typography is tuned for calm readability and reduced cognitive load for ADHD/dyslexia contexts.
- `font-sans`: default UI font (`Lexend`).
- `font-reading`: reading-heavy content (`Atkinson Hyperlegible`).
- `font-display`: compatibility heading token mapped to `Lexend`.
- Usage: `className="font-reading"` (Tailwind) or `className="reading"` (global utility).

### Spacing & Shape

- custom spacing scale: `18`, `22`, `26`, `30`.
- rounded corners: `xl`, `2xl`, `3xl`.
- shadows: `card`, `floating`.

## Mission Drawer Contract

Mission drawer visuals are now standardized through DS tokens + semantic classes.

Source of truth:

- Tokens: `src/app/globals.css` (`--ds-mission-list-*`, `--radius-mission-list-*`)
- Component classes: `src/app/globals.css` (`.mission-list-drawer-*`)
- Consumer: `src/components/missions/MissionsSummaryCard.tsx`

Rule:

- Do not style mission drawer list rows/footer/progress with ad-hoc Tailwind classes.
- Use DS classes (`mission-list-drawer-row`, `mission-list-drawer-pill`, `mission-list-drawer-footer-card`, etc.).
- Category color variants are limited to DS variant classes (`--indigo`, `--purple`, `--emerald`).

Reference:

- `docs/design-system-mission-drawer.md`

## Base Components

### Button

File: `src/components/ds/button.tsx`

- Variants: `primary`, `premium`, `secondary`, `glass`, `tertiary`, `ghost`, `link`.
- Sizes: `sm`, `md`, `lg`.
- Supports: `disabled`, `loading`, `fullWidth`.
- Harmonization note:
  - `premium` is the shared high-emphasis CTA style used to align parent actions with child visual language.
  - `glass` is a lighter surface CTA for contextual actions.

### Card

File: `src/components/ds/card.tsx`

- Structural primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.
- Surfaces:
  - `default`: standard DS panel.
  - `glass`: elevated translucent panel.
  - `child`: premium gradient panel used for child-like emphasis blocks.

### Badge

File: `src/components/ds/badge.tsx`

- Variants: `neutral`, `glass`, `success`, `warning`, `danger`.

### TabBar

File: `src/components/ds/tab-bar.tsx`

- `TabBar`: bottom mobile-first navigation container.
- `TabBarItem`: single tab item with active state.

### PageLayout

File: `src/components/ds/page-layout.tsx`

- Standard page scaffold with title, subtitle, optional actions, and content container.

## Storybook

Stories are co-located in `src/components/ds/*.stories.tsx`.
Use `npm run storybook` to inspect primitives and props controls.

## How To Add New DS Components

1. Add component under `src/components/ds/`.
2. Use existing tokens only; avoid hardcoded colors/spacings.
3. Export through `src/components/ds/index.ts`.
4. Add Storybook story with core variants/states.
5. Add unit tests if component has behavior.

## Limitations

- DS scope is intentionally minimal in Phase 1.
- No complex domain widgets yet (timeline, timer, checklist, school forms).

## Parent/Child Harmonization (Sprint)

- Strategy: keep one DS and extend visual variants instead of cloning parent vs child component sets.
- Parent modules can adopt child-grade emphasis with:
  - `Button variant="premium"` for primary CTAs.
  - `Button variant="glass"` for secondary contextual actions.
  - `Card surface="glass"` / `Card surface="child"` for premium panels.
- This keeps behavior/API stable while progressively converging UX across shells.

## Future Work

Upcoming DS extensions include:

- Timeline and timer blocks.
- Reward/points visual components.
- Checklist patterns with accessibility shortcuts.
- Richer form controls and validation patterns.
