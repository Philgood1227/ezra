# Ezra Web App Project Snapshot (Audit)

Date: 2026-02-26
Repository root: `c:\Users\la\ezra`
Audit mode: read-only code/schema inspection (no runtime logic changes)

## Overview

This snapshot traces how Parent day-template configuration drives Child day data and mission UI.

Key conclusions (code-backed):

1. Day planning is template-driven by weekday (`day_templates.weekday`) and instantiated lazily into `task_instances` when Child data is requested, via `ensureTodayTaskInstances(...)`.
   - Evidence: `src/lib/actions/ensure-today-instances.ts:28-35, 43-49, 76-91`
2. Fixed schedule blocks are modeled separately from actionable tasks (`day_template_blocks`), not as `task_instances`.
   - Evidence: `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:1-12, 251-255`
3. "Tes missions du jour" reads today task instances (not raw templates), then filters to mission-kind items.
   - Evidence: `src/lib/api/day-view.ts:437-443, 557-579`; `src/lib/api/child-home.ts:224-245`; `src/components/missions/mappers.ts:133-136`
4. No dedicated recurring-events table exists for day-template tasks/activities. Recurrence for daily planning is encoded by weekday template selection. A separate recurrence model exists only for school diary entries.
   - Evidence: `src/lib/actions/ensure-today-instances.ts:29-35`; `supabase/migrations/20260212090000_school_diary_recurrence.sql:1-12`

---

## Data model (tables + migrations mapping)

### Migration-to-model map

| Migration | Scheduling/task/category/instructions impact |
|---|---|
| `supabase/migrations/20260211100000_day_templates_timeline.sql` | Creates `task_categories`, `day_templates`, `template_tasks` + base checks/indexes. |
| `supabase/migrations/20260211130000_gamification_points_timers.sql` | Adds `template_tasks.points_base`; creates `task_instances`, `daily_points`, `reward_tiers`; status check values. |
| `supabase/migrations/20260212120000_family_assignments_meals_emotions_dashboard.sql` | Adds `assigned_profile_id` to `template_tasks` and `task_instances`. |
| `supabase/migrations/20260211212000_knowledge_achievements_cinema.sql` | Adds `template_tasks.knowledge_card_id` FK. |
| `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql` | Creates `day_template_blocks`, `school_periods`; migrates school-like tasks into blocks and deletes migrated tasks/instances. |
| `supabase/migrations/20260219123000_plan_items_kind_v2.sql` | Adds `task_categories.default_item_kind`, `template_tasks.item_kind/item_subkind`, `task_instances.item_kind/item_subkind`; expands `day_template_blocks.block_type` values. |
| `supabase/migrations/20260223130000_child_time_blocks.sql` | Adds `day_template_blocks.child_time_block_id`, `template_tasks.recommended_child_time_block_id` with checks + midpoint backfill. |
| `supabase/migrations/20260226100000_template_tasks_instructions_html.sql` | Adds `template_tasks.instructions_html`. |
| `supabase/migrations/20260211170000_school_diary_checklists_notifications.sql` + `20260212090000_school_diary_recurrence.sql` | Creates `school_diary_entries`; adds recurrence fields (`weekly`, `biweekly`, `monthly`) for school diary module only. |

### Table details (requested scope)

### `task_categories`

Purpose: Family-level category catalog (label/icon/color + default actionable kind).

Definition evidence:
- `supabase/migrations/20260211100000_day_templates_timeline.sql:1-8`
- `supabase/migrations/20260219123000_plan_items_kind_v2.sql:1-15`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null` -> `families(id)` (`on delete cascade`)
- `name text not null`
- `icon text not null`
- `color_key text not null`
- `created_at timestamptz not null default timezone('utc', now())`
- `default_item_kind text null` with check in `('activity','mission','leisure')`

Enum-like/check usage:
- `default_item_kind` check constraint: `task_categories_default_item_kind_check`

### `day_templates`

Purpose: Weekday template container (one default per family+weekday).

Definition evidence:
- `supabase/migrations/20260211100000_day_templates_timeline.sql:10-17, 32-37`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null` -> `families(id)` (`on delete cascade`)
- `name text not null`
- `weekday int not null check (weekday between 0 and 6)`
- `is_default boolean not null default false`
- `created_at timestamptz not null default timezone('utc', now())`

