# Dossier Existant EZRA (version neutre)

## 1. Nature de l'application

EZRA est une web application familiale en francais, a deux espaces distincts:

1. Espace parent: configuration, planification, suivi.
2. Espace enfant: execution quotidienne, consultation, feedback.

La cible metier principale est une famille avec un enfant de 10 ans (TDAH), avec un produit centre sur la structure du quotidien.

## 2. Utilite actuelle

L'application sert aujourd'hui a:

1. Organiser la journee (taches, routines, planning).
2. Suivre l'execution (statuts, points, focus).
3. Gerer le scolaire (carnet, check-lists, notifications).
4. Fournir des aides devoirs (base de connaissances).
5. Suivre la motivation (succes / badges).
6. Organiser des decisions familiales (cinema).
7. Programmer des alarmes.
8. Suivre repas, recettes, ingredients.
9. Suivre les emotions matin/soir.
10. Consolider une vue hebdomadaire parent (dashboard).

## 3. Roles et types d'utilisateurs

Roles SQL existants:

1. `parent`
2. `child`
3. `viewer`

Role effectif par interface:

1. Parent: acces complet aux modules de pilotage.
2. Enfant: acces aux parcours d'execution et consultation.
3. Viewer: type present cote base, pas de parcours UI principal identifie.

## 4. Stack et structure technique

Technologies:

1. Next.js App Router (React 19, TypeScript strict).
2. Supabase Auth + PostgreSQL + RLS.
3. Tailwind + composants DS.
4. Vitest + Testing Library + Playwright + Storybook.
5. PWA activee.

Structure logique:

1. `src/app`: routes.
2. `src/features/*`: modules metier UI.
3. `src/lib/actions/*`: ecritures serveur.
4. `src/lib/api/*`: lectures serveur.
5. `src/lib/domain/*`: logique metier pure.
6. `supabase/migrations/*`: schema SQL + politiques RLS.

## 5. Cartographie complete des routes existantes

Routes globales:

1. `/`
2. `/~offline`
3. `/loading` (etat global App Router)
4. `/error` (etat global App Router)
5. `/not-found` (etat global App Router)

Routes auth:

1. `/auth`
2. `/auth/login`
3. `/auth/register`
4. `/auth/pin`

Routes enfant:

1. `/child`
2. `/child/my-day`
3. `/child/focus/[instanceId]`
4. `/child/checklists`
5. `/child/knowledge`
6. `/child/achievements`
7. `/child/cinema`
8. `/child/emotions`
9. `/child/meals` (redirige actuellement vers `/child`)

Routes parent:

1. `/parent`
2. `/parent/dashboard`
3. `/parent/day-templates`
4. `/parent/day-templates/[id]`
5. `/parent/categories`
6. `/parent/school-diary`
7. `/parent/checklists`
8. `/parent/notifications`
9. `/parent/alarms`
10. `/parent/meals`
11. `/parent/knowledge`
12. `/parent/knowledge/[subjectId]`
13. `/parent/achievements`
14. `/parent/cinema`
15. `/parent/rewards`
16. `/parent/gamification`
17. `/parent/settings`

## 6. Endpoints API HTTP existants (routes Next)

1. `POST /api/auth/parent/register`
2. `POST /api/auth/parent/login`
3. `POST /api/auth/parent/logout`
4. `POST /api/auth/child/pin`
5. `POST /api/auth/child/pin-config`

## 7. Modules metiers existants (detail exhaustif)

### 7.1 Authentification, famille et profils

Tables:

1. `families`
2. `profiles`

Fonctions SQL utilisees:

