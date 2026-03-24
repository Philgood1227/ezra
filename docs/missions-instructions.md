# Missions instructions storage

## Fields

- `template_tasks.description` stores plain-text instructions (max validated at 4000 chars in server actions).
- `template_tasks.instructions_html` stores rich HTML instructions (max validated at 20000 chars in server actions).

## Resolution rules

The app resolves `instructionsHtml` from template tasks in one place:

1. Use `instructions_html` when present and non-empty.
2. Otherwise fallback to escaped `description` wrapped in `<p>...</p>`.
3. Otherwise return `null`.

Implementation: `src/lib/day-templates/instructions.ts` (`resolveTaskInstructionsHtml`).

## Sanitization rules

- HTML is sanitized at render-time in missions UI (`sanitizeMissionHtml` in `MissionDrawer`, reused by `FocusModeMission`).
- Description fallback is HTML-escaped before being wrapped in a paragraph.

