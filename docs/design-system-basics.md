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

## Base Components

### Button

File: `src/components/ds/button.tsx`

- Variants: `primary`, `secondary`, `tertiary`, `ghost`, `link`.
- Sizes: `sm`, `md`, `lg`.
- Supports: `disabled`, `loading`, `fullWidth`.

### Card

File: `src/components/ds/card.tsx`

- Structural primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.

### Badge

File: `src/components/ds/badge.tsx`

- Variants: `neutral`, `success`, `warning`, `danger`.

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

## Future Work

Upcoming DS extensions include:

- Timeline and timer blocks.
- Reward/points visual components.
- Checklist patterns with accessibility shortcuts.
- Richer form controls and validation patterns.
