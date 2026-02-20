# Cinema Module

## Overview

The cinema module organizes family movie night with simple and fair rules.

Goals:

- keep the decision process transparent
- keep setup fast for parents
- make the child part of the weekly routine
- reflect the chosen movie in `Ma journee`

This is intentionally lightweight and inspired by family movie picker patterns: rotation + explicit choices + visible final decision.

## Data Model

- `movie_sessions`
  - one planned session (`date`, `time`, `status`)
  - includes proposer/picker profile ids
  - stores `chosen_option_id` when decided
- `movie_options`
  - up to 3 options per session (`title`, `platform`, `duration_minutes`)
- `movie_votes`
  - one vote per profile and session (`unique(session_id, profile_id)`)

Status lifecycle:

- `planifiee` -> `choisie` -> `terminee`

## RLS And Access

- Parent:
  - create/edit sessions and options
  - decide chosen movie if needed
- Child:
  - read upcoming session and options
  - submit/update own vote

All access is family-scoped by RLS and server-side checks.

## Workflows

### Parent configuration

1. Open `/parent/cinema`.
2. Create a session with date/time.
3. Set proposer/picker manually or use rotation helper.
4. Enter 3 movie options.
5. Save session.

### Child vote

1. Open `/child/cinema`.
2. See next session and 3 large option cards.
3. Tap one option to vote.
4. UI shows "Ton choix".

### Decision and timeline integration

1. When a movie is chosen, session status becomes `choisie`.
2. The chosen movie is surfaced in `Ma journee` as an evening block:
   - `Film : [titre]`
3. The block is read-only and clearly identified as cinema event.

## Fairness Logic

Domain helpers live in `src/lib/domain/cinema-rotation.ts`.

Current MVP rules:

- simple circular rotation for proposer/picker
- deterministic vote winner helper (highest vote count)
- no opaque recommendation or weighted algorithm

## UI Behaviour

Parent (`/parent/cinema`):

- upcoming sessions list with status
- creation form with date/time and option fields
- clear labels for proposer/picker and platforms

Child (`/child/cinema`):

- next upcoming session first
- large touch-friendly cards for options
- explicit vote state text

Timeline (`/child/my-day`):

- chosen movie appears as a dedicated evening event

## Limitations

- no automatic external catalog lookup
- no recommendation engine
- no multi-round voting
- no conflict resolution for tie votes beyond simple fallback

## Future Work

- optional tie-break strategy configurable by parent
- reminders for cinema day
- richer movie metadata (poster, age rating) with strict parental control
