# Revisions Backend (Phase A)

Related Phase D document:
- `docs/revisions/ai-generation.md`
- `docs/revisions/library.md`

## Overview
This document defines the standalone revision cards backend introduced in Phase A.
It covers schema, RLS behavior, API surface, and expected data flow.

Scope for this phase:
- Database model for revision cards and progress
- Server-side API functions
- Validation and domain typing

Out of scope for this phase:
- AI generation pipeline
- Parent/child UI for revision cards
- Mission/Focus integrations

## Tables

### `public.revision_cards`
Stores revision cards authored by parents.

Columns:
- `id` (`uuid`, pk)
- `family_id` (`uuid`, fk -> `families.id`)
- `created_by_profile_id` (`uuid`, fk -> `profiles.id`, nullable)
- `type` (`text`, check: `concept | procedure | vocab | comprehension`)
- `title` (`text`)
- `subject` (`text`)
- `level` (`text`, nullable)
- `goal` (`text`, nullable)
- `tags` (`text[]`, default `{}`)
- `content` (`jsonb`, canonical structured payload for all variants)
- `content_json` (`jsonb`, legacy compatibility mirror)
- `status` (`text`, check: `draft | published`)
- `created_at`, `updated_at` (`timestamptz`)

### `public.revision_card_links`
Optional linkage table to connect cards to template tasks later.

Columns:
- `id` (`uuid`, pk)
- `family_id` (`uuid`, fk -> `families.id`)
- `revision_card_id` (`uuid`, fk -> `revision_cards.id`)
- `template_task_id` (`uuid`, fk -> `template_tasks.id`)
- `created_by_profile_id` (`uuid`, fk -> `profiles.id`, nullable)
- `created_at` (`timestamptz`)

Constraint:
- `unique (revision_card_id, template_task_id)`

### `public.user_revision_state`
Tracks per-child revision state per card.

Columns:
- `family_id` (`uuid`, fk -> `families.id`)
- `user_id` (`uuid`, fk -> `profiles.id`)
- `card_id` (`uuid`, fk -> `revision_cards.id`)
- `status` (`text`, check: `unseen | in_progress | mastered`)
- `stars` (`int`, default `0`, `0..5`)
- `last_reviewed_at` (`timestamptz`, nullable)
- `last_quiz_score` (`int`, nullable, `0..100`)
- `attempts` (`int`, default `0`)
- `created_at`, `updated_at` (`timestamptz`)

Constraint:
- primary key: `(user_id, card_id)`

Mapping to TypeScript:
- `revision_cards.id` -> `StoredRevisionCard.id`
- `revision_cards.type` -> card variant discriminator used for filtering
- `revision_cards.subject|level|title|status` -> top-level StoredRevisionCard fields
- `revision_cards.content` -> `StoredRevisionCard.content` payload
- `user_revision_state.user_id` -> `UserRevisionState.userId`
- `user_revision_state.card_id` -> `UserRevisionState.cardId`
- `user_revision_state.last_quiz_score + attempts` -> `UserRevisionState.quizScore`

## RLS Policies

### Revision Cards
- Family members can read cards in their family.
- Parents can read all statuses.
- Child/viewer profiles can read only `published` cards.
- Only parents can insert/update/delete cards.

### Revision Card Links
- Parent-only read/write policies (future integration support).
- Inserts/updates validate family consistency with linked card and template task.

### User Revision State
- Parents can read/write family user state rows.
- Children can read/write only their own rows.
- Child writes are constrained to published cards.

## Type and Validation Source of Truth

Runtime validation:
- `src/lib/revisions/validation.ts`

Domain model:
- `src/lib/revisions/types.ts`
- `src/lib/revisions/mappers.ts`

This keeps one schema source reused by API and mapping logic.

## Revision Domain Model (TypeScript)

### Overview
- Revision cards now have four explicit variants in the domain model:
- `concept`
- `procedure`
- `vocab`
- `comprehension`
- The canonical revision domain types are defined in `src/lib/revisions/types.ts` and exported through `src/lib/revisions/index.ts`.