Constraints/indexes:
- Partial unique index `day_templates_default_weekday_idx` on `(family_id, weekday)` where `is_default = true`

### `template_tasks`

Purpose: Planned actionable items inside a day template (later instantiated per day per child).

Definition/alter evidence:
- Base: `supabase/migrations/20260211100000_day_templates_timeline.sql:19-30`
- `points_base`: `supabase/migrations/20260211130000_gamification_points_timers.sql:1-2`
- `assigned_profile_id`: `supabase/migrations/20260212120000_family_assignments_meals_emotions_dashboard.sql:1-3`
- `knowledge_card_id`: `supabase/migrations/20260211212000_knowledge_achievements_cinema.sql:101-115`
- `item_kind/item_subkind`: `supabase/migrations/20260219123000_plan_items_kind_v2.sql:19-67`
- `recommended_child_time_block_id`: `supabase/migrations/20260223130000_child_time_blocks.sql:4-6, 79-93`
- `instructions_html`: `supabase/migrations/20260226100000_template_tasks_instructions_html.sql:1-3`

Columns (combined current model):
- `id uuid primary key default gen_random_uuid()`
- `template_id uuid not null` -> `day_templates(id)` (`on delete cascade`)
- `category_id uuid not null` -> `task_categories(id)`
- `title text not null`
- `description text null`
- `instructions_html text null`
- `start_time time not null`
- `end_time time not null`
- `sort_order int not null default 0`
- `points_base int not null default 2`
- `item_kind text not null default 'mission'` check in `('activity','mission','leisure')`
- `item_subkind text null`
- `assigned_profile_id uuid null` -> `profiles(id)` (`on delete set null`)
- `knowledge_card_id uuid null` -> `knowledge_cards(id)` (`on delete set null`)
- `recommended_child_time_block_id text null` check in `('morning','noon','afternoon','home','evening')`
- `created_at timestamptz not null default timezone('utc', now())`
- table-level check `end_time > start_time`

### `task_instances`

Purpose: Daily instantiated task rows per child/date from `template_tasks`.

