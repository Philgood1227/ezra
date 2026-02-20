# Design System Ezra (Premium ADHD-Friendly)

## Vue d'ensemble

Le Design System Ezra fournit une base visuelle premium, cohérente et cognitive-friendly pour les deux espaces:

1. **Espace Enfant**: interactions tactiles, repères visuels forts, charge cognitive réduite.
2. **Espace Parent**: densité maîtrisée, lisibilité élevée, efficacité d'action.

Inspirations produit:

1. Tiimo (routine visuelle douce).
2. Headspace (apaisement, hiérarchie claire).
3. Brili (structure temporelle explicite).

Principes ADHD/COGA appliqués:

1. Actions principales isolées, peu de concurrence visuelle.
2. Composants répétables et prévisibles.
3. Touch targets larges (>= 48px sur interactions enfant).
4. Contrastes et états explicites (focus, erreur, succès, progression).
5. Animations courtes et non bloquantes, désactivées si `prefers-reduced-motion`.

## Tokens sémantiques

Source:

1. `src/app/globals.css` (variables CSS light/dark).
2. `tailwind.config.ts` (mapping Tailwind via `rgb(var(--token) / <alpha-value>)`).

### Couleurs

1. Fond:
   - `bg.base`, `bg.surface`, `bg.surface-hover`, `bg.elevated`
2. Texte:
   - `text.primary`, `text.secondary`, `text.muted`, `text.inverse`
3. Marque:
   - `brand.primary`, `brand.secondary`
4. Accents:
   - `accent.warm`, `accent.soft`
5. Statuts:
   - `status.success`, `status.warning`, `status.error`, `status.info`
6. Bordures:
   - `border.default`, `border.subtle`
7. Catégories:
   - `category.routine`, `category.ecole`, `category.repas`, `category.sport`,
     `category.loisir`, `category.calme`, `category.sommeil`

### Espacements tactiles

1. `touch-sm`: `44px`
2. `touch-md`: `48px`
3. `touch-lg`: `56px`

### Rayon

1. `rounded-radius-card`: `16px`
2. `rounded-radius-button`: `12px`
3. `rounded-radius-pill`: `9999px`

### Ombres

1. `shadow-card`: élévation standard.
2. `shadow-glass`: surface glassmorphism.
3. `shadow-elevated`: modales/dropdowns.

### Typographie

1. `font-sans`: Inter, Nunito, fallback système.
2. `font-display`: Baloo 2 (titres et repères enfant).

## Mode sombre/clair

Stratégie:

1. `darkMode: "class"` (Tailwind).
2. Variables CSS en `:root` et `.dark`.
3. Initialisation anti-FOUC via script inline (`ThemeScript`) dans `layout`.

API:

1. Hook `useTheme` (`src/lib/hooks/useTheme.ts`):
   - `theme: "light" | "dark" | "system"`
   - `setTheme(theme)`
   - `toggleTheme()`
2. Persistance:
   - `localStorage["ezra-theme"]`
3. Provider:
   - `ThemeProvider` (`src/components/ds/theme-provider.tsx`)
4. Toggle UI:
   - `ThemeToggle` (`src/components/ds/theme-toggle.tsx`)

## Catalogue de composants DS

Dossier: `src/components/ds/`

1. `Button`
   - Variants: `primary`, `secondary`, `tertiary`, `ghost`, `danger`, `link`
   - Sizes: `sm`, `md`, `lg`
   - États: `loading`, `disabled`, `fullWidth`
   - Effet tactile via `ScaleOnTap`
2. `Card`
   - Style glassmorphism (`bg-bg-surface/80`, `backdrop-blur-sm`)
   - Option `interactive` (survol avec élévation)
3. `Badge`
   - Variants statut + catégories (routine, école, repas, etc.)
4. `TabBar`
   - Navigation enfant bottom-first
   - Support icônes, badge count, badge dot, indicateur actif
5. `Input`, `Select`, `TextArea`
   - Cohérence visuelle et focus ring sémantique
   - `errorMessage` et `successMessage`
6. `Modal`
   - Overlay blur + animation d'entrée/sortie
   - Fermeture via Escape/clic externe/bouton
7. `ProgressBar`
   - Variants `primary`, `success`, `warning`, `accent-warm`
   - Label de pourcentage optionnel