### Data model
- `RevisionCard` is a discriminated union of:
- `ConceptCard`
- `ProcedureCard`
- `VocabCard`
- `ComprehensionCard`
- Shared discriminator type: `CardType = "concept" | "procedure" | "vocab" | "comprehension"`.
- Child progress state is modeled with `UserRevisionState`, including:
- identity (`userId`, `cardId`)
- review status (`RevisionStatus`)
- stars and last reviewed timestamp
- optional quiz attempt summary (`quizScore`)

### Workflows
- These types are the forward-compatible contract for:
- child revision card rendering and quiz flows
- parent dashboard creation and edition flows
- Detailed workflow behavior will be specified in later phases.

### UI behavior
- UI behavior is intentionally unchanged in this step.
- Existing screens still render the currently wired storage-backed card shape while the new union model is introduced for future wiring.

### Limitations
- Only the existing storage-backed card view is currently wired in UI flows.
- Variant-specific rendering for `concept`, `procedure`, `vocab`, and `comprehension` is not yet connected end-to-end.

### Future work
- Wire child `RevisionCardView` to the new variant `RevisionCard` union.
- Implement parent dashboard flows for variant-specific creation and edition.

## Child ConceptCard UI

### Overview
- The child revision screen now supports a domain-aware ConceptCard presentation.
- The layout follows this sequence:
- `Je retiens`
- `Je vois`
- `Mon truc`
- `A toi !`
- `Je me teste`

### Data model
- Child UI keeps receiving `StoredRevisionCard` data from existing API flows.
- `RevisionCardView` prepares a concept-focused internal view model and maps quiz inputs to the canonical `RevisionQuizQuestion` type.
- `RevisionQuiz` is typed with `RevisionQuizQuestion[]` as the single quiz type source in child UI.

### Workflows
- When a card is identified as concept (`type === "concept"` or stored `content.kind === "concept"`), the concept layout is rendered.
- The quiz section uses `RevisionQuiz` for answer selection and explicit verification.
- Non-concept cards continue to render through the fallback layout to preserve current behavior.

### UI behavior
- `Je vois` renders trusted backend HTML snippets in a dedicated reading block.
- `A toi !` renders exercises as a numbered list.
- Quiz feedback is immediate after pressing `Verifier`, with semantic success/error visual states.

### Limitations
- Full dedicated child layouts exist for ConceptCard, ProcedureCard, VocabCard, and ComprehensionCard.
- Generic storage cards still use the fallback rendering path.

### Future work
- Align parent-generated content shapes with domain-first card payloads end to end.
- Reuse the same domain-driven view model in parent preview/edit flows.

## Child ProcedureCard UI

### Overview
- The child revision screen now supports a dedicated ProcedureCard presentation.
- The layout follows this sequence:
- `Etapes`
- `Exemple`
- `Mon truc`
- `A toi !`
- `Je me teste`

### Data model
- Procedure rendering follows the domain `ProcedureCard` shape from `src/lib/revisions/types.ts`.
- `RevisionCardView` maps `StoredRevisionCard`/`StoredRevisionCardViewModel` procedure content into this domain shape via `src/lib/revisions/mappers.ts`.
- Procedure quiz questions use the same canonical `RevisionQuizQuestion` model used by Concept cards.

### Workflows
- When a card is identified as procedure (`type === "procedure"` or stored `content.kind === "procedure"`), the procedure layout is rendered.
- Steps and example sections render trusted backend HTML snippets.
- Exercise instructions (and optional visual support HTML) render in the `A toi !` section.
- `Je me teste` reuses `RevisionQuiz` with unchanged behavior.

### UI behaviour
- Child layout is single-column and mobile-first, aligned with existing Concept spacing and typography.
- Blocks are always visible in this step.
- Quiz behavior is unchanged: answer selection, explicit verify action, and semantic success/error feedback.

### Limitations
- Dedicated child layouts currently exist for Concept, Procedure, Vocab, and Comprehension.
- Generic storage cards still use the fallback rendering path.
- Parent structured editing for Procedure is currently less guided than Concept editing.

### Future work
- Expand Procedure-specific structured authoring controls.
- Add richer quality checks for procedure generation outputs.