1. `bootstrap_parent_profile()` (creation auto famille/profil parent a l'inscription).
2. `current_family_id()`
3. `is_parent_in_family(uuid)`

Comportement:

1. Inscription parent cree un compte auth + metadonnees.
2. Connexion parent renvoie vers `/parent/dashboard`.
3. Connexion enfant par PIN via nom famille + nom enfant + PIN.
4. Configuration PIN enfant possible cote parent.

### 7.2 Organisation des journees et taches

Tables:

1. `task_categories`
2. `day_templates`
3. `template_tasks`
4. `task_instances`

Colonnes metier notables:

1. `template_tasks.assigned_profile_id`
2. `template_tasks.knowledge_card_id`
3. `task_instances.assigned_profile_id`

Actions serveur:

1. CRUD categories.
2. CRUD templates.
3. CRUD taches de template.
4. Tri/deplacement de taches.
5. Seed pack categories.

Comportement:

1. Le parent definit les modeles hebdomadaires.
2. Les instances journalieres sont generees pour l'enfant.
3. L'assignation est propagee du template vers l'instance.

### 7.3 Execution enfant, statuts, points, focus

Tables:

1. `task_instances`
2. `daily_points`
3. `reward_tiers`

Actions serveur:

1. `updateTaskStatusAction`
2. `ensureTodayTaskInstances`

Comportement:

1. L'enfant met a jour les statuts de taches.
2. Les points gagnes sont consolides sur la journee.
3. L'ecran focus fonctionne par `instanceId`.

### 7.4 Recompenses et gamification parent

Tables:

1. `reward_tiers`
2. `daily_points`

Actions serveur:

1. `createRewardTierAction`
2. `updateRewardTierAction`
3. `deleteRewardTierAction`

Comportement:

1. Le parent definit les paliers.
2. L'etat points/jour est consultable cote parent et utilise cote enfant.

### 7.5 Carnet scolaire, check-lists, notifications

Tables carnet/check-lists:

1. `school_diary_entries`
2. `checklist_templates`
3. `checklist_items`
4. `checklist_instances`
5. `checklist_instance_items`

Colonnes carnet notables:

1. `recurrence_pattern`
2. `recurrence_until_date`
3. `recurrence_group_id`

Tables notifications:

1. `notification_rules`
2. `push_subscriptions`
3. `in_app_notifications`

Actions serveur:

1. CRUD carnet scolaire.
2. CRUD modeles check-lists et items.
3. Toggle check-list instance item.
4. Update regles notifications.
5. Sauvegarde abonnement push.
6. Envoi test reminders.
7. Marquage notif lue.

Comportement:

1. Les entrees carnet alimentent les check-lists liees.
2. L'enfant coche ses items.
3. Les notifications in-app/push sont gerees par regles parent.

### 7.6 Base de connaissances

Tables:

1. `knowledge_subjects`
2. `knowledge_categories`
3. `knowledge_cards`
4. `knowledge_favorites`

Actions serveur:

1. CRUD matieres.
2. CRUD categories.
3. CRUD fiches.
4. Favori enfant (`setKnowledgeFavoriteAction`).

Comportement:

1. Parent gere la base de fiches.
2. Enfant consulte et favorise.
3. Les fiches peuvent etre liees a une tache modele via `knowledge_card_id`.

### 7.7 Succes / badges

Tables:

1. `achievement_categories`
2. `achievements`
3. `achievement_instances`

Actions serveur:

1. Activation/desactivation auto-trigger.
2. Evaluation des succes du jour.
3. Creation de succes personnalises.

Comportement:

1. Catalogue de succes disponible par famille.
2. Deblocage stocke dans `achievement_instances`.
3. Consultation parent/enfant selon role.

### 7.8 Cinema familial

Tables:

1. `movie_sessions`
2. `movie_options`
3. `movie_votes`

Champ notable:

1. `movie_sessions.chosen_option_id`

Actions serveur:

1. `createMovieSessionAction`
2. `voteMovieOptionAction`

Comportement:

1. Parent cree session + options.
2. Vote enregistre cote enfant/famille.
3. Option choisie reliee a la session.

### 7.9 Alarmes

Tables:

1. `alarm_rules`
2. `alarm_events`

Modes regle:

1. `ponctuelle`
2. `semaine_travail`
3. `semaine_complete`
4. `personnalise`

Actions serveur:

1. Creer regle.
2. Mettre a jour regle.
3. Activer/desactiver regle.
4. Supprimer regle.
5. Poll evenements dus.
6. Acquitter evenement.

Comportement:

1. Parent parametre des regles d'alarme.
2. Enfant recoit/voit les alarmes et peut acquitter.
3. Historique d'evenements conserve.

### 7.10 Repas, ingredients, recettes

Tables:

1. `meals`
2. `meal_ratings`
3. `ingredients`
4. `recipes`
5. `recipe_ingredients`
6. `meal_ingredients`

Champs notables:

1. `meals.prepared_by_profile_id`
2. `meals.prepared_by_label`
3. `meals.recipe_id`

Actions serveur:

1. Creer ingredient.
2. Creer recette.
3. Creer repas.
4. Modifier repas.
5. Supprimer repas.
6. Noter repas.

Comportement:

1. Parent planifie repas.
2. Ingredients base et ingredients du repas sont stockes separement.
3. Sauvegarde recette reutilisable possible depuis le formulaire repas.
4. Agregation hebdomadaire des ingredients disponible cote parent.
5. Cote enfant, la route repas est actuellement masquee (redirection).

### 7.11 Emotions

Table:

1. `emotion_logs`

Contraintes:

1. Unicite `(child_profile_id, date, moment)`.
2. `moment`: `matin` ou `soir`.
3. `emotion`: 5 valeurs discretes (`tres_content` a `tres_triste`).

Action serveur:

1. `upsertEmotionLogAction`

Comportement:

1. L'enfant enregistre ses emotions matin/soir.
2. Donnees exploitees dans les agregats parent.

### 7.12 Dashboard parent

API centrale:

1. `getParentDashboardPageData(...)`

Sources agregees:

1. Taches/completion.
2. Points journaliers.
3. Emotions semaine.
4. Repas et preferences.
5. Charge du jour.

Comportement:

1. Carte de synthese hebdomadaire.
2. Donnees consolidees multi-modules.

## 8. Interactions inter-modules (metier)

1. `day_templates/template_tasks` -> generation `task_instances`.
2. `task_instances` -> mise a jour `daily_points`.
3. `daily_points` + statuts taches -> evaluation succes.
4. `school_diary_entries` -> instances check-lists.
5. `knowledge_cards` -> liaison contextualisee sur taches template.
6. `movie_sessions/movie_votes` -> etat cinema enfant + option choisie.
7. `alarm_rules` -> `alarm_events` consommes par centre d'alarme enfant.
8. `meals` + `meal_ingredients` + `recipes` -> consolidation ingredients semaine.
9. `emotion_logs` + donnees activites -> agregats dashboard.

## 9. Securite et modele d'acces (RLS)

Constat existant:

1. RLS activee sur tables metier sensibles.
2. Scoping famille via `current_family_id()`.
3. Verification parent via `is_parent_in_family(...)`.
4. Politiques distinctes parent/enfant selon table.
5. Contraintes d'unicite sur objets critiques (votes, favoris, instances, etc.).

## 10. Inventaire tables (existant consolide)

1. `families`
2. `profiles`
3. `task_categories`
4. `day_templates`
5. `template_tasks`
6. `task_instances`
7. `daily_points`
8. `reward_tiers`
9. `school_diary_entries`
10. `checklist_templates`
11. `checklist_items`
12. `checklist_instances`
13. `checklist_instance_items`
14. `notification_rules`
15. `push_subscriptions`
16. `in_app_notifications`
17. `knowledge_subjects`
18. `knowledge_categories`
19. `knowledge_cards`
20. `knowledge_favorites`
21. `achievement_categories`
22. `achievements`
23. `achievement_instances`
24. `movie_sessions`
25. `movie_options`
26. `movie_votes`
27. `alarm_rules`
28. `alarm_events`
29. `meals`
30. `meal_ratings`
31. `ingredients`
32. `recipes`
33. `recipe_ingredients`
34. `meal_ingredients`
35. `emotion_logs`

## 11. Couverture qualite actuelle

Constat technique actuel:

1. Lint OK.
2. Typecheck OK.
3. Tests unitaires/composants OK.
4. Playwright E2E OK.
5. Storybook build OK.
6. Etats transverses presents: loading, error, not-found, offline.

## 12. Limites fonctionnelles documentees (existant)

1. Pas d'integration externe scolaire.
2. Pas de repetition espacee avancee sur connaissances.
3. Pas de recommandation film automatisee.
4. Pas d'analyse nutritionnelle macro/calories.
5. Emotions non cliniques, format simple.
6. Route enfant repas masquee via redirection.
