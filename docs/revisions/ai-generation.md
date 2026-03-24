# Revisions AI Generation

## Overview
Parent AI generation now supports a reliable first scope for `concept` and `procedure`.
From `/parent/revisions`, parents can open `/parent/revisions/generate`, choose a type, enter subject/level/topic, and create a draft revision card.

## Data model
- Input: `subject`, `type`, `level`, `topic`
- Domain output:
  - `ConceptCard` (`src/lib/revisions/types.ts`)
  - `ProcedureCard` (`src/lib/revisions/types.ts`)
- Persistence: mapped to `CreateRevisionCardInput` and stored as a draft `StoredRevisionCard`

Canonical path:
- `generateRevisionAction` (`src/app/(parent)/parent/revisions/ai-actions.ts`)
- `generateConceptCardWithAI` or `generateProcedureCardWithAI` (`src/lib/revisions/generation.ts`)
- `createStoredRevisionCard` (`src/lib/api/revisions.ts`)

## Workflows
1. Parent submits generation form (concept or procedure).
2. Server action validates payload and calls domain generator.
3. OpenAI JSON is validated against the selected card schema.
4. Valid result is mapped to stored draft content and persisted.
5. Parent is redirected to `/parent/revisions/[cardId]`.

## UI behaviour
- DS form fields: subject, type, level, topic.
- Submit button shows loading while generation runs.
- Errors are returned as safe messages and shown with toast + inline feedback.

## Limitations
- Only `concept` and `procedure` generation are supported.
- Generated content should be reviewed before publication.
- OpenAI configuration/network issues return user-safe failures.

## Future work
- Extend AI generation to `vocab` and `comprehension` cards.
- Add richer post-generation editing and regeneration controls.
- Preserve richer variant-specific structures end-to-end.

## Troubleshooting
Required environment variable:
- `OPENAI_API_KEY`

Common server-safe error categories:
- missing key/config
- OpenAI network/HTTP failures
- invalid AI JSON output (parse or schema mismatch)