## Child VocabCard UI

### Overview
- The child revision screen now supports a dedicated VocabCard presentation.
- The layout follows this sequence:
- `Mots`
- `Activites`
- `Je me teste`

### Data model
- Vocab rendering follows the domain `VocabCard` shape from `src/lib/revisions/types.ts`.
- `RevisionCardView` maps `StoredRevisionCard`/`StoredRevisionCardViewModel` vocab content into this domain shape via `src/lib/revisions/mappers.ts`.
- Vocab quiz questions use the same canonical `RevisionQuizQuestion` model used by Concept and Procedure cards.

### Workflows
- When a card is identified as vocab (`type === "vocab"` or stored `content.kind === "vocab"`), the vocab layout is rendered.
- Child reads each vocabulary entry (`term`, `translation`, example sentence, example translation).
- Child follows short activity hints in the `Activites` section.
- `Je me teste` reuses `RevisionQuiz` with unchanged behavior.

### UI behaviour
- Child layout is single-column and mobile-first, aligned with existing Concept/Procedure spacing and typography.
- `Mots` displays each word pair in a compact card row.
- `Activites` displays a short bullet list of practice prompts.
- Quiz behavior is unchanged: answer selection, explicit verify action, and semantic success/error feedback.

### Limitations
- Dedicated child layouts currently exist for Concept, Procedure, Vocab, and Comprehension cards.
- Generic storage cards still use the fallback rendering path.
- AI generation for Vocab is not implemented yet.

### Future work
- Improve parent structured Vocab editing controls.
- Implement AI-assisted Vocab generation flows.

## Child ComprehensionCard UI

### Overview
- The child revision screen now supports a dedicated ComprehensionCard presentation.
- The layout follows this sequence:
- `Texte`
- `Questions sur le texte`
- `Questions ouvertes`
- `Je me teste`

### Data model
- Comprehension rendering follows the domain `ComprehensionCard` shape from `src/lib/revisions/types.ts`.
- `RevisionCardView` maps `StoredRevisionCard`/`StoredRevisionCardViewModel` comprehension content into this domain shape via `src/lib/revisions/mappers.ts`.
- Structured fields include:
- `text`
- optional `textTranslation`
- `questions` (closed questions with choices)
- `openQuestions`
- `quiz` (interactive self-check via `RevisionQuizQuestion`)

### Workflows
- When a card is identified as comprehension (`type === "comprehension"` or stored `content.kind === "comprehension"`), the comprehension layout is rendered.
- Child first reads the text and optional translation.
- Child reviews closed and open comprehension questions.
- Child then self-tests in `Je me teste` using the interactive quiz component.

### UI behaviour
- Child layout is single-column and mobile-first, aligned with existing revision typography and spacing.
- `Texte` uses reading-oriented paragraph styles and supports optional translation as secondary context.
- `Questions sur le texte` shows question prompts and choices as a non-interactive recap.
- `Questions ouvertes` shows prompts as a numbered reflection list.
- `Je me teste` reuses `RevisionQuiz` with unchanged interaction and semantic success/error feedback.

### Limitations
- Child-side rendering is implemented; parent-side Comprehension editing currently relies on content JSON editing.
- AI generation for Comprehension cards is not implemented in this step.

### Future work
- Improve parent structured Comprehension editing workflows.
- Implement AI-assisted Comprehension card generation.
- Add richer pedagogy controls (difficulty progression, scaffolding hints).

## Child Revision UX Quick Wins (Wave 1)

### Overview
- Child revision view now keeps mode orientation explicit:
  - `Mode fiche` in sheet mode.
  - `Mode entrainement` in practice mode.
- Mode switching is available from both sides:
  - Sheet -> `Je m'entraine`
  - Practice -> `Voir la fiche`

### UI behavior
- Sheet mode uses a clearer CTA hierarchy:
  - Primary action: `Je m'entraine`
  - Secondary action: `Aller a Je me teste`
- Practice mode keeps direct access to quiz and now exposes a clear back action to sheet.
- Extra exercises feedback is now explicit:
  - Success summary card with generated quiz/mini-test counts.
  - Error message remains child-friendly and action-oriented.
  - Empty practice fallback card is shown when no section is available.

