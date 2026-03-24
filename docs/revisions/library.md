# Revisions Library (Parent)

## Overview
The parent Revision Library provides a management workflow for revision cards after generation:
generate -> review -> publish -> child access.

Route:
- `/parent/revisions`

## Data model
Displayed fields per card:
- `id`
- `title`
- `subject`
- `level`
- `tags`
- `status` (`draft` or `published`)
- `kind` (`generic`, `concept`, `procedure`, `vocab`, `comprehension`)
- `created_at` / `updated_at`
- `created_by_profile_id` (if available)

Filtering inputs supported by API:
- `status` (`all`, `draft`, `published`)
- `kind` (`all`, `generic`, `concept`, `procedure`, `vocab`, `comprehension`)
- `subject` (starts-with)
- `search` (title contains)

## Workflows
1. Parent opens `/parent/revisions` and reviews generated cards.
2. Parent filters by status/kind/search to find cards quickly.
3. Parent publishes or unpublishes cards.
4. Parent deletes cards with explicit confirmation.
5. Child route `/child/revisions/[cardId]` remains accessible only for published cards.

## UI behaviour
- Status and kind filters are dropdowns.
- Search field uses debounce (400ms) before updating URL/query filters.
- List rows show title, subject, level, status, kind, and last update date.
- Actions per row:
  - `Ouvrir` (parent detail route: `/parent/revisions/[cardId]`)
  - `Publier` / `Depublier`
  - `Supprimer` (confirmation dialog required)
- After status or delete mutation, the page refreshes and server paths are revalidated.

## Detail page
Route:
- `/parent/revisions/[cardId]`

Behaviour:
- Parent can read the full card preview (summary, steps, examples, quiz, tips) in read-only mode.
- Parent can publish/unpublish and delete directly from detail.
- Child access link is shown on detail page:
  - published card: direct child route link
  - draft card: same link shown with warning that child only sees published cards
- After publish/unpublish/delete:
  - `/parent/revisions` is revalidated
  - `/parent/revisions/[cardId]` is revalidated
  - `/child/revisions/[cardId]` is revalidated

## Limitations
- Search is currently title-focused (subject has API support but no dedicated free-text search input yet).
- AI generation currently supports `concept` and `procedure`.

## Troubleshooting
- If Supabase env is missing/disabled, the parent library does not use demo data fallback.
- The page surfaces an explicit code: `SUPABASE_NOT_CONFIGURED`.
- Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before using `/parent/revisions`.

## Future work
- Rich parent detail enhancements (history, moderation notes, publication timeline).
- Extend AI generation to `vocab` and `comprehension`.
- Link cards to tasks (`revision_card_links`) in parent workflow.
- Library analytics (publication cadence, usage, completion trends).
