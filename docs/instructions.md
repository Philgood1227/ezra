# Instructions Architecture

## Overview
Ezra template tasks support two instruction fields:
- `description`: plain-text fallback.
- `instructions_html`: rich-text primary content.

Child mission rendering always prefers rich HTML when available.

## Data model
`template_tasks` stores:
- `description` (`TEXT | NULL`)
- `instructions_html` (`TEXT | NULL`)

`description` stays editable for compatibility and fallback use cases.

## Parent editing workflow
In the Parent day-template editor:
- Parents edit `description` as plain text.
- Parents edit `instructions_html` with the DS `RichTextEditor`.
- Initial editor value:
  - `instructions_html` when present.
  - otherwise escaped `<p>{description}</p>` when description exists.
  - otherwise empty content.

## Sanitization rules
Before persistence, `instructions_html` is sanitized through the shared mission sanitizer in `src/lib/day-templates/instructions.ts`.

Allowed tags:
- `p`, `br`
- `strong`, `b`, `em`, `i`, `u`, `mark`
- `ul`, `ol`, `li`
- `blockquote`
- `a`

Dangerous tags and unsafe attributes/URLs are stripped.

## Astuce marker convention (Child Mission Drawer)
The mission drawer supports one render-time tip convention, without new DB fields:

- Marker: a `blockquote` starting with `Astuce:`
- Example:
  - `<blockquote><p>Astuce: Relis d'abord les mots en gras.</p></blockquote>`

During rendering:
1. HTML is sanitized with `sanitizeMissionHtml`.
2. `splitMissionInstructionsHtml` extracts the first matching `blockquote` into `tipHtml`.
3. Remaining content becomes `mainInstructionsHtml`.

If no marker is found, `tipHtml` is `null` and no Astuce section is displayed.

## Priority logic
Instruction resolution uses:
1. `instructions_html` (trimmed, if present)
2. escaped fallback `<p>{description}</p>`
3. `null` if neither exists

This is implemented by `resolveTaskInstructionsHtml`.

## UI behavior
Parent sees:
- existing plain `Description` field
- new `Instructions (rich text)` field with formatting tools (bold, italic, lists, links)

Child consumes:
- resolved HTML from the existing mission instruction pipeline
- sanitized HTML output for rendering safety

## Focus Mode rendering
### Overview
Focus Mode reuses the same instruction pipeline as Mission Drawer:
- `sanitizeMissionHtml` for safe rendering
- `splitMissionInstructionsHtml` to split:
  - `mainInstructionsHtml`
  - optional `tipHtml`

The Astuce convention is unchanged:
- only the first `blockquote` starting with `Astuce:` is extracted into the tip section.
- no additional markers are supported.

### UI behaviour
- Focus remains execution-first: timer/pomodoro interactions stay central, with reduced metadata noise.
- Overlay and page presentations share the same content sections:
  - contextual header (category + mission/task title + light meta)
  - timer stage
  - instruction sections (`Ce que tu dois faire`, optional `Astuce`)
- Existing callbacks/workflows remain unchanged (`onClose`, `onSessionComplete`, mission completion actions).

### Visual hierarchy
- Timer hierarchy:
  - timer stage has the strongest visual weight (dedicated focus surface)
  - control actions are secondary/tertiary
  - completion action remains primary
- Instructions readability rules:
  - mission rich text uses consistent rhythm (line height, spacing, list indentation)
  - links remain clearly styled and accessible
  - optional Astuce section uses a calm informational tone, not warning/danger styling
- Drawer vs Focus differentiation:
  - Drawer is for inspection/detail browsing
  - Focus is for execution with stronger timer presence and calmer, reduced UI density

## Limitations
- No structured instruction model (`instructions_steps`) yet.
- Toolbar is intentionally minimal (bold/italic/lists/links).
- Focus visual polish does not change timer/session business rules.

## Future work
- Add structured steps/tips model on top of `instructions_html`.
- Extend toolbar capabilities if product requirements expand.
- Keep sanitizer and resolver as single sources of truth.
- Extend Focus-specific visual tokens/components in DS if additional focus variants are needed.