### Accessibility and cognitive clarity
- Mode is always visible through status badges to reduce orientation loss.
- Action labels are short and explicit.
- Error copy avoids raw technical messages in child-facing UI.

## Child Revision Guided Flow (Wave 2)

### Overview
- Practice mode is now focused on training only:
  - training sections (`A toi !`, `Mini test rapide`, `Je me teste`) are shown in the stepper,
  - study sections (`Je retiens`, `Je vois`, `Mon truc`) stay in sheet mode.

### UI behavior
- `StepSectionsNavigator` is used to move between practice steps only.
- Completion tracking widgets and manual step validation are removed from practice mode.
- `Nouveaux exercices` remains available to refresh/extend training content from the current card.

### Cognitive support
- Child keeps a clear split:
  - `Fiche` for understanding,
  - `Je m'entraine` for exercises and quiz.
- Practice mode avoids mixed “learn + validate section” signals.

## Child Practice Generation Guardrails (Wave 3)

### Overview
- Practice mode now exposes `Nouveaux exercices` only when the current card can actually support generation.
- The action remains visible but is explicitly disabled for unsupported cards, with a clear helper message.

### UI behavior
- If structured revision content is present and quiz practice is available:
  - helper text: `Genere de nouveaux exercices bases uniquement sur cette fiche.`
  - action button is enabled.
- If structured content is missing or incompatible:
  - helper text: `Nouveaux exercices indisponibles pour cette fiche.`
  - action button is disabled.

### Cognitive support
- Avoids “tap then error” loops for children.
- Keeps training intent explicit: generation appears only when pedagogically usable.

### Limitations
- Guardrails are UI-level and depend on current card payload shape.
- Generation quality still depends on AI output and source content quality.

## Child Practice Recovery & Jump Flow (Wave 4)

### Overview
- Practice mode now recovers faster from generation failures and improves post-generation navigation.

### UI behavior
- When `Nouveaux exercices` fails:
  - error card keeps the child-safe message,
  - a direct `Reessayer` action is shown in the same card.
- When generation succeeds:
  - if `miniTest` exists, practice auto-focuses `Mini test rapide`,
  - otherwise it auto-focuses `Je me teste`.
- The target section is opened automatically so new content is immediately visible.

### Cognitive support
- Reduces dead-ends after transient failures.
- Avoids extra taps to find where new generated content landed.

### Limitations
- Retry uses the same server action path and backend availability constraints.

## Parent Revisions List & Draft Creation

### Overview
- Parents now have two dedicated entry points:
- `/parent/revisions` to browse existing revision cards.
- `/parent/revisions/new` to create a manual draft card.
- `/parent/revisions/generate` to create an AI-assisted draft.

### Data model
- The list view is backed by `StoredRevisionCard`.
- Server-side filtering uses `listStoredRevisionCards` with:
- `subject`
- `type` (`concept | procedure | vocab | comprehension`)
- `level`
- `status` (`draft | published`)
- Manual creation uses a type-aware default `content` JSON payload:
- `content.kind` + canonical base keys (`summary`, `steps`, `examples`, `quiz`, `tips`)
- optional typed payloads (`content.concept`, `content.procedure`, `content.vocab`, `content.comprehension`)

### Workflows
- Open the Revisions module from parent navigation and land on `/parent/revisions`.
- Apply subject/type/level/status filters to narrow the library.
- Use `Nouvelle fiche` to open `/parent/revisions/new`.
- Use `Generer une fiche` to open `/parent/revisions/generate`.
- `Nouvelle fiche` subtitle: `Create a minimal draft card manually (subject, type, level, title).`
- `Generer une fiche` subtitle: `Create an AI-assisted draft from subject, level, and topic.`
- Submit subject, type, level, and title to save a new draft.

### UI behavior
- The list uses DS components (`Card`, `Badge`, `Button`, `Select`) and keeps publish/delete actions.
- The new-page form uses DS inputs/selects and server action submission.
- Manual creation supports all four types (`concept`, `procedure`, `vocab`, `comprehension`).
- Success and error feedback is surfaced immediately in the form flow.

