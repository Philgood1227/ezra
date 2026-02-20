# Accessibility Guide

## Standards cible

- WCAG 2.2 AA (pratique)
- W3C COGA (orientation cognitive, langage simple, previsibilite)

## Structure semantique

Chaque ecran doit exposer:

- `header` pour le contexte de page
- `nav` pour la navigation
- `main` pour le contenu principal
- `footer` si present

Un skip link global existe dans `src/app/layout.tsx`.

## Clavier

Regles:

1. Tous les controles doivent etre focusables.
2. L'ordre de tab suit l'ordre visuel.
3. Le focus visible ne depend pas uniquement de la couleur.
4. Les overlays/modales restent fermables clavier (ESC).

## Screen reader

Regles:

1. Boutons icon-only avec `aria-label`.
2. `aria-current="page"` pour les liens actifs.
3. Messages d'erreur lisibles via `aria-describedby`.
4. Textes de statut courts et explicites.

## COGA patterns appliquees

1. Compréhensible
- Phrases courtes en francais.
- Une action principale par bloc.

2. Previsible
- Meme structure header + contenu + actions.
- Meme style de composants et feedback.

3. Aide a se reperer
- Breadcrumb parent.
- Titres explicites dans les modules enfant.

4. Reduire la memoire de travail
- Contexte temporel et progression toujours visibles.

5. Aide a la concentration
- Animations douces, desactivables via reduced motion.

6. Prevenir les erreurs
- Validation inline sur formulaires parent.
- Confirmation claire des actions critiques.

7. Offrir de l'aide
- Empty states avec explication + action.
- Feedback toasts explicites.

8. Personnalisation
- Theme clair/sombre.
- Haptique activable/desactivable.
- Sons optionnels, off par defaut.

## Tests

1. Unit/component
- Etats focus/labels essentiels sur composants critiques.

2. E2E smoke
- Presence skip link.
- Presence landmarks (`header`, `nav`, `main`).
- Navigation clavier de base.

Fichier: `e2e/accessibility-smoke.spec.ts`.
