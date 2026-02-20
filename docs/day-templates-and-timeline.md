# Day Templates And Timeline

## Overview

This module defines the child's visual day structure and how parents configure it.

Main goals:

- parents build simple recurring weekday templates
- child sees a calm, ordered timeline in French
- child gets instant orientation with "Maintenant" and "Ensuite"

## Data Model

Planning entities:

- `task_categories` (`name`, `icon`, `color_key`)
- `day_templates` (`name`, `weekday`, `is_default`)
- `template_tasks` (`start_time`, `end_time`, `sort_order`, `points_base`)

Runtime entities:

- `task_instances` (one concrete task for one child and one date)
- `daily_points` (aggregated points by day)
- `reward_tiers` (family reward thresholds)

Relationships:

- `families 1 -> n task_categories`
- `families 1 -> n day_templates`
- `day_templates 1 -> n template_tasks`
- `task_categories 1 -> n template_tasks`
- `template_tasks 1 -> n task_instances`
- `profiles (child) 1 -> n task_instances`
- `profiles (child) 1 -> n daily_points`

## Parent Components

- `CategoriesManager`
  - category CRUD with icon + color key
- `DayTemplatesPage` and `DayTemplateEditor`
  - weekday template CRUD
  - ordered block CRUD
  - points per block (`points_base`)
- `RewardsManager`
  - reward tiers CRUD (`label`, `points_required`, `description`)

## Child Components

- `NextUpBanner`
  - "Maintenant / Ensuite" for current context
- `DailyPointsBar`
  - daily progression toward next reward tier
- `DayTimeline`
  - vertical timeline with hour markers and now cursor
- `TimelineTaskCard`
  - per-task status and actions (start/validate/focus)
- `NowCursor`
  - current-time marker on timeline

## Workflows

### Parent

1. Create categories in `/parent/categories`.
2. Create or edit weekday templates in `/parent/day-templates`.
3. Add blocks with start/end time, category, title, and points.
4. Create reward tiers in `/parent/rewards`.

### Child

1. Open `/child/my-day`.
2. App ensures task instances for today exist.
3. Child sees ordered blocks with states and points.
4. Child updates status and immediately sees point progress updates.
5. Child can open focus mode from each task card.

## Validation And Points

Status lifecycle:

- `a_faire -> en_cours -> termine`
- shortcut `a_faire -> termine` is allowed
- points are awarded only on first transition to `termine`

Visual feedback:

- status badge/label per task
- success state "Terminé. Bravo !"
- temporary `+N points` micro-feedback
- top progress bar toward next reward tier

## UI Behaviour

- all child/parent labels are in French
- timeline uses category tokens (no ad-hoc color logic)
- past tasks are softened, current task is highlighted
- empty state appears when no template exists for current weekday

## Limitations

- no exception days yet
- no forced timer constraints
- no advanced achievements/stats yet

## Future Work

- exception planning by date
- weekly summaries and historical insights
- achievements/streaks linked to validated tasks