### Limitations
- Manual draft creation remains intentionally minimal.
- Generated/manual content still requires parent review before publication.

### Future work
- Extend AI generation to `vocab` and `comprehension`.
- Add richer type-specific editing controls beyond the current baseline.
- Add revision history/versioning in parent flows.

## Parent Multi-Type Edit

### Overview
- Parents can now edit revision cards on a dedicated route:
- `/parent/revisions/[cardId]/edit`
- The page combines a structured form and a live child preview.

### Data model
- Source entity remains `StoredRevisionCard`.
- Save flow maps edited fields back into `StoredRevisionCard.content` and persists through canonical API update.
- `concept` uses structured fields (`Je retiens`, `Je vois`, `Mon truc`, `A toi !`, `Quiz`).
- `procedure`, `vocab`, and `comprehension` support full content editing through typed JSON payload editing in the same route.

### Workflows
- From `/parent/revisions`, open a card and go to `Edit`.
- Update card content by type, then save.
- Save changes from the edit page.
- Preview panel shows the same child renderer (`RevisionCardView`) used by Ezra.

### UI behaviour
- Form and preview are displayed side-by-side on desktop and stacked on smaller screens.
- Save uses server action validation and returns user-safe success/error feedback.
- Preview is read-only and intentionally mirrors child view (no parent-only controls).

### Limitations
- Concept uses richer section-by-section controls than the other types.
- Non-concept editing currently relies on full content JSON editing in the same page.
- Quiz editing remains intentionally lightweight (question/choices/answer).

### Future work
- Add fully structured visual editors for `procedure`, `vocab`, and `comprehension`.
- Add richer quiz tooling and advanced content editing workflows.
- Add revision history/versioning in parent edit flows.

## AI-assisted Generation (Concept + Procedure)

### Overview
- Parents can generate draft cards with AI from the revisions library flow.
- Entry point: `/parent/revisions/generate` (reachable from `/parent/revisions`).

### Data model
- Input model: `subject`, `type`, `level`, `topic`, `source` (`type` supports `concept` and `procedure`).
- Domain generation model:
- `ConceptCard` via `generateConceptCardWithAI`
- `ProcedureCard` via `generateProcedureCardWithAI`
- Structured payload model:
- `content.structured` (`StructuredRevisionContent`)
- `content.generatedExercises` (`ExercisesPayload`)
- Persistence model: generated domain card is mapped to `CreateRevisionCardInput` and saved as a `StoredRevisionCard` draft.
- Canonical generation path:
- `generateRevisionAction`
- `generateConceptCardWithAI` or `generateProcedureCardWithAI`
- `createStoredRevisionCard`

### Workflows
- Parent opens `/parent/revisions` and clicks `Generate a revision`.
- Parent fills `Subject`, `Type`, `Level`, `Topic`, and source lesson text.
- Server action validates input, calls the domain generator, validates AI JSON, maps to stored content, and persists draft.
- On success, parent is redirected to `/parent/revisions/[cardId]`.
- The new draft appears in `/parent/revisions` with status `draft`.

### UI behaviour
- Form uses DS components (`Card`, `Input`, `Select`, `Button`) with loading state on submit.
- Success and error feedback use the DS toast pattern plus inline form error text.
- Library empty state now exposes both manual and AI creation calls to action.

### Limitations
- AI generation currently supports `ConceptCard` and `ProcedureCard`.
- Generated content may still require parent review before publish.
- Missing or invalid OpenAI configuration returns a user-safe server error.

### Future work
- Extend generation to `vocab` and `comprehension` cards.
- Add richer parent editing and regeneration tools.
- Tighten end-to-end domain mapping so stored content can preserve full variant-specific structure.

## Child Structured Experience (Sheet + Practice)

### Overview
- Child revision screen now has two explicit modes:
- `Fiche` (structured content)
- `Je m'entraine` (guided practice)
- This separates reading/revision from interaction/training without changing the backend schema.

### Data model
- `revision_cards.content.structured` is the primary source for the `Fiche` mode.
- `revision_cards.content.generatedExercises` can feed extra quiz/mini-test sets in `Je m'entraine`.
- Both remain inside canonical `revision_cards.content` JSON.

