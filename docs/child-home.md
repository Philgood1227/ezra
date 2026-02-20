# Child Home

## Overview

`/child` is a compact cockpit with three visual tiers above the bottom navigation:

1. `TodayHeader` (hero tier): calm date anchor with week strip.
2. `En ce moment` card (primary action tier): current and next context with one CTA.
3. `Pour t'aider` block (secondary support tier): two direct shortcuts.

The structure stays intentionally fixed to reduce cognitive load for an ADHD child.
The visual language follows the Design System hero/card guidance from the design catalogue, including the "Hero Section / Banniere hero" pattern.

## Data Model

The Home data contract is unchanged and still comes from `src/lib/api/child-home.ts`.
Presentation-only icon mapping is added in `src/components/child/home/child-home-icons.tsx`:

1. `colorKey` (`category-routine`, `category-ecole`, `category-repas`, `category-sport`, `category-loisir`, `category-calme`, `category-sommeil`) maps to a typed task icon for the "Maintenant" line.
2. Mapping is UI-only and does not modify domain rules, task selection logic, or API payloads.

## Workflows

The Home still answers one immediate question first: "Where am I now?"

1. `TodayHeader` gives temporal orientation ("Aujourd'hui" + week strip).
2. `En ce moment` shows exactly two lines: `Maintenant` and `A suivre`.
3. `Continuer ma journee` sends the child to `/child/my-day` for detailed timeline actions.
4. `Pour t'aider` remains the single entry point to help resources:
   - `Fiches d'aide` -> `/child/knowledge`
   - `Outils de travail` -> `/child/my-day`

## UI Behavior

### Tier 1: TodayHeader Hero

1. Uses a premium DS hero surface (`bg-hero-soft`) with layered decorative glows and strong rounded shape.
2. Adds a decorative day-energy visual (`today-hero-visual`) as a secondary accent.
3. Keeps date text as the primary focus and week strip always visible.
4. Keeps week-day chips at touch size (`h-touch-sm`, `w-touch-sm`) for accessibility.

### Tier 2: En ce moment (Primary)

1. Uses the strongest card elevation on Home and a premium gradient surface to stay visually primary.
2. Adds a typed category icon beside the `Maintenant` task title.
3. Keeps exactly two information rows (`Maintenant`, `A suivre`) plus one primary CTA.
4. Uses subtle press feedback through `ScaleOnTap` and DS shadow/brightness transitions.

### Tier 3: Pour t'aider (Secondary)

1. Keeps exactly two large shortcut tiles, both full-width tap targets (`h-touch-lg`).
2. Uses expressive DS icons and short labels only (no subtitle text).
3. Uses subtle hover/press feedback and softer elevation than `En ce moment`.

### Motion and Accessibility

1. New tap interactions use existing motion primitives (`ScaleOnTap`).
2. Reduced motion disables tap scaling (`useReducedMotion`) and global motion is minimized via `prefers-reduced-motion`.
3. Focus rings, touch sizes, and text hierarchy follow existing DS and accessibility rules.

### Responsive Behavior

Breakpoints reused from the existing Tailwind/DS setup:

1. `md` (tablet baseline): compact mode.
2. `lg` remains within compact behavior for tablet-class widths.
3. `xl` (larger desktop): returns to roomier spacing and larger typography.

Device behavior:

1. Desktop/Laptop:
   - Hero, `En ce moment`, and `Pour t'aider` keep premium spacing and clear tiering.
   - Decorative surfaces are richer but remain calm.
2. Tablet landscape:
   - Hero and `En ce moment` switch to compact typography and tighter vertical spacing.
   - `Pour t'aider` keeps two large tap targets but reduced internal whitespace.
   - The three blocks and bottom nav are visible together in normal iPad-class viewports.
3. Tablet portrait:
   - `TodayHeader` and `En ce moment` remain fully readable on first paint.
   - `Pour t'aider` may require a short scroll depending on content length.
4. Smartphone portrait:
   - Scroll remains acceptable.
   - Hero stays compact enough to avoid monopolizing the first screen.

## Limitations

1. Hero visuals are decorative only and do not carry extra business meaning.
2. Home does not expose full day details or timeline controls; those remain in `/child/my-day`.
3. Home keeps low information density on purpose and does not add extra chips or micro-copy.
4. Very small or unusual viewport heights may still require slight initial scroll.

## Future Work

Possible future enhancements without changing the current structure:

1. Context-aware decorative variants (morning/evening, school/vacation).
2. Seasonal hero accents tied to existing DS tokens only.
3. Optional profile-level visual preferences while preserving ADHD-safe defaults.
4. School/holiday contextual hero variants reusing the same responsive compact frame.
