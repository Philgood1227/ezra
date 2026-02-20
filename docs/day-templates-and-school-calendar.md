# Day Templates And School Calendar

## Objectif

Cette refonte separe clairement:

1. Les **plages structurelles** de la journee (ecole, garderie, etc.).
2. Les **taches actionnables** que l'enfant peut valider.

Resultat:

1. `Ma journee` affiche l'ecole comme contexte non cochable.
2. Les taches restent interactives et pilotent les points.
3. L'accueil enfant peut afficher une periode fiable: `Ecole`, `Vacances`, `Week-end`, `Jour special`.

## Modele de donnees

## Tables principales

1. `day_templates`
2. `day_template_blocks`
3. `template_tasks`
4. `task_instances`
5. `school_periods`

## day_template_blocks

Role: decrire la structure temporelle d'une journee type.

Champs principaux:

1. `day_template_id`
2. `block_type` (`school`, `daycare`, `free_time`, `other`)
3. `start_time`, `end_time`
4. `label`
5. `sort_order`

Important: un block n'est **pas** une tache, ne genere pas de `task_instance`, ne peut pas etre coche.

## school_periods

Role: calendrier scolaire famille.

Champs principaux:

1. `family_id`
2. `period_type` (`vacances`, `jour_special`)
3. `start_date`, `end_date`
4. `label`

## Derivation de periode

Helper: `src/lib/day-templates/school-calendar.ts`

Regles:

1. Date dans `vacances` => `vacances`
2. Sinon samedi/dimanche => `weekend`
3. Sinon date dans `jour_special` => `jour_special`
4. Sinon => `ecole`

Complement:

1. `findNextVacation` calcule "Prochaines vacances: dans X jours".
2. `findActiveSchoolBlock` detecte si l'heure courante est dans une plage `school`.

## Parent: configuration

## Page journees types

Route: `/parent/day-templates`

1. Vue hebdomadaire des templates.
2. Apercu des plages ecole par jour.
3. Section `Calendrier scolaire` pour CRUD des periodes (`vacances`, `jour_special`).

Composant cle: `src/features/day-templates/components/school-calendar-manager.tsx`

## Editeur de template

Route: `/parent/day-templates/[id]`

Deux couches distinctes:

1. **Plages de la journee** (`day_template_blocks`)
2. **Taches / activites** (`template_tasks`)

Chaque tache affiche son contexte relatif:

1. `Avant l'ecole`
2. `Autour de l'ecole`
3. `Apres l'ecole`

## Enfant: impact UX

## Ma journee

Composant cle: `src/components/timeline/day-timeline.tsx`

1. Les plages `school` sont affichees en segments de fond non interactifs.
2. Les `task_instances` restent les cartes interactives.
3. Le bandeau sticky peut afficher:
   - `Tu es a l'ecole en ce moment.`
   - puis la prochaine tache actionnable en `Ensuite`.

## Accueil

Loader: `src/lib/api/child-home.ts`

Donnees exposees:

1. `dayPeriod`, `dayPeriodLabel`
2. `nextVacationLabel`, `daysUntilNextVacation`
3. `currentMomentLabel`, `currentContextLabel`
4. `isInSchoolBlock`, `activeSchoolBlockEndTime`

Widgets touches:

1. `GreetingHero` (chips periode + prochaines vacances)
2. `DayMarkersWidget` (Matin/Apres-midi/Soir + contexte)
3. `NowNextCard` (message ecole si plage scolaire active)

## Fallbacks

Si aucun `school_periods` configure:

1. Semaine => periode `ecole`
2. Week-end => `weekend`
3. Chip vacances optionnel (masque ou message de configuration selon contexte)

## Migration

Migration SQL: `supabase/migrations/20260213170000_day_template_blocks_school_calendar.sql`

Ce qu'elle fait:

1. Cree `day_template_blocks` et `school_periods`.
2. Backfill des anciennes taches "ecole" vers des blocks `school`.
3. Supprime les placeholders ecole devenus redondants.
4. Reordonne `template_tasks.sort_order`.

## Tests

Couverture ajoutee:

1. `src/__tests__/school-calendar.test.ts`
2. `src/__tests__/timeline/day-timeline.test.tsx`
3. `src/__tests__/child-home/day-markers-widget.test.tsx`
4. `src/__tests__/child-home/now-next-card.test.tsx`

