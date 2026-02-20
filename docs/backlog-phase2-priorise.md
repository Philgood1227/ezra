# Backlog Phase 2 Priorise

## But

Transformer le cadrage phase 1 en execution produit, avec un ordre strict pour limiter risques et rework.

## Ordre De Priorite

1. Fondations DS + navigation shell.
2. Parcours enfant critique.
3. Parcours parent critique.
4. Harmonisation transversale + qualite finale.

## Epic 1: Fondations DS Et Navigation

### Stories

1. Centraliser tokens couleurs/typo/spacing/motion.
2. Mettre a niveau composants DS (states complets).
3. Refondre shell parent avec groupes de menu.
4. Refondre shell enfant a 5 actions principales.

### Definition Of Done

1. Storybook couvre composants etat par etat.
2. Aucun style inline hors cas justifie.
3. Navigation identique sur tous ecrans du scope.

## Epic 2: Parcours Enfant Premium

### Stories

1. Refondre Accueil enfant (orientation immediate).
2. Refondre Ma journee (focus "maintenant").
3. Refondre Check-lists (completion rapide).
4. Refondre Decouvertes (parcours 2 taps vers fiche).
5. Harmoniser Succes, Cinema, Emotions.
6. Uniformiser feedback enfant (toasts, succes, erreurs).

### Definition Of Done

1. 1 CTA principal par page.
2. Textes courts et comprehensibles.
3. Temps de comprehension initiale < 5 secondes par page.

## Epic 3: Parcours Parent Premium

### Stories

1. Refondre Dashboard parent par priorite d'action.
2. Refondre formulaires lourds:
   - Carnet scolaire
   - Repas/recettes/ingredients
   - Alarmes
3. Harmoniser modules connaissances/succes/cinema.
4. Uniformiser patterns edition/suppression.

### Definition Of Done

1. Meme pattern formulaire pour tous modules.
2. Erreurs claires et localisees.
3. Actions destructives securisees (confirmation).

## Epic 4: Polissage Et Qualite

### Stories

1. Accessibilite complete (focus, contraste, clavier).
2. Responsive complet smartphone/tablette/desktop.
3. Motion tuning + reduced motion.
4. Etats edge cases:
   - vide
   - loading
   - error
   - offline

### Definition Of Done

1. Lint, typecheck, tests unitaires et e2e au vert.
2. Storybook build au vert.
3. Zero regressions fonctionnelles critiques.

## Plan Sessions (phase 2 execution)

1. Session A: Epic 1.
2. Session B: Epic 2 (Accueil, Ma journee, Check-lists).
3. Session C: Epic 2 (Decouvertes, Succes, Emotions, Cinema).
4. Session D: Epic 3 (Dashboard, School diary, Meals).
5. Session E: Epic 3 (Alarms, Knowledge, Achievements).
6. Session F: Epic 4 (QA globale, doc, ajustements).

## Risques A Suivre

1. Rework composant si DS non fige.
2. Dette UX si module refondu hors pattern commun.
3. Perte de lisibilite mobile sur ecrans parent riches.

## Indicateurs Post-phase 2

1. Baisse des erreurs formulaire.
2. Hausse completion enfant quotidienne.
3. Baisse du temps parent pour configurer la semaine.

