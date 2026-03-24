# Header density and typography tokens

## Purpose

Header compaction is driven by design-system typography tokens so density changes stay consistent across `/child` and do not rely on one-off class tweaks.

## Tokens

Defined in `src/app/globals.css`:

- `--text-page-title`
- `--text-card-title`
- `--text-section-title`
- `--lh-tight`
- `--lh-normal`
- `--lh-relaxed`

Utility classes:

- `.text-page-title`
- `.text-card-title`
- `.text-section-title`

## Rules

1. Use DS text utilities for page/header/card titles instead of local hardcoded font sizes.
2. Prefer spacing/density updates at component container level (`py`, `gap`, control height) rather than shrinking text ad hoc.
3. Keep hierarchy stable:
   - page title > key metric (temperature) > card/section title > metadata.
4. Do not reintroduce local `text-[...]` hacks for recurring header typography.

