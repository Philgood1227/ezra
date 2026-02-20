# UX Blueprint Premium

## Contexte

Ezra est une web app familiale avec deux experiences distinctes:

1. Enfant (10 ans, TDAH): usage surtout tablette, puis smartphone.
2. Parent: usage desktop/laptop en priorite, puis smartphone.

Objectif de la refonte: passer d'une base fonctionnelle a une experience premium, claire, stable, et agreable au quotidien.

## Objectifs Produit

1. Reduire la charge cognitive enfant sur les taches quotidiennes.
2. Donner aux parents un cockpit clair pour piloter la semaine.
3. Rendre les actions critiques rapides en 1 a 3 taps/clics.
4. Unifier les interactions avec un design system strict.

## Non-objectifs

1. Ne pas ajouter d'algorithmes complexes invisibles.
2. Ne pas multiplier les ecrans "bonus" sans valeur quotidienne.
3. Ne pas sacrifier accessibilite et lisibilite pour l'esthetique.

## Personas Et Besoins

### Enfant (10 ans, TDAH)

1. Besoin d'une interface stable, repetitive, previsibile.
2. Besoin d'un focus sur "maintenant" et "prochaine action".
3. Besoin de feedback immediat apres chaque action.
4. Besoin de micro-textes courts et concrets.

### Parent

1. Besoin de vue d'ensemble rapide de la semaine.
2. Besoin d'edition efficace (formulaires, repetition, correction).
3. Besoin de confiance (erreurs claires, confirmation, historisation).
4. Besoin de coherence entre modules (carnet, repas, cinema, succes).

## Principes UX Directeurs

1. Priorite a l'action principale de l'ecran.
2. Une decision a la fois pour l'enfant.
3. Groupement logique des fonctions parent par objectifs.
4. Feedback constant: succes, erreur, chargement, vide.
5. Lisibilite forte: typographie simple, contraste eleve.
6. Cibles tactiles confortables.
7. Motion utile, jamais decorative seulement.
8. Progression visible partout.
9. Formulaires guides, jamais punitifs.
10. Aide contextuelle toujours au meme endroit.

## Architecture Mentale Cible

### Mode Enfant

Logique "Je regarde ce que je dois faire maintenant, puis je valide".

1. Accueil: orientation.
2. Ma journee: execution.
3. Check-lists: preparation.
4. Decouvertes: aide devoirs.
5. Plus: Succes, Cinema, Emotions.

### Mode Parent

Logique "Je planifie, je suis, j'ajuste".

1. Pilotage: dashboard, notifications, alarmes.
2. Organisation: journees types, carnet, check-lists.
3. Progression: gamification, recompenses, succes.
4. Vie familiale: repas, cinema, connaissances.

## Strategie Multi-device

### Enfant

1. Tablette: layout principal (landscape et portrait).
2. Smartphone: meme logique, densite reduite, CTA fixes en bas.
3. Desktop enfant: supporte, mais non prioritaire.

### Parent

1. Desktop/laptop: sidebar + contenu large.
2. Tablette: sidebar compacte ou drawer persistant.
3. Smartphone: navigation compacte, sections regroupes.

## Regles Formulaires Premium

1. Label au-dessus du champ.
2. Placeholder non critique.
3. Erreur pres du champ + resume global si besoin.
4. Validation progressive.
5. Format attendu explicite (date, heure, quantite, unite).
6. Bouton primaire unique en bas de formulaire.
7. Actions destructives separees visuellement.

## Regles De Motion

1. Duree courte: 120ms a 250ms.
2. Transitions de contexte douces (page, panneau, modal).
3. Micro-animation de reussite breve.
4. Respect de `prefers-reduced-motion`.
5. Jamais de mouvement continu inutile.

## Accessibilite Et Neurodiversite

1. Contrastes conformes WCAG AA.
2. Focus clavier visible et constant.
3. Taille de cible tactile confortable.
4. Libelles explicites pour lecteurs d'ecran.
5. Information jamais transmise uniquement par couleur.
6. Aide consistante et microcopy rassurante.

## Mesures De Reussite

1. Enfant: temps pour demarrer la prochaine tache.
2. Enfant: taux de completion journalier.
3. Parent: temps de creation/modification d'une entree.
4. Parent: reduction des erreurs de saisie.
5. Global: baisse des retours "je ne comprends pas ou cliquer".

## Risques Et Garde-fous

1. Risque: interface trop riche -> garde-fou: prioriser 1 CTA.
2. Risque: surcharge visuelle -> garde-fou: densite et sections.
3. Risque: navigation longue parent -> garde-fou: regroupement.
4. Risque: incoherence cross-modules -> garde-fou: DS strict.

## References Pratiques

1. W3C COGA et Content Usable.
2. WCAG 2.2 (contraste, focus, target size, help consistant).
3. Recommandations reduction de mouvement (`prefers-reduced-motion`).
