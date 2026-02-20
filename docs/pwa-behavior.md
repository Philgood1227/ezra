# PWA Behavior

## Targets

Ezra est optimise pour:

- Mobile: 375px+
- Tablette: 768x1024 (prioritaire)
- Desktop: 1024px+

## Layout behavior

### Enfant

- Navigation basse avec `pb-safe`.
- Contenu centré et espacement respirant.
- Mode focus plein ecran sans tab bar.

### Parent

- Sidebar persistante desktop, repliable tablette, drawer mobile.
- Header sticky avec breadcrumb et actions.

## Safe-area handling

Utilities globales (`src/app/globals.css`):

- `.pt-safe`
- `.pb-safe`
- `.px-safe`

Appliquer sur:

- Header sticky
- Navigation basse
- Overlays fixes

## Orientation

Manifest (`src/app/manifest.ts`):

- `orientation: "any"` pour laisser portrait/paysage.

Le contenu critique (timeline, dashboard, focus timer) doit rester lisible dans les deux orientations.

## Offline UX

1. Route offline: `src/app/~offline/page.tsx`
2. Banner global hors ligne: `src/components/feedback/network-status-banner.tsx`
3. Toast reconnexion: "Connexion retablie."

Regle action reseau:

- En mode offline, bloquer l'action et afficher un message clair.

## Installability

Manifest + icones + start URL restent fournis.
PWA conserve un comportement standalone et un rendu tokenise cohérent en mode clair/sombre.
