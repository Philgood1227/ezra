# Mission Drawer Design Contract

Date: 2026-03-07  
Scope: Child missions drawer (`/child`, bloc "Tableau des quêtes")

## Goal

Turn mission drawer styling from one-off tweaks into a durable Design System contract:

- tokenized values
- semantic CSS classes
- explicit usage rules
- test guards

## Source of Truth

- Tokens and classes: `src/app/globals.css`
- Component using the contract: `src/components/missions/MissionsSummaryCard.tsx`
- Regression guard: `src/components/missions/__tests__/missions-summary-card.test.tsx`

## DS Tokens (mission drawer list)

Defined in `:root`:

- `--radius-mission-list-row: 16px`
- `--radius-mission-list-footer: 16px`
- `--ds-mission-list-font-size: 16px`
- `--ds-mission-list-line-height: 24px`
- `--ds-mission-list-font-weight: 400`
- `--ds-mission-list-gap-y: 12px`
- `--ds-mission-list-padding-x: 20px`
- `--ds-mission-list-padding-y: 16px`
- `--ds-mission-list-card-padding-x: 16px`
- `--ds-mission-list-card-padding-y: 16px`
- `--ds-mission-list-footer-padding-x: 16px`
- `--ds-mission-list-footer-padding-y: 12px`

## Semantic Classes (force-of-law layer)

Typography foundation:

- `.mission-list-drawer-font`

Progress separator:

- `.mission-list-drawer-progress-track`
- `.mission-list-drawer-progress-fill`
- `.mission-list-drawer-progress-fill--indigo`
- `.mission-list-drawer-progress-fill--purple`
- `.mission-list-drawer-progress-fill--emerald`

Mission list and cards:

- `.mission-list-drawer-list`
- `.mission-list-drawer-row`
- `.mission-list-drawer-row--indigo`
- `.mission-list-drawer-row--purple`
- `.mission-list-drawer-index`
- `.mission-list-drawer-index--indigo`
- `.mission-list-drawer-index--purple`
- `.mission-list-drawer-pill`
- `.mission-list-drawer-pill--indigo`
- `.mission-list-drawer-pill--purple`

Bottom encouragement card:

- `.mission-list-drawer-footer-shell`
- `.mission-list-drawer-footer-card`
- `.mission-list-drawer-footer-icon`
- `.mission-list-drawer-footer-text`

## Usage Rules

- Always compose mission drawer rows with DS semantic classes.
- Keep category variants in the DS variant classes only.
- Keep typographic base for drawer blocks at `16/24/400` unless explicitly overridden in contract.
- Keep encouragement text style at `text-sm / 14px`, `font-medium`, gray-700 through `.mission-list-drawer-footer-text`.

## Prohibited Patterns

- Raw duplicated Tailwind class chains for drawer row layout/colors/radius.
- New ad-hoc radii for these surfaces outside tokens.
- Inline style overrides for typography in the mission drawer.

## Change Procedure

1. Update DS token(s) or semantic class(es) in `src/app/globals.css`.
2. Keep consumers on semantic classes (no direct utility drift).
3. Update/extend regression tests.
4. Document contract changes in this file.

## QA Checklist

- Drawer typography baseline remains `16/24/400`.
- Row 1 visual tone is indigo; row 2 visual tone is purple.
- Progress separator keeps 12px rounded track and animated fill.
- Bottom encouragement card keeps orange-to-pink gradient, 16px radius, icon + text alignment.
