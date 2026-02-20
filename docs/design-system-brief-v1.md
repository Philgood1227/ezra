# Design System Brief V1

## Objectif

Creer un design system unifie pour eviter:

1. Styles ad hoc.
2. Incoherences inter-modules.
3. Regressions UX sur mobile/tablette/desktop.

## Foundations

## Couleurs (tokens semantiques)

1. `color-bg-app`
2. `color-bg-surface`
3. `color-bg-elevated`
4. `color-text-primary`
5. `color-text-secondary`
6. `color-border-default`
7. `color-primary`
8. `color-success`
9. `color-warning`
10. `color-danger`
11. `color-info`

Regles:

1. Pas d'usage direct d'hex dans les composants.
2. Contraste AA minimum.

## Typographie

1. `font-body`: lecture longue et formulaires.
2. `font-display`: titres forts et elements enfant.
3. Echelle recommandee:
   - `text-xs` 12
   - `text-sm` 14
   - `text-md` 16
   - `text-lg` 18
   - `text-xl` 24
   - `text-2xl` 32

Regles:

1. Interlignage confortable.
2. Eviter plus de 2 graisses par ecran.

## Spacing Et Layout

1. Base 4px.
2. Steps principaux: 4, 8, 12, 16, 24, 32, 40.
3. Grille:
   - mobile: 4 colonnes
   - tablette: 8 colonnes
   - desktop: 12 colonnes

## Radius Et Ombres

1. Radius: 8, 12, 16, 24.
2. Ombres:
   - faible (cards)
   - moyenne (menus)
   - forte (modales)

## Motion Tokens

1. Durations: 120ms, 180ms, 240ms.
2. Easing: `standard`, `enter`, `exit`.
3. Respect strict `prefers-reduced-motion`.

## Composants Obligatoires V1

1. Button
   - variants: primary, secondary, ghost, danger
   - sizes: sm, md, lg
   - states: default, hover, focus, disabled, loading
2. Input/Textarea/Select
   - label + hint + error + optional helper
3. Checkbox/Radio/Switch
4. Card
   - stat card, action card, list card
5. Badge/Tag/Chip
6. Tabs/Segmented
7. Modal/Drawer
8. Toast/Banner/Alert
9. Empty state + Skeleton
10. Navigation primitives
    - tab bar enfant
    - sidebar parent
    - menu mobile parent

## Patterns Obligatoires

1. Formulaire creation edition
2. Liste filtrable
3. Detail + actions
4. Dashboard widget
5. Confirmation destructive
6. Success feedback pattern

## Regles Formulaires

1. Label toujours visible.
2. Validation avant submit si possible.
3. Erreur au champ + message global si multi-erreurs.
4. Destructive actions separees du submit.
5. CTA primaire unique.

## Regles CTA

1. Une action primaire par zone.
2. Libelles en verbe d'action.
3. Secondary pour alternatives non critiques.
4. Ghost pour actions annexes.

## Accessibilite

1. Focus visible sur tous elements interactifs.
2. Navigation clavier complete.
3. `aria-label` explicites pour icones.
4. Couleur jamais seule porteuse de sens.
5. Taille tactile confortable.

## Guidelines Enfant

1. Densite faible.
2. Texte court, concret.
3. Illustration fonctionnelle, non decorative.
4. Feedback positif immediat apres action.
5. Peu d'options simultanees.

## Guidelines Parent

1. Densite moyenne a forte mais structuree.
2. Plus de donnees visibles sans perdre lisibilite.
3. Actions de masse et edition rapide possibles.

## Definition Of Done DS V1

1. Tokens centralises.
2. Composants documentes dans Storybook.
3. Variants et etats couverts en test visuel.
4. Aucun composant nouveau hors DS sans justification.

