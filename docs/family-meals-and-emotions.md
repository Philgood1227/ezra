# Family Meals And Emotions

## Overview

This module combines two lightweight family signals:

- parent-only meal organization with reusable recipes and ingredient catalog
- morning/evening mood check-in ("meteo interieure")

Goal: give parents practical weekly feedback without creating cognitive overload.

The UX direction follows kid-friendly meal trackers and emoji calm-check apps:

- very short inputs
- visual states first
- no complex interpretation in UI

## Data Model

### Meals

- `meals`
  - `family_id`, `child_profile_id`, `date`
  - `meal_type`: `petit_dejeuner | dejeuner | diner | collation`
  - `description`
  - `prepared_by_label` (texte libre: Papa, Maman, Babysitter, etc.)
  - `recipe_id` (optionnel, vers une recette reutilisable)

- `ingredients`
  - `family_id`, `label`, `emoji`, `default_unit`

- `recipes`
  - `family_id`, `title`, `description`

- `recipe_ingredients`
  - liste des ingredients d'une recette (quantite/unite)

- `meal_ingredients`
  - ingredients reels lies a chaque repas planifie

- `meal_ratings`
  - one row per meal
  - `rating`: `1..3` (`bof`, `bon`, `j'adore`)
  - optional `comment`

### Emotions

- `emotion_logs`
  - `family_id`, `child_profile_id`, `date`
  - `moment`: `matin | soir`
  - `emotion`: `tres_content | content | neutre | triste | tres_triste`
  - optional `note`
  - uniqueness: one log per `(child_profile_id, date, moment)`

## RLS And Access

- Parent:
  - meals/ingredients/recipes: create/update/delete/read for family child scope
  - emotion logs: read family child scope
- Child:
  - emotions: create/update own daily morning/evening logs

All checks are enforced both by RLS and server actions.

## Workflows

### Parent meal workflow

1. Open `/parent/meals`.
2. Add meal with date, type, description, preparer.
3. Attach ingredients directly to the meal.
4. Optionally save this meal as a reusable recipe.
5. Reuse recipes on future meals and auto-load their ingredients.
6. Track the consolidated ingredient list for the selected week.

### Child emotion workflow

1. Open `/child/emotions`.
2. Pick mood for `matin` and `soir`.
3. Optional short note per moment.
4. Existing value is updated (upsert) if changed.

### Parent readback

- Parent dashboard consumes meal entries + emotion logs for weekly summary.

## UI Behaviour

Emotions child screen:

- two cards (`Ce matin`, `Ce soir`)
- five emoji options each
- progress indicator (`x/2`)
- short save feedback

Parent meal screen:

- weekly grouped list by date
- free-text preparer field (with simple suggestions)
- ingredient line editor per meal (quantite, unite, note)
- reusable recipe selector
- parent ingredient catalog extension (emoji + libelle + unite)
- weekly consolidated ingredient list for planning/shopping
- edit/delete controls

## Limitations

- no calories/macros/nutrition scoring
- no long-term medical or psychology interpretation
- no meal photo upload in this phase
- one child focus in current dashboard flow
- no automatic quantity scaling by family size yet

## Future Work

- optional tags for meal context (cantine, maison, invite)
- gentle suggestion patterns from favorites/dislikes
- multi-child comparison with strict family scope
- optional weekly parent prompts when mood trend drops
