# Parent Dashboard

## Overview

Route: `/parent/dashboard`

Purpose: provide a weekly operational summary for one child, combining:

- tasks completion and points
- mood trend
- meal feedback
- current-day load and assignment split

The dashboard reads existing domain data and does not mutate gamification rules.

## Data Inputs

Aggregated from:

- `task_instances`
- `daily_points`
- `emotion_logs`
- `meals` + `meal_ratings`
- `school_diary_entries` (weekly count)

In demo mode, equivalent in-memory stores are used.

## Domain Layer

Main computation lives in `src/lib/domain/dashboard.ts`.

### Week framing

- `weekStart` parameter (date key)
- helper generates 7 date keys
- supports previous/next week navigation

### Core metrics

- Completion rate (week):
  - `completedTasks / totalTasks * 100`
- Daily points:
  - sum from `daily_points.points_total`
- Average mood score:
  - emotion mapped to `[-2, -1, 0, 1, 2]`
- Favorite meals:
  - count meal labels with rating `3`
- Bof streak:
  - count recent rating `1` in sequence
- Today load score (0..5):
  - based on number/type of tasks for current day
- Assignment share:
  - grouped counts (`Enfant`, `Parent`, `Famille`)

## Widgets

### 1) Semaine d'un coup d'oeil

- week label (`dd/mm - dd/mm`)
- weekly completion percentage
- weekly points total
- 7-day mini cells with daily completion + points

### 2) Emotions de la semaine

- dominant emoji per day
- short mood message from average score

### 3) Repas et preferences

- top favorite meals (rating `3`)
- warning text if repeated `bof` ratings

### 4) Charge d'aujourd'hui

- score gauge `0..5`
- label (`legere`, `moyenne`, `chargee`)
- assignment breakdown chips
- weekly school diary entries count

### 5) Priorites parent (action-first)

- A card at the top now highlights 3 recommended actions for the current week.
- Actions are derived from existing metrics (load, completion rate, diary volume, meal streaks).
- Each action includes a direct CTA to the relevant parent module.
- The card also exposes hub shortcuts:
  - `Modules organisation` (`/parent/organization`)
  - `Modules famille` (`/parent/family`)
- Visual harmonization:
  - uses DS premium styles to align parent CTA rhythm with child UX language.
  - top summary panel now uses elevated child-like surface styling while preserving parent information density.

## Parent Usage Guidance

Suggested weekly routine:

1. Check completion + points to spot overload/underload.
2. Read mood strip for repeated low states.
3. Review meal feedback to adapt menus.
4. Use load widget to adjust today planning.

This keeps decisions concrete and family-local without overfitting on one signal.

## Constraints

- per-family scope only
- no cross-family analytics
- no achievement/gamification rule rewrite from dashboard
- no hidden scoring model: formulas are simple and deterministic

## Future Work

- multi-child switcher in the dashboard header
- richer trend comparisons (week over week)
- optional exported weekly recap
- configurable load weighting by task category
- confidence scoring for recommendation priority ordering

## Revisions Module Entry

- Parent navigation includes a Revisions section:
- `/parent/revisions` for list and filtering.
- `/parent/revisions/new` for manual draft creation.
- `/parent/revisions/generate` for AI-assisted draft generation (`concept` and `procedure`).
- `/parent/revisions/[cardId]/edit` for multi-type card editing with live child preview.

## Revisions Resources Entry

- Parent navigation now includes `Livres & fiches` at `/parent/resources/books`.
- This module provides:
- manual PDF upload and indexing status tracking.
- generation of revision drafts from indexed manuals.
- Generated cards continue through the existing revisions flow (`/parent/revisions` and `/parent/revisions/[cardId]/edit`).