8. `Avatar`
   - Tailles `sm`, `md`, `lg`
   - Image ou initiales, ring optionnel
9. `Skeleton`
   - Shimmer natif Tailwind (`animate-shimmer`)
   - `circle` et `count`
10. `EmptyState`
    - Icône, titre, description, action CTA
11. `ToastProvider` + `useToast`
    - `toast.success/error/info/warning(...)`
    - Position `bottom-center` ou `top-right`
    - Auto-dismiss 4s

## Animations

Primitives: `src/components/motion/`

1. `PageTransition`: fade-in page.
2. `StaggerContainer` / `StaggerItem`: entrée séquentielle de listes.
3. `ScaleOnTap`: compression tactile (`whileTap`).
4. `FadeIn`: apparition progressive configurable.

Toutes les primitives respectent `useReducedMotion()` de Framer Motion.

## Patterns Skeleton & Empty State

1. Skeleton:
   - utiliser pendant chargement async court.
   - conserver la structure de layout finale pour éviter les sauts.
2. EmptyState:
   - message explicite et orienté action.
   - CTA unique pour l'étape suivante.

## Haptic Feedback

Utilitaire:

1. `src/lib/utils/haptic.ts`
2. API: `haptic("tap" | "success" | "error")`

Usage recommandé:

1. `tap` sur interactions fréquentes enfant.
2. `success` après validation d'une tâche.
3. `error` sur action bloquée/échec.

## Storybook et validation visuelle

1. Toolbar thème clair/sombre dans `.storybook/preview.ts`.
2. Decorator global avec `ThemeProvider`.
3. Stories DS en clair et sombre pour chaque composant.
4. Stories motion dédiées:
   - `src/components/motion/page-transition.stories.tsx`
   - `src/components/motion/list-stagger.stories.tsx`

## Guidelines d'usage

1. Espace Enfant:
   - privilégier `size="lg"` ou `touch-lg` pour CTA critiques.
   - limiter à 1 action primaire par bloc.
   - textes courts et verbes concrets.
2. Espace Parent:
   - densité modérée avec cartes et listes lisibles.
   - privilégier variantes `secondary`/`ghost` pour actions secondaires.
3. Typographie:
   - `font-display` pour titres structurants.
   - `font-sans` pour lecture continue/formulaires.
4. Espacement:
   - conserver des respirations généreuses entre sections.
   - éviter les regroupements denses d'actions destructives.

## Navigation enfant (pattern 4+1)

La navigation enfant utilise un pattern fixe en bas d'ecran:

1. `Accueil` (`/child`)
2. `Ma journee` (`/child/my-day`)
3. `Checklists` (`/child/checklists`)
4. `Decouvertes` (`/child/knowledge`)
5. `Plus` (ouvre un panneau)

Le panneau `Plus` ouvre un bottom sheet anime avec:

1. `Succes` (`/child/achievements`)
2. `Cinema` (`/child/cinema`)
3. `Emotions` (`/child/emotions`)
4. `Repas` (`/child/meals`)

Regles UI:

1. Cibles tactiles >= `touch-lg` (56px)
2. Label toujours visible sous l'icone
3. Indicateur actif visible (couleur + point)
4. Badge numerique possible sur un onglet (ex: checklists a faire)
5. Safe area iOS via utilitaire `pb-safe`

## Architecture widgets Accueil enfant

Le nouvel accueil (`/child`) suit une hierarchie stable:

1. `GreetingHero`
2. `ClockWidget`
3. `NowNextCard`
4. `DailyProgressWidget`
5. Ligne basse: `ChecklistSummaryWidget` + `CalendarStripWidget`

Implementation:

1. `src/app/(child)/child/page.tsx` charge les donnees serveur
2. `src/components/child/child-home-live.tsx` gere le rendu client et l'horloge temps reel
3. `src/lib/api/child-home.ts` consolide les donnees pour tous les widgets

Animation et chargement:

1. `PageTransition` sur l'entree de page
2. `StaggerContainer` / `StaggerItem` pour l'apparition en cascade
3. Skeleton par widget + `loading.tsx` pour le fallback route-level
4. Respect automatique de `prefers-reduced-motion`
