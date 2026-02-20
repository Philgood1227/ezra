# Child Home Logic

## Purpose

This document describes runtime logic for `/child` and clarifies what changed in UI vs. business behavior.
Responsive compact variants for tablet are presentation-only and do not alter any of the rules below.

## Data Source

Home data is still consolidated by `getChildHomeData(profileId)` in `src/lib/api/child-home.ts`.

Main fields used by UI:

1. `currentTask`, `nextTask`
2. `nowState`
3. `activeSchoolBlockEndTime`
4. `date`

No schema, routing, or auth behavior changed.

## Now/Next Rules

The core behavior is unchanged:

1. `Maintenant` shows the active task when available.
2. `A suivre` shows the next task when available.
3. `school_block`, `before_first_task`, `between_tasks`, and `after_last_task` still use fallback guidance messages.
4. CTA still sends the child to `/child/my-day`.

## UI-Only Icon Mapping

`src/components/child/home/child-home-icons.tsx` adds a typed mapping:

1. `category-routine` -> routine icon
2. `category-ecole` -> school icon
3. `category-repas` -> meal icon
4. `category-sport` -> sport icon
5. `category-loisir` -> leisure icon
6. `category-calme` -> calm icon
7. `category-sommeil` -> sleep icon

Fallback: unknown keys use the routine icon.

This mapping is presentation-only and does not influence task ordering or state logic.

## Motion Rules

Press interactions use `ScaleOnTap` and inherit reduced-motion safeguards:

1. Normal mode: subtle press scale and shadow change.
2. `prefers-reduced-motion`: tap scaling is disabled.

No continuous or attention-heavy motion is introduced on Home.

## Visual Limit

Hero and card decorative layers are presentation-only:

1. They do not alter task resolution, scheduling, or CTA targets.
2. Home remains intentionally focused on "now/next" plus quick access to help.
