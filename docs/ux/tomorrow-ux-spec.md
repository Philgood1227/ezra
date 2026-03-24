# Tomorrow / Preparer UX Spec

## Ecran enfant "Demain"

### Point d'entree et navigation
- L'entree enfant reste la route existante `/child/checklists`.
- Aucun nouveau pattern de navigation n'est introduit.
- Aucun tap de la timeline "Moments cles" ne declenche de navigation.

### Hierarchie de layout
- Titre ecran: `DEMAIN`.
- Sous-titre: `<weekday dd mmm> - <Type de jour>`.
- Bloc 1: `Apercu de demain` (type de jour + premiere transition si disponible).
- Bloc 2: `Moments cles` (liste verticale, max 5 elements).
- Bloc 3: `A preparer` (liste checklist) ou etat vide calme.
- Bloc 4: CTA final unique.

### Apercu demain
- Type de jour affiche de facon dominante (`Ecole`, `Week-end`, `Journee speciale`).
- Sous-texte de transition (exemple: `Depart a HH:MM`) si des moments sont disponibles.
- Pas de CTA dominant dans ce bloc.

### Moments cles
- Liste verticale simplifiee de 3 a 5 elements maximum (hard cap a 5).
- Chaque ligne affiche `icone + horaire + libelle + type`.
- Les donnees viennent des taches planifiees de demain (instances planifiees si disponibles, sinon taches du template du jour suivant).
- Ordre deterministe: chronologique, puis fallback stable (`sortOrder`, puis `id`).
- Types d'icone utilises: `mission`, `activity`, `leisure`.
- Etat vide "Aucun moment cle configure pour demain." uniquement si aucune tache planifiee n'existe.

### Checklist "A preparer"
- Rendue avec les items checklist de demain uniquement.
- Interaction: tap sur ligne => toggle via la logique existante `toggleChecklistInstanceItemAction`.
- Rafraichissement UI apres succes via `router.refresh`.
- Feedback doux: animation de coche + microcopy courte.
- Si aucun item: afficher l'etat vide `Tout est pret pour demain 👍`.

### CTA final
- Un seul CTA dominant: `C'est pret`.
- Comportement: acknowledge local uniquement (pas de navigation, pas de nouveau backend).
- Feedback de validation doux avec microcopy courte.

## Contraintes ADHD / Dyslexie
- Maximum 4 blocs principaux visibles.
- Un seul CTA dominant (CTA final).
- Typographie lisible (>= 16px) et espacements aeres.
- Icones toujours accompagnees d'un texte.
- Transitions douces uniquement (150-300ms), sans animation distrayante.

## Responsive
- Smartphone: une seule colonne, CTA final pleine largeur.
- Tablette/Desktop (md+): composition en 2 colonnes DS.
- Colonne gauche: `Apercu de demain` + `Moments cles`.
- Colonne droite: `A preparer` + bloc `C'est pret`.
- Ecran centre DS avec espacement vertical renforce et padding bas pour eviter tout recouvrement avec la navigation.