Definition/alter evidence:
- Base: `supabase/migrations/20260211130000_gamification_points_timers.sql:4-18`
- `assigned_profile_id`: `supabase/migrations/20260212120000_family_assignments_meals_emotions_dashboard.sql:4-12`
- `item_kind/item_subkind`: `supabase/migrations/20260219123000_plan_items_kind_v2.sql:71-107`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null` -> `families(id)` (`on delete cascade`)
- `child_profile_id uuid not null` -> `profiles(id)` (`on delete cascade`)
- `template_task_id uuid not null` -> `template_tasks(id)` (`on delete cascade`)
- `date date not null`
- `status text not null` check in `('a_faire','en_cours','termine','en_retard','ignore')`
- `start_time time not null`
- `end_time time not null`
- `points_base int not null default 0`
- `points_earned int not null default 0`
- `item_kind text not null default 'mission'` check in `('activity','mission','leisure')`
- `item_subkind text null`
- `assigned_profile_id uuid null` -> `profiles(id)` (`on delete set null`)
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

Constraints/indexes:
- unique `(child_profile_id, template_task_id, date)`

### `day_template_blocks`

Purpose: Non-actionable fixed/context schedule blocks (school/home/transport/club/etc).

Definition/alter evidence:
- Create: `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:1-12`
- Block-type expansion: `supabase/migrations/20260219123000_plan_items_kind_v2.sql:110-125`
- Child segment id: `supabase/migrations/20260223130000_child_time_blocks.sql:1-3, 61-75`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `day_template_id uuid not null` -> `day_templates(id)` (`on delete cascade`)
- `block_type text not null` check in `('school','home','transport','club','daycare','free_time','other')`
- `label text null`
- `start_time time not null`
- `end_time time not null`
- `sort_order int not null default 0`
- `child_time_block_id text null` check in `('morning','noon','afternoon','home','evening')`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- table-level check `end_time > start_time`

Important migration behavior:
- School-like template tasks were converted into `day_template_blocks` (`block_type='school'`), then source `task_instances`/`template_tasks` deleted.
  - Evidence: `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:198-255`

### `school_periods`

Purpose: Family calendar periods (vacation/special day) used for day context and labels.

Definition evidence:
- `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:14-24`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `family_id uuid not null` -> `families(id)` (`on delete cascade`)
- `period_type text not null` check in `('vacances','jour_special')`
- `start_date date not null`
- `end_date date not null`
- `label text not null`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- table-level check `end_date >= start_date`

### `school_diary_entries` (recurrence exists, but separate domain)

Purpose: School diary/checklist module (not day-template mission scheduling).

Definition/recurrence evidence:
- Base table: `supabase/migrations/20260211170000_school_diary_checklists_notifications.sql:1-12`
- Recurrence columns: `supabase/migrations/20260212090000_school_diary_recurrence.sql:1-12`

Recurrence columns:
- `recurrence_pattern text not null default 'none'` check in `('none','weekly','biweekly','monthly')`
- `recurrence_until_date date null`
- `recurrence_group_id uuid null`

### Support tables used by day pipeline

### `daily_points`

Purpose: Per-child/day points aggregate used by Child Home/Rewards and task status updates.

Evidence: `supabase/migrations/20260211130000_gamification_points_timers.sql:30-39`

### `reward_tiers`

Purpose: Reward thresholds loaded into day/home view.

Evidence: `supabase/migrations/20260211130000_gamification_points_timers.sql:20-28`

### Generated Supabase types file

Canonical generated model file:
- `src/types/database.ts`

Relevant table type sections:
- `day_templates`: `src/types/database.ts:6-40`
- `day_template_blocks`: `src/types/database.ts:41-87`
- `task_categories`: `src/types/database.ts:144-181`
- `task_instances`: `src/types/database.ts:182-264`
- `school_diary_entries` recurrence fields: `src/types/database.ts:687-749`
- `school_periods`: `src/types/database.ts:750-790`
- `template_tasks`: `src/types/database.ts:1624-1709`

### Explicit answer: recurring weekly activities and fixed blocks

- For day-template tasks/activities (missions, clubs, etc.), there is no separate recurrence table. Recurrence is by selecting the weekday template (`day_templates.weekday`) each day.
  - Evidence: `src/lib/actions/ensure-today-instances.ts:29-35`
- Fixed blocks are separate entities in `day_template_blocks`, not task instances.
  - Evidence: `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:1-12`
- Separate recurrence infrastructure exists for school diary entries only.
  - Evidence: `supabase/migrations/20260212090000_school_diary_recurrence.sql:1-12`

Evidence excerpt (`src/lib/actions/ensure-today-instances.ts:28-35, 76-91`):

```ts
const { data: templates } = await supabase
  .from("day_templates")
  .select("*")
  .eq("family_id", familyId)
  .eq("weekday", weekday)
  .order("is_default", { ascending: false })
  .order("created_at", { ascending: true })
  .limit(1);

const insertPayload = missing.map((task) => ({
  family_id: familyId,
  child_profile_id: childProfileId,
  template_task_id: task.id,
  item_kind: task.item_kind,
  item_subkind: task.item_subkind,
  date: dateKey,
  status: "a_faire" as const,
}));
await supabase.from("task_instances").insert(insertPayload);
```

Evidence excerpt (`supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:1-4, 251-255`):

```sql
create table if not exists public.day_template_blocks (
  id uuid primary key default gen_random_uuid(),
  day_template_id uuid not null references public.day_templates (id) on delete cascade,
  block_type text not null check (...)
);

