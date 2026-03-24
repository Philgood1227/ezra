# Categories Architecture

## Overview
Categories are shared domain entities used in parent configuration and child task rendering.  
The database stores semantic keys only, and UI resolves icon components through the DS icon resolver.

## Data model
`task_categories` fields used by the app:
- `code`: stable `CategoryCode` (`homework`, `revision`, `activity`, `routine`, `leisure`)
- `name`: category label
- `icon`: semantic `CategoryIconKey` (not emoji, not image path)
- `color_key`: semantic `CategoryColorKey`
- `default_item_kind`: `activity`, `mission`, or `leisure`

Domain definitions:
- `src/lib/day-templates/types.ts`
- `src/lib/day-templates/constants.ts`

Template task payload shape remains unchanged:
- `categoryId`
- `itemKind` (derived from selected category `default_item_kind`)
- `itemSubkind` (optional, nullable)
- `title`
- `description`
- `instructionsHtml`

## Official parent defaults
The official parent-facing default pack contains exactly five categories:

| Code | Name | Icon key | Color key |
| --- | --- | --- | --- |
| `homework` | Devoirs | `homework` | `category-ecole` |
| `revision` | Revisions | `knowledge` | `category-calme` |
| `activity` | Activites | `activity` | `category-sport` |
| `routine` | Routine | `routine` | `category-routine` |
| `leisure` | Loisirs | `leisure` | `category-loisir` |

These defaults are seeded by `seedEzraCategoryPackAction` in `src/lib/actions/day-templates.ts`.

## Icon architecture
Single source of truth:
- Key catalog and parser: `src/lib/day-templates/constants.ts`
- Resolver map (key -> component): `src/components/ds/category-icons.tsx`
- DS exports: `src/components/ds/index.ts`

Rule: all category icon rendering must go through DS (`resolveCategoryIcon` or `CategoryIcon`).

## Workflows
Parent:
1. Parent creates/edits categories from `CategoriesManager`.
2. Icon picker uses official semantic keys from `CATEGORY_ICON_OPTIONS`.
3. Server validates via `categoryInputSchema` before persistence.
4. In day-template task editing, parent selects a category and the editor derives `itemKind` automatically.
5. Subkind suggestions are driven by category code via `getSubkindSuggestionsForCategoryCode` (single source of truth in `constants.ts`).

Child:
1. API/domain layers normalize persisted values with `parseCategoryIconKey` and `parseCategoryColorKey`.
2. Child UI receives semantic keys.
3. UI renders icon through DS resolver only.
4. Mission Drawer (`src/components/missions/MissionDrawer.tsx`) uses `mission.iconKey` for DS `CategoryIcon` and `mission.colorKey` for category tone classes.
5. Mission Drawer remains icon-only for category display (category text is not rendered visibly).

## Parent Editing Rules (V1)
- Category is the primary parent-facing classification.
- `itemKind` is internal and derived from `task_categories.default_item_kind`; parent does not select it directly.
- "Sous-type (optionnel)" suggestions are constrained by category code:
  - `homework`, `revision`, `activity`, `routine`, `leisure`.
- Parents can still enter a free subkind value when needed; clearing subkind persists `null`.
- Child UI keeps icon-only category rendering (no visible category text in Mission Drawer header).

## Legacy compatibility
- Existing DB categories with legacy icon tokens remain readable.
- Parser aliases normalize legacy tokens to supported semantic keys.
- Unknown icon strings fall back to `default` and render a safe default DS icon.

## Limitations
- V1 taxonomy is curated and intentionally small; wording can evolve with parent feedback.
- No icon-pack swap implementation in this lot.

## Future work
- Optional icon-pack swap (for example 3D clay) by updating only `src/components/ds/category-icons.tsx` while keeping semantic keys persisted.