### Workflows
- Parent provides source text.
- AI generates structured card content + first exercises.
- Parent adjusts content in the edit page.
- Child opens the card:
- starts in `Fiche`
- switches to `Je m'entraine` for step-based practice
- can request `Nouveaux exercices` without leaving the page.

### UI behaviour
- `Fiche` mode renders compact structured blocks (`Je retiens`, `Je vois`, `Mon truc`, optional `Conjugaison`) with highlight chips.
- `Je m'entraine` mode uses the step navigator + section accordion + `RevisionQuiz`.
- CTA `Aller a Je me teste` jumps directly to the quiz step.
- `Nouveaux exercices` calls server generation and updates practice sections in-place.

### Limitations
- Structured rich editing is strongest for concept cards.
- Procedure generation is available, but vocab/comprehension structured AI generation is still pending.
- Extra exercises are generated from structured content and are session-focused.

### Future work
- Add structured AI generation for vocab/comprehension.
- Extend structured visual editor depth for all card variants.
- Add optional persistence/versioning for generated extra exercises.

## API Layer

Server API module:
- `src/lib/api/revisions.ts`

Functions:
- `listRevisionCardsForFamily()`
- `listStoredRevisionCards(params)`
- `createStoredRevisionCard(input)`
- `getStoredRevisionCardById(id)`
- `updateStoredRevisionCard(input)`
- `getRevisionCardById(id)`
- `createRevisionCard(input)`
- `updateRevisionCard(id, patch)`
- `getUserRevisionState(userId, cardId)`
- `upsertUserRevisionState(state)`
- `listUserRevisionStatesForUser(userId)`
- `upsertRevisionProgress(input)`

Behavior:
- Parent-only create/update for cards
- Child-only upsert for own progress
- Automatic fallback to demo store when Supabase is disabled

## Data Flow (Phase A)
1. Parent-authored cards are persisted in `revision_cards` with top-level metadata + `content` JSON.
2. Child reads published cards through `list/get` API.
3. Child progress/state updates write to `user_revision_state`.
4. Optional task linkage is stored in `revision_card_links` for future phases.

## Future Work
- Phase B: AI card generation pipeline and review workflow.
- Phase C: child tool UI and parent management UI.
- Optional analytics rollups for progress trends.


## Parent Books & Revisions

### Overview
- Parents now have a dedicated resources entry point at `/parent/resources/books`.
- The screen is split into two tabs:
- `Livres` for PDF manual management.
- `Fiches depuis les livres` for AI-assisted draft creation from indexed manuals.

### Data model
- Manuals are stored in `public.revision_books` with:
- subject (`french | maths | german`)
- level, title, optional school year
- file metadata (`file_name`, `file_path`)
- indexing lifecycle (`uploaded | indexing | indexed | error`)
- optional `indexed_text` for retrieval context.
- Generated cards keep using `public.revision_cards` and now store provenance in `content.source`:
- `sourceType: "book"`
- `bookId`
- optional `bookTitle`.

### Workflows
- Parent opens `/parent/resources/books`.
- In `Livres`:
- upload PDF + subject + level + title.
- launch indexing (`uploaded -> indexing -> indexed`).
- In `Fiches depuis les livres`:
- select an indexed manual.
- choose target card type (`concept` or `procedure`).
- provide topic/notion and generate.
- On success, parent is redirected to `/parent/revisions/[cardId]/edit`.

### UI behavior
- The `Livres` tab shows status badges, added date, and indexing action.
- The `Fiches depuis les livres` tab pre-fills context from selected indexed manual.
- Revisions list (`/parent/revisions`) now shows a source badge for book-generated cards.

### Limitations
- Indexing and retrieval are intentionally minimal in this iteration.
- `findRelevantBookChunks` currently uses a stub context path (ready for full RAG wiring).
- AI generation from books currently targets `concept` and `procedure`.

### Future work
- Wire full PDF extraction + chunking + embeddings.
- Improve retrieval ranking and citation traceability.
- Extend generation-from-book to `vocab` and `comprehension`.