delete from public.task_instances
where template_task_id in (select id from tmp_school_template_tasks);
delete from public.template_tasks
where id in (select id from tmp_school_template_tasks);
```

---

## TypeScript models (key types + usage map)

### Canonical domain interfaces (`src/lib/day-templates/types.ts`)

Key signatures:
- `TaskCategorySummary`: `src/lib/day-templates/types.ts:1-8`
- `TemplateTaskSummary`: `src/lib/day-templates/types.ts:24-44`
- `DayTemplateBlockSummary`: `src/lib/day-templates/types.ts:48-57`
- `TaskInstanceSummary`: `src/lib/day-templates/types.ts:88-121`
- `TemplateTaskInput`: `src/lib/day-templates/types.ts:243-256`
- `DayTemplateBlockInput`: `src/lib/day-templates/types.ts:258-264`
- `SchoolDiaryRecurrencePattern` + `SchoolDiaryEntrySummary`: `src/lib/day-templates/types.ts:582-598`

### Child/Home mission model types

- `ChildHomeTaskSummary` (child-facing task view model): `src/lib/api/child-home.ts:23-48`
- `MissionUI` (Home missions card/drawer/focus model): `src/components/missions/types.ts:18-36`
- Parallel legacy/alternate mission type `TodayMission`: `src/components/child/today/types.ts:25-39`

### Instructions model + sanitization pipeline

1. Domain fallback resolver:
   - `resolveTaskInstructionsHtml(...)` returns rich html if present; else escaped description paragraph.
   - Evidence: `src/lib/day-templates/instructions.ts:15-27`
2. API mapping to task instance/home payload:
   - `src/lib/api/day-view.ts:175-178`
   - `src/lib/api/task-instances.ts:106-109`
   - `src/lib/api/child-home.ts:127-130`
3. UI sanitization before rendering HTML:
   - whitelist sanitizer `sanitizeMissionHtml(...)` in drawer and reused by focus overlay.
   - Evidence: `src/components/missions/MissionDrawer.tsx:26-106, 254-257, 393-396`; `src/components/missions/FocusModeMission.tsx:8, 229-232, 447-450`

### Category/icon modeling

- Category semantic fields are persisted on `task_categories` (`name`, `icon`, `color_key`, `default_item_kind`), mapped to `TaskCategorySummary`.
  - Evidence: `src/lib/api/templates.ts:61-69`
- Mission-row icon fallback uses color-key icon map when no meaningful emoji icon is provided.
  - Evidence: `src/components/missions/MissionRow.tsx:4, 52, 90-97`
- Color-key options and kind options are centralized in constants.
  - Evidence: `src/lib/day-templates/constants.ts:35-105, 114-143`

### Type usage map (where consumed)

- `TemplateTaskInput` -> Parent editor payloads -> day-template actions -> DB writes.
  - `src/features/day-templates/components/template-editor.tsx:408-424`
  - `src/lib/actions/day-templates.ts:564-707, 709-873`
- `TaskInstanceSummary` -> Child day/home data + focus routes.
  - `src/lib/api/day-view.ts:124-190, 557-599`
  - `src/lib/api/task-instances.ts:88-119`
  - `src/components/child/focus/focus-view.tsx:16-23`
- `MissionUI` -> Home missions card + drawer + focus.
  - `src/components/missions/MissionsCard.tsx:21-230`
  - `src/components/missions/MissionDrawer.tsx:11-24, 172-470`
  - `src/components/missions/FocusModeMission.tsx:11-17, 114-493`

---

## Scheduling/day generation workflow (sequence + dependency graph)

### End-to-end sequence

### 1) Parent config (templates, blocks, tasks, categories)

Entry points:
- `/parent/day-templates` list page loads templates/week overview/school periods.
  - `src/app/(parent)/parent/day-templates/page.tsx:50-55`
- `/parent/day-templates/[id]` loads editor data.
  - `src/app/(parent)/parent/day-templates/[id]/page.tsx:37-42`
- `/parent/categories` loads category manager.
  - `src/app/(parent)/parent/categories/page.tsx:6-8`

Write actions:
- Categories -> `task_categories`:
  - `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`
  - `src/lib/actions/day-templates.ts:278-427`
- Templates -> `day_templates`:
  - `createTemplateAction`, `updateTemplateAction`, `deleteTemplateAction`
  - `src/lib/actions/day-templates.ts:429-560`
- Template tasks -> `template_tasks`:
  - create/update/delete + sort order move
  - `src/lib/actions/day-templates.ts:564-707, 709-914, 1353-1435`
- Fixed blocks -> `day_template_blocks`:
  - create/update/delete
  - `src/lib/actions/day-templates.ts:924-1211`
- School periods -> `school_periods`:
  - create/update/delete
  - `src/lib/actions/day-templates.ts:1213-1351`

### 2) Daily instantiation (template -> task_instances)

Primary trigger (no cron found):
- Called inside Child day data read pipeline only.
- `src/lib/api/day-view.ts:421-427`

Instantiation logic:
- Select one template by `family_id + weekday`, prioritize default template.
  - `src/lib/actions/ensure-today-instances.ts:29-35`
- Load its `template_tasks` ordered by time/sort.
  - `src/lib/actions/ensure-today-instances.ts:43-49`
- Find missing `(child, task, date)` rows and insert status `a_faire` with task-derived fields.
  - `src/lib/actions/ensure-today-instances.ts:57-63, 71-91`

### 3) Child day data assembly

`getTodayTemplateWithTasksForProfile(profileId)`:
- Ensure instances for today
- Load `task_instances`, `reward_tiers`, `day_template_blocks`, `school_periods`
- Load linked `template_tasks` and `task_categories`
- Map to `TaskInstanceSummary` including category, instructions fallback, recommended block
- Merge optional read-only cinema pseudo-instance

Evidence:
- `src/lib/api/day-view.ts:421-464, 499-579, 590-599`

### 4) Child Home mission extraction

- Child home API filters actionable tasks (`!isReadOnly && status != ignore`) from today instances.
  - `src/lib/api/child-home.ts:151-153, 224-245`
- UI mapper converts these tasks to `MissionUI` and keeps only mission-kind items.
  - `src/components/missions/mappers.ts:133-136, 161-172`

### Dependency graph

```text
Parent UI routes
  /parent/day-templates, /parent/categories
    -> DayTemplateEditor / CategoriesManager / SchoolCalendarManager
      -> src/lib/actions/day-templates.ts
        -> DB writes:
           task_categories
           day_templates
           template_tasks
           day_template_blocks
           school_periods

