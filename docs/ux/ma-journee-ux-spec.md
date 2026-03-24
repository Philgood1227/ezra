# Ma Journee UX Spec

## Carte "À FAIRE"

### Regle de visibilite
- La carte "À FAIRE" est affichee uniquement si une tache active existe.
- Si aucune tache active n'existe, la carte n'est pas rendue (aucun placeholder, aucune action desactivee).

### Hierarchie visuelle
- Titre de section: `À FAIRE`.
- Nom de tache: une seule ligne, texte dominant.
- Ligne de duree: format en minutes (ex: `15 min`).
- Zone d'actions: position stable et ordre fixe.

### Actions et comportements
- `Fait` (CTA principal):
  - Met la tache a `termine` via la logique existante.
  - Declenche les mecanismes existants de points/recompenses.
  - Lance un rafraichissement UI (`router.refresh`) apres succes.
  - Affiche un feedback positif court avec animation douce de validation.
- `Pause` / `Reprendre` (CTA secondaire):
  - Bascule l'etat pause dans la vue simplifiee.
  - Affiche un style attenue de carte + badge `En pause`.
  - Declenche un rafraichissement UI (`router.refresh`) apres bascule.
  - Si le timer simple est actif en focus overlay, il est fige au passage en pause.
- `Focus` (CTA secondaire, icone + texte):
  - Affiche un overlay focus (modal) sans navigation de route.
  - Disponible uniquement pour les taches d'effort (metadata mission/devoir/revision/lecture).
  - A la fin d'une session focus, l'overlay se ferme automatiquement et retourne a la carte.

## Regles ADHD / dyslexie (carte seulement)
- Un seul CTA dominant: `Fait`.
- Typographies lisibles (>= 16px) et espacements aeres.
- Pas d'icone seule: icones toujours accompagnees d'un libelle.
- Transitions douces uniquement (150 a 300ms), sans animation distraillante.

## Regles responsive
- Smartphone: carte pleine largeur, boutons facilement tappables, `Fait` visuellement dominant.
- Tablette paysage: respect des regles DS existantes, actions pouvant tenir sur une ligne si la place le permet.
- Desktop: conteneur centre DS existant, pas de nouvelle grille.

## Focus/Timer Overlay
- L'integration focus/timer reutilise les composants existants.
- Aucun nouvel ecran de navigation n'est ajoute pour la carte "À FAIRE".
- L'overlay se ferme automatiquement en fin de session focus.
