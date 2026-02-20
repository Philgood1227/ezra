# Gamification And Timers

## Overview

This module adds immediate, visible feedback for ADHD-friendly routines:

- task validation with simple status steps
- instant points feedback
- clear progress to next reward
- optional focus timers (visual, non-blocking)

Design intent:

- keep interactions short and explicit
- reward action quickly ("I did it -> I gain points now")
- support focus without punishing interruptions

## Data Model

- `task_instances`
  - concrete child task for one date
  - stores status, points base, points earned
- `daily_points`
  - one row per child per date with aggregated points
- `reward_tiers`
  - reward thresholds configured by parents
- `template_tasks.points_base`
  - default points copied into instances

## Domain Logic

`src/lib/domain/task-status.ts`

- allowed transitions:
  - `a_faire -> en_cours`
  - `en_cours -> termine`
  - `a_faire -> termine`

`src/lib/domain/points.ts`

- award points only when moving to `termine` for the first time
- compute next reward target and progress percentage

## Parent Workflow

1. In day template editor, set points for each block (`points_base`).
2. In `/parent/rewards`, define reward tiers:
   - label
   - points required
   - optional description
3. Parent dashboard shows today's child points snapshot.

## Child Workflow

1. Open `/child/my-day`.
2. Validate tasks:
   - tap "Commencer" (`en_cours`)
   - tap "Valider la tâche" (`termine`)
3. Observe instant effects:
   - task state turns success
   - `+N points` micro-feedback
   - daily points bar updates
4. Open focus mode from task card:
   - run simple timer or Pomodoro
   - end and validate task manually

## UI Behaviour

- `DailyPointsBar`
  - displays `Points du jour : X / Y`
  - shows next reward label
  - caps visual progress at 100%
- `TimeTimer`
  - circular countdown wedge
  - controls: start, pause, reset
  - polite `aria-live` updates (not every second)
- `PomodoroTimer`
  - work/break phase display by cycle
  - controls: start, pause, stop mission
  - always user-controllable

## Accessibility Notes

- no hard lockout if timer stops or is paused
- large readable center time
- calm contrast and predictable controls
- short French copy with consistent wording

## Limitations

- no weekly statistics yet
- no badge/streak system yet
- no persistent timer preferences per child yet

## Future Work

- advanced achievements and streaks
- weekly points progression and reward history
- optional audio/haptic cues with parent controls
