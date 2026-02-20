# Knowledge And Achievements

## Overview

This module groups two child motivation supports:

- a simple knowledge base (fiches d'aide) for homework autonomy
- a badge system (succes) focused on effort and routine

Design goals:

- low cognitive load
- short, structured content
- visible progress and positive reinforcement

The interaction style is inspired by kid-friendly flashcard apps and badge systems used in educational products, while staying family-private and simple.

## Data Model

Knowledge:

- `knowledge_subjects`
  - one subject per family (e.g. francais, maths, allemand)
- `knowledge_categories`
  - grouped by subject (e.g. grammaire, problemes)
- `knowledge_cards`
  - card content stored in structured JSON (`content`)
- `knowledge_favorites`
  - child favorites (`child_profile_id`, `card_id`)

Achievements:

- `achievement_categories`
  - visual/thematic grouping (routine, devoirs, concentration)
- `achievements`
  - badge definition (`icon`, `condition`, `auto_trigger`)
- `achievement_instances`
  - unlocked badge events per child (`unlocked_at`)

Timeline linking:

- `template_tasks.knowledge_card_id` links a task to a fiche d'aide.

## RLS And Access

- Parent:
  - CRUD knowledge subjects/categories/cards
  - enable/disable seeded achievements
- Child:
  - read knowledge content
  - toggle own favorites
  - read unlocked/locked achievements

Family isolation is enforced by RLS policies and role checks in server actions.

## Workflows

### Parent

1. Open `/parent/knowledge`.
2. Create subjects, then categories, then cards.
3. Fill card sections with simple blocks (Rappel, Exemple, Astuce).
4. In day template editor, optionally link a card to a homework block.
5. Open `/parent/achievements` and enable/disable seeded badges.

### Child

1. Open `/child/knowledge` (Decouvertes).
2. Choose a subject, then category, then card.
3. Mark useful cards as favorites.
4. From `Ma journee`, open linked card with "Voir la fiche d'aide".
5. Validate tasks and gain points.
6. Open `/child/achievements` (Succes) to see unlocked badges.

## Achievement Logic

Implementation is centralized in `src/lib/domain/achievements.ts`.

Supported condition vocabulary:

- `daily_points_at_least`
- `tasks_completed_in_row`
- `pomodoros_completed`

Current MVP behavior:

- seeded catalog is created automatically
- unlock evaluation runs after task status updates
- an achievement is unlocked once (idempotent via instances check)
- UI only renders states; it does not compute rules

## UI Behaviour

Knowledge (child):

- subject selector cards at top
- category list per subject
- card tiles with title, summary, difficulty
- card detail displays structured sections and bullets
- favorite toggle on each card

Achievements (child):

- categories with badge grids
- unlocked badges are colored and dated
- locked badges are muted with a condition hint
- top progress bar (`debloques / total`)
- short celebration banner when a recent unlock exists

## Limitations

- no spaced repetition
- no adaptive recommendation algorithm
- no public leaderboard
- no custom rule builder for parents in MVP

## Future Work

- richer condition operators (weekly streak, subject-specific goals)
- optional parent-created custom badges with safe templates
- favorite-based quick access in focus/homework flow
