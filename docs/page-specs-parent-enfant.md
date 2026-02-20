# Page Specs Parent Enfant

## Convention

Pour chaque page:

1. Objectif.
2. Contenu prioritaire.
3. Action principale.
4. Etats obligatoires.

## Espace Enfant

### `/child` (Accueil)

1. Objective: provide an instant French-only day cockpit in less than 5 seconds.
2. Primary layout blocks (in order):
   - Compact header: `TodayHeader` (`Aujourd'hui` + weekday/day + month/year) and a single-row week strip (`L M M J V S D`) with current day highlighted.
   - `En ce moment` card (exactly 2 rows: `Maintenant` + `A suivre` + single CTA)
   - `Fiches & Outils` card (two large accesses: `Fiches d'aide` and `Outils de travail`)
3. Main action: `Continuer ma journee` -> `/child/my-day`.
4. Data dependencies (read-only):
   - task instances and day template context
   - school periods and day blocks for contextual state fallback (logic only)
   - family location resolver using `family_location` setting name (stubbed now, Geneva fallback)
5. Mandatory states:
   - current task + next task available
   - no tasks configured today
   - before first task of day
   - after last task of day
   - school block active (context-only now state)
   - loading skeleton
6. Responsive behavior:
   - mobile: stacked cards, compact header and stacked tools accesses
   - tablet landscape: no vertical scroll in normal conditions, header + `En ce moment` + `Fiches & Outils` above the nav
   - desktop: same cockpit structure, more spacing only
7. Navigation contracts:
   - no duplicate module navigation inside Home
   - no points/checklists/discoveries summary cards in Home
   - no horloge/day-night/sunrise-sunset/saisons/mois/annee content in Home
   - bottom tab keeps DS style and exposes clear `Accueil`, `Ma journee`, `Fiches`, `Plus` entry points
8. Known limitations:
   - family location is not yet configurable in parent UI
   - Home currently falls back to Geneva when `family_location` is unavailable
9. Language contract:
   - all child-facing UI and ARIA labels on `/child` must remain in French (`Aujourd'hui`, `En ce moment`, `Maintenant`, `A suivre`, etc.).

### `/child/my-day`

1. Objectif: executer la journee et valider les actions.
2. Contenu prioritaire:
   - timeline claire (maintenant/prochain)
   - statut de chaque tache
   - badge d'assignation (Moi, Parent, Famille)
   - points gagnables/gagnes
3. Action principale: "Valider la tache".
4. Etats obligatoires:
   - tache en retard
   - tache verrouillee
   - journee vide

### `/child/checklists`

1. Objectif: preparer le materiel et routines.
2. Contenu prioritaire:
   - check-lists du jour
   - progression par checklist
   - elements restants
3. Action principale: "Cocher".
4. Etats obligatoires:
   - aucune checklist
   - checklist complete

### `/child/knowledge`

1. Objectif: trouver une fiche d'aide en 2 taps.
2. Contenu prioritaire:
   - matieres
   - categories
   - cartes/fiches
   - favoris
3. Action principale: "Ouvrir la fiche".
4. Etats obligatoires:
   - aucune fiche dans la categorie
   - recherche vide

### `/child/achievements`

1. Objectif: montrer progression et prochains succes.
2. Contenu prioritaire:
   - progression globale
   - grille badges debloques/verrouilles
   - indice simple pour debloquer
3. Action principale: "Voir mon prochain objectif".
4. Etats obligatoires:
   - aucun badge debloque
   - nouveau badge debloque (toast/animation breve)

### `/child/cinema`

1. Objectif: choisir un film simplement.
2. Contenu prioritaire:
   - prochaine session
   - 3 options max
   - mon vote
3. Action principale: "Choisir ce film".
4. Etats obligatoires:
   - aucune session planifiee
   - film deja choisi

### `/child/emotions`

1. Objectif: check-in emotion matin/soir en quelques secondes.
2. Contenu prioritaire:
   - 5 emotions visuelles
   - deux moments (matin, soir)
   - statut fait/a faire
3. Action principale: "Enregistrer".
4. Etats obligatoires:
   - deja saisi pour ce moment
   - hors plage du jour

### `/child/focus/[instanceId]`

1. Objectif: executer une session de concentration sans distraction.
2. Contenu prioritaire:
   - timer central
   - tache liee
   - actions pause/reprendre/terminer
3. Action principale: "Demarrer" ou "Terminer la session".
4. Etats obligatoires:
   - timer termine
   - session interrompue

### `/child/meals`

1. Objectif: aucun, route neutralisee.
2. Comportement: redirection vers `/child`.

## Espace Parent

### `/parent/dashboard`

1. Objectif: pilotage hebdo en un coup d'oeil.
2. Contenu prioritaire:
   - completion taches + points
   - emotions semaine
   - repas/favoris
   - charge du jour