Child route
  /child (src/app/(child)/child/page.tsx)
    -> getChildHomeData (src/lib/api/child-home.ts)
      -> getTodayTemplateWithTasksForProfile (src/lib/api/day-view.ts)
        -> ensureTodayTaskInstances (src/lib/actions/ensure-today-instances.ts)
          -> reads day_templates + template_tasks
          -> inserts missing task_instances
        -> reads task_instances + template_tasks + task_categories
        -> reads day_template_blocks + school_periods + daily_points + reward_tiers
      -> maps todayTasks
    -> ChildHomeLive
      -> mapTasksToMissions
      -> MissionsCard
        -> MissionDrawer / FocusModeMission
        -> useMissionsToday -> updateTaskStatusAction -> task_instances + daily_points
```

### Explicit answers (requested)

1. Where/how recurring weekly events are applied:
- Applied by weekday template lookup (`day_templates.weekday`) in `ensureTodayTaskInstances`.
- Selection is: default template first (`order is_default desc`) then oldest created.
- There is no separate recurrence rule engine for day-template tasks.
- Evidence: `src/lib/actions/ensure-today-instances.ts:29-35`

2. Whether fixed blocks are tasks/events/separate:
- Fixed blocks are separate entities (`day_template_blocks`), consumed as context/timeline blocks.
- They are not persisted as `task_instances` and are read separately.
- Evidence: `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql:1-12`; `src/lib/api/day-view.ts:450-457`

3. Whether "Tes missions du jour" reads instances or templates:
- Reads instantiated `task_instances` (via `day-view`), then filters/mapps for mission UI.
- Filters: actionable tasks in home API (`!isReadOnly && status != ignore`), then mission-only in mapper (`itemKind === 'mission'`).
- Evidence: `src/lib/api/day-view.ts:437-443, 557-579`; `src/lib/api/child-home.ts:151-153, 242-245`; `src/components/missions/mappers.ts:133-136`

---

## Parent -> Child data wiring (Home/Drawer/Focus)

### Child Home: "Tes missions du jour"

Entry + fetchers:
- Route: `src/app/(child)/child/page.tsx:13-34`
- API: `getChildHomeData(...)` -> `getTodayTemplateWithTasksForProfile(...)`
  - `src/lib/api/child-home.ts:204-288`
  - `src/lib/api/day-view.ts:296-599`

Components:
- `ChildHomeLive` computes `missions = mapTasksToMissions(data.todayTasks)` and renders `MissionsCard`.
  - `src/components/child/child-home-live.tsx:5, 70, 116`
- `MissionsCard` header text "Tes missions du jour".
  - `src/components/missions/MissionsCard.tsx:119-123`

Data model consumed:
- `ChildHomeData.todayTasks: ChildHomeTaskSummary[]` -> `MissionUI[]`

Category/icon/label derivation:
- Base icon/color/category from task summary (`icon`, `colorKey`, `categoryName`) in mapper.
  - `src/components/missions/mappers.ts:141-157`
- Row fallback icon by `colorKey` map if icon missing/invalid.
  - `src/components/missions/MissionRow.tsx:19-30, 52, 91-97`

Instructions rendering/sanitization:
- Mission instructions built from `instructionsHtml` fallback to description.
  - `src/components/missions/mappers.ts:37-47`
- Drawer/focus sanitize before `dangerouslySetInnerHTML`.
  - `src/components/missions/MissionDrawer.tsx:38-106, 254-257, 393-396`
  - `src/components/missions/FocusModeMission.tsx:229-232, 447-450`

Evidence excerpt (`src/components/missions/mappers.ts:133-136`):

```ts
export function mapTaskToMission(task: ChildHomeTaskSummary): MissionUI | null {
  if ((task.itemKind ?? "mission") !== "mission") {
    return null;
  }
```

### Mission Drawer (desktop drawer + mobile bottom sheet)

Primary component:
- `src/components/missions/MissionDrawer.tsx`

Desktop/mobile behavior:
- Uses media query `min-width: 768px` to switch layout.
  - Desktop: side drawer (`rounded-r` shell)
  - Mobile: bottom sheet (`items-end`, rounded top)
- Evidence: `src/components/missions/MissionDrawer.tsx:201-211, 267-285`

Inputs consumed:
- `MissionUI[]`, selected mission id, pending mission id, mission actions.
  - `src/components/missions/MissionDrawer.tsx:11-24, 172-185`

Evidence excerpt (`src/components/missions/MissionDrawer.tsx:38-41, 61-66, 393-396`):

```ts
export function sanitizeMissionHtml(rawHtml: string): string {
  const html = rawHtml.trim();
  if (!html) return "<p>Aucune consigne pour le moment.</p>";
  // ...
  if (!ALLOWED_TAGS.has(tagName)) {
    // unwrap disallowed tags
  }
}

<div
  className="mission-richtext ..."
  dangerouslySetInnerHTML={{ __html: sanitizedInstructions }}
/>
```

### Focus mode

Home mission focus implementation:
- `FocusModeMission` modal is opened from `MissionsCard`.
  - `src/components/missions/MissionsCard.tsx:98-113, 216-227`
- Uses `MissionUI` and sanitized mission instructions.
  - `src/components/missions/FocusModeMission.tsx:11-17, 229-232, 447-450`

Additional parallel focus implementation (separate stack):
- Route `/child/focus/[instanceId]` -> `FocusView` with `TaskInstanceSummary` fetched by instance id.
  - `src/app/(child)/child/focus/[instanceId]/page.tsx:11-20`
  - `src/lib/api/task-instances.ts:16-120`
  - `src/components/child/focus/focus-view.tsx:16-23`

---

## Gaps & risks (factual, code-evidenced)

1. `instructions_html` exists in DB/actions/types, but Parent task editor UI does not expose it.
- DB + action support:
  - `supabase/migrations/20260226100000_template_tasks_instructions_html.sql:1-3`
  - `src/lib/actions/day-templates.ts:70-75, 689, 857-859`
- Editor payload omits `instructionsHtml` and form only captures plain `description`:
  - `src/features/day-templates/components/template-editor.tsx:408-420, 1003-1016`

Evidence excerpt (`src/features/day-templates/components/template-editor.tsx:408-420`):

```ts
const payload: TemplateTaskInput = {
  categoryId: taskDraft.categoryId,
  itemKind: resolvedItemKind,
  itemSubkind: ...,
  title: taskDraft.title.trim(),
  description: taskDraft.description?.trim() ? taskDraft.description.trim() : null,
  startTime: taskDraft.startTime,
  endTime: taskDraft.endTime,
  pointsBase: ...,
  knowledgeCardId: taskDraft.knowledgeCardId ?? null,
  recommendedChildTimeBlockId: taskDraftRecommendedChildTimeBlockId,
};
```

2. Two mission UI model stacks coexist (`MissionUI` vs `TodayMission`) with overlapping mapping logic.
- Active Home missions stack: `src/components/missions/*`
- Parallel today stack: `src/components/child/today/*`
  - mission filtering/mapping also implemented in `buildTodayMissionsFromTasks`
  - `src/components/child/today/today-data.tsx:259-289`

3. Focus functionality is duplicated across two independent UIs.
- Home missions focus: `FocusModeMission`
- Instance-focused view: `FocusView` route and my-day overlay usage
  - `src/components/missions/FocusModeMission.tsx`
  - `src/components/child/focus/focus-view.tsx`

4. Category/icon mapping has multiple sources.
- `src/components/child/icons/child-premium-icons.tsx:280-302`
- `src/components/child/home/child-home-icons.tsx:193-213`
- `src/lib/day-templates/constants.ts:35-105`

5. Day-template recurrence granularity is limited to weekday template selection (one chosen template per weekday/day generation call).
- No ad-hoc per-task recurrence rule fields in `template_tasks`.
- Evidence: `src/lib/actions/ensure-today-instances.ts:29-35, 43-49`

---

## Appendix: file tree excerpts (relevant only)

### Migrations

- `supabase/migrations/20260211100000_day_templates_timeline.sql`
- `supabase/migrations/20260211130000_gamification_points_timers.sql`
- `supabase/migrations/20260211212000_knowledge_achievements_cinema.sql`
- `supabase/migrations/20260212090000_school_diary_recurrence.sql`
- `supabase/migrations/20260212120000_family_assignments_meals_emotions_dashboard.sql`
- `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql`
- `supabase/migrations/20260219123000_plan_items_kind_v2.sql`
- `supabase/migrations/20260223130000_child_time_blocks.sql`
- `supabase/migrations/20260226100000_template_tasks_instructions_html.sql`

### Core lib paths

- `src/types/database.ts`
- `src/lib/day-templates/types.ts`
- `src/lib/day-templates/instructions.ts`
- `src/lib/day-templates/plan-items.ts`
- `src/lib/day-templates/school-calendar.ts`
- `src/lib/actions/day-templates.ts`
- `src/lib/actions/ensure-today-instances.ts`
- `src/lib/actions/tasks.ts`
- `src/lib/api/templates.ts`
- `src/lib/api/day-view.ts`
- `src/lib/api/child-home.ts`
- `src/lib/api/task-instances.ts`

### Parent UI paths

- `src/app/(parent)/parent/day-templates/page.tsx`
- `src/app/(parent)/parent/day-templates/[id]/page.tsx`
- `src/app/(parent)/parent/categories/page.tsx`
- `src/features/day-templates/components/template-editor.tsx`
- `src/features/day-templates/components/categories-manager.tsx`
- `src/features/day-templates/components/school-calendar-manager.tsx`

### Child UI paths

- `src/app/(child)/child/page.tsx`
- `src/components/child/child-home-live.tsx`
- `src/components/missions/MissionsCard.tsx`
- `src/components/missions/MissionRow.tsx`
- `src/components/missions/MissionDrawer.tsx`
- `src/components/missions/FocusModeMission.tsx`
- `src/components/missions/mappers.ts`
- `src/components/missions/useMissionsToday.ts`
- `src/app/(child)/child/focus/[instanceId]/page.tsx`
- `src/components/child/focus/focus-view.tsx`
- `src/components/child/today/today-data.tsx`
- `src/components/child/today/types.ts`

---


## Git status --short (post-audit)

```bash
 M docs/project-snapshot.md
 D src/__tests__/child-home/header-components.test.tsx
 M src/__tests__/child-home/page.test.tsx
 D src/__tests__/child/checklists/checklist-card.test.tsx
 M src/__tests__/child/my-day/child-day-view-live.test.tsx
 M src/__tests__/day-templates/day-templates-overlap.test.ts
 M src/__tests__/day-view.test.ts
 M src/__tests__/layout/child-shell-navigation.test.tsx
 M src/__tests__/points-domain.test.ts
 M src/app/(child)/child/checklists/loading.tsx
 M src/app/(child)/child/checklists/page.tsx
 M src/app/(child)/child/page.tsx
 M src/app/globals.css
 D src/components/child/checklists/checklist-card.stories.tsx
 D src/components/child/checklists/checklist-card.tsx
 M src/components/child/checklists/checklist-item-row.tsx
 D src/components/child/checklists/child-checklists-view.tsx
 D src/components/child/checklists/index.ts
 M src/components/child/child-home-live.tsx
 M src/components/child/focus/focus-view.tsx
 M src/components/child/home/index.ts
 D src/components/child/home/today-header.tsx
 M src/components/child/my-day/child-day-view-live.tsx
 M src/components/layout/child-shell.tsx
 M src/features/day-templates/components/template-editor.tsx
 M src/lib/actions/day-templates.ts
 M src/lib/actions/tasks.ts
 M src/lib/api/checklists.ts
 M src/lib/api/child-home.ts
 M src/lib/api/day-view.ts
 M src/lib/api/task-instances.ts
 M src/lib/api/templates.ts
 M src/lib/day-templates/types.ts
 M src/lib/demo/day-templates-store.ts
 M src/lib/demo/gamification-store.ts
 M src/lib/domain/task-status.ts
 M src/lib/time/daylight.ts
 M src/lib/time/family-location.server.ts
 M src/types/database.ts
 M vitest.config.ts
?? docs/header-density.md
?? docs/header-design-gap.md
?? docs/missions-instructions.md
?? docs/ui-system.md
?? docs/ux/
?? docs/weather.md
?? project-snapshot.md
?? public/icons/meteocons/
?? src/__tests__/child-home/day-segments.test.ts
?? src/__tests__/child-home/today-data-grouping.test.ts
?? src/__tests__/child-home/today-header-v2.test.tsx
?? src/__tests__/child-home/weekday-strip.test.tsx
?? src/__tests__/child/my-day/child-day-timeline-view.test.tsx
?? src/__tests__/child/my-day/focus-view-overlay.test.tsx
?? src/__tests__/child/tomorrow/
?? src/__tests__/lib/
?? src/app/(child)/child/my-day/timeline/
?? src/app/(child)/child/tools/
?? src/app/csp-test/
?? src/components/child/my-day/active-task-card.tsx
?? src/components/child/my-day/child-day-timeline-view.tsx
?? src/components/child/today/
?? src/components/child/tomorrow/
?? src/components/missions/
?? src/components/weather/
?? src/lib/day-templates/focus.ts
?? src/lib/day-templates/instructions.ts
?? src/lib/time/day-segments.ts
?? src/lib/weather/
?? supabase/migrations/20260223130000_child_time_blocks.sql
?? supabase/migrations/20260226100000_template_tasks_instructions_html.sql
```