3. Action principale: "Ajuster la semaine" (lien vers modules).
4. Etats obligatoires:
   - semaine vide
   - donnees partielles

### `/parent/day-templates`

1. Objectif: gerer la structure type de la semaine.
2. Contenu prioritaire:
   - templates par jour
   - template par defaut
3. Action principale: "Creer une journee type".
4. Etats obligatoires:
   - aucun template

### `/parent/day-templates/[id]`

1. Objectif: editer les taches d'un template.
2. Contenu prioritaire:
   - ordre, horaires, categorie
   - points
   - assignation
   - lien fiche d'aide
3. Action principale: "Enregistrer le template".
4. Etats obligatoires:
   - conflits horaires
   - donnees invalides

### `/parent/categories`

1. Objectif: gerer categories de taches.
2. Contenu prioritaire:
   - nom, icone, couleur
3. Action principale: "Ajouter categorie".
4. Etats obligatoires:
   - categorie dupliquee

### `/parent/school-diary`

1. Objectif: planifier les entrees scolaires.
2. Contenu prioritaire:
   - liste des entrees
   - edition
   - recurrence
3. Action principale: "Ajouter entree".
4. Etats obligatoires:
   - validation date/recurrence
   - suppression avec confirmation

### `/parent/checklists`

1. Objectif: gerer modeles de check-lists.
2. Contenu prioritaire:
   - modeles
   - items
   - contexte d'usage
3. Action principale: "Creer modele".
4. Etats obligatoires:
   - modele vide

### `/parent/notifications`

1. Objectif: definir rappels automatiques.
2. Contenu prioritaire:
   - regles actives
   - types de notification
3. Action principale: "Ajouter regle".
4. Etats obligatoires:
   - conflit de regles

### `/parent/knowledge`

1. Objectif: gerer matieres de la base d'aide.
2. Contenu prioritaire:
   - matieres
   - compteurs categories/fiches
3. Action principale: "Ajouter matiere".
4. Etats obligatoires:
   - code deja utilise

### `/parent/knowledge/[subjectId]`

1. Objectif: gerer categories + fiches d'une matiere.
2. Contenu prioritaire:
   - categories triables
   - fiches
   - formulaire fiche structuree
3. Action principale: "Ajouter fiche".
4. Etats obligatoires:
   - categorie invalide
   - contenu incomplet

### `/parent/achievements`

1. Objectif: activer/desactiver et creer succes.
2. Contenu prioritaire:
   - categories
   - succes actifs
   - formulaire creation succes custom
3. Action principale: "Creer succes".
4. Etats obligatoires:
   - regle invalide
   - succes inactif

### `/parent/cinema`

1. Objectif: planifier et suivre sessions cinema.
2. Contenu prioritaire:
   - sessions futures
   - options films
   - statut vote/choix
3. Action principale: "Planifier session".
4. Etats obligatoires:
   - pas d'option film
   - session deja choisie

### `/parent/alarms`

1. Objectif: planifier alarmes ponctuelles/recurrentes.
2. Contenu prioritaire:
   - regles actives
   - mode, sons, message plein ecran
3. Action principale: "Creer alarme".
4. Etats obligatoires:
   - recurrence invalide
   - horaire invalide

### `/parent/meals`

1. Objectif: organiser repas + recettes + ingredients.
2. Contenu prioritaire:
   - semaine des repas
   - recette optionnelle
   - ingredients du repas
   - base ingredients
   - liste agregee semaine
3. Action principale: "Ajouter repas".
4. Etats obligatoires:
   - ingredient absent
   - creation ingredient invalide
   - aucun repas saisi

### `/parent/rewards`

1. Objectif: definir paliers de recompenses.
2. Contenu prioritaire:
   - paliers + cout points
3. Action principale: "Ajouter palier".
4. Etats obligatoires:
   - points invalides

### `/parent/gamification`

1. Objectif: suivre mecaniques points/timers.
2. Contenu prioritaire:
   - regles actuelles
   - historique
3. Action principale: "Ajuster parametres autorises".
4. Etats obligatoires:
   - aucune donnee

### `/parent/settings`

1. Objectif: parametres famille et application.
2. Contenu prioritaire:
   - preferences globales
   - securite/compte
3. Action principale: "Enregistrer".
4. Etats obligatoires:
   - erreur de sauvegarde

## Pages Auth Et Systeme

### `/auth/*`

1. Objectif: connexion simple et sans friction.
2. Exiger:
   - messages d'erreur clairs
   - differentiation login parent / pin enfant

### `/~offline`

1. Objectif: expliquer clairement le mode hors-ligne.
2. Exiger:
   - ce qui reste disponible
   - comment relancer la sync
