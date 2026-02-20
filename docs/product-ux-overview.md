# Product UX Overview

## Vision

Ezra propose une experience premium et coherente pour deux usages complementaires:

- Espace Enfant: calme, visuel, guide pas a pas.
- Espace Parent: pilotage clair, decisions rapides, configuration fiable.

Le systeme visuel repose sur les tokens semantiques, les cards glassmorphism, les animations douces et le mode clair/sombre.

## Principes UX

1. Charge cognitive reduite
- Une idee principale par bloc.
- Hierarchie visuelle forte (titre, action, etat).
- Feedback immediat (visuel + haptique optionnel).

2. Previsibilite
- Navigation stable sur toutes les pages.
- Etats de chargement skeleton uniformes.
- Etats vides explicites avec action suivante.

3. Progression visible
- Progress bars, badges, et indicateurs "Maintenant/Ensuite".
- Retour positif sur les validations (points, succes, toasts).

4. Accessibilite by default
- Focus visible.
- Landmarks semantiques.
- Reduction du mouvement respectee.
- Libelles en francais clair.

## Flux principaux

### Enfant

1. Accueil: hero contextuel, horloge, maintenant/ensuite, progression, checklist, calendrier.
2. Ma journee: timeline verticale, validation tactile, mode focus.
3. Modules secondaires: checklists, decouvertes, succes, cinema, emotions, repas.

## Child Home Day Cockpit (Current)

### Purpose

`/child` est un cockpit compact, en francais, qui repond a trois questions seulement:

1. On est quel jour aujourd'hui ?
2. Qu'est-ce que je fais maintenant et ensuite ?
3. Ou je vais pour mes fiches et mes outils ?

L'ecran doit rester lisible en un coup d'oeil sur tablette paysage, sans contenu redondant.

### Main sections

1. `TodayHeader`:
   - libelle `Aujourd'hui`,
   - date principale `JourSemaine + numero` (ex: `Dimanche 15`),
   - ligne secondaire `Mois + annee` (ex: `Fevrier 2026`),
   - frise hebdo compacte sur une ligne (`L M M J V S D`) avec jour courant accentue.
2. `En ce moment` card (primary activity card):
   - exactly two rows: `Maintenant` and `A suivre`,
   - compact timeline-like visual hierarchy,
   - primary CTA `Continuer ma journee`,
   - legere elevation visuelle par rapport aux deux autres blocs.
3. `Fiches & Outils` card:
   - deux acces tactiles larges,
   - `Fiches d'aide` -> `/child/knowledge`,
   - `Outils de travail` -> `/child/my-day` (acces mode focus/timers depuis Ma journee).
4. Bottom navigation:
   - larger labels (readable on tablet),
   - DS-style SVG icons,
   - onglet actif clairement souligne (`Accueil` sur `/child`).

All three content blocks (`TodayHeader`, `En ce moment`, `Fiches & Outils`) share the same horizontal grid and container width on Home.

Removed from Home:

1. bloc horloge (digitale/analogique) et overlay associe,
2. concepts temps long: saisons, mois en frise, annee, jour/nuit, lever/coucher du soleil,
3. cartes resume redondantes (`points`, `checklists`, `discoveries`).

### Data model and read path

Home stays read-only. It depends on:

1. `task_instances` + day-template context for `Maintenant`/`A suivre` (`src/lib/api/child-home.ts`).
2. family location resolver (`src/lib/time/family-location.server.ts`):
   - reserved config key: `family_location`,
   - current behavior: stubbed read, fallback to Geneva (`DEFAULT_FAMILY_LOCATION_GENEVA`),
   - timezone used for date rendering, no schema change in this iteration.

No write operation is performed on `/child`.

### Visual and accessibility rules

1. Child-facing text and ARIA labels remain French only.
2. Major zones use gentle DS tints/gradients to avoid a monochrome screen.
3. Contrast and touch targets remain compatible with ADHD/dyslexia-friendly reading.

### Responsive behavior guarantees

1. Mobile: stacked cards with the same component hierarchy.
2. Tablet landscape (primary target): `TodayHeader` + `En ce moment` + `Fiches & Outils` + nav fit without vertical scrolling in normal conditions.
3. Desktop: same structure, only spacing scales.

### Future work

1. Parent dashboard setting for `family_location` (city, latitude, longitude, timezone).
2. Persisted location read in Home instead of Geneva fallback.
3. Ecran dedie `Temps / Calendrier` pour horloge detaillee, saisons, mois, annee et autres reperes long terme.

### Parent

1. Shell parent: sidebar 3 sections + header avec breadcrumb/actions.
2. Dashboard: KPI, widgets hebdo, actions rapides.
3. Modules de configuration: journees types, carnet, checklists, repas, succes, recompenses.

## Onboarding et personnalisation

### Parent onboarding

- Modal multi-etapes (4 max): bienvenue, espaces, objectif principal, preferences de base.
- Preferences initiales: theme, haptique, sons.
- Persistance: localStorage profile-scoped (fallback metadata-friendly).

### Enfant onboarding

- Overlay plein ecran (3 etapes max): bienvenue, onglets principaux, pret a commencer.
- Option "Me rappeler plus tard" avec mini tutoriel.
- Langage simple et non pressant (COGA-friendly).

## Feedback et confiance

- Haptique: tap/success/error sur actions cles.
- Sons: optionnels, courts, calmes, desactives par defaut.
- Offline banner global + toast de reconnexion.

## Implementation references

- Layouts: `src/components/layout/child-shell.tsx`, `src/components/layout/parent-shell.tsx`
- Onboarding: `src/components/onboarding/*`
- Preferences: `src/lib/preferences/*`, `src/lib/hooks/useFeedbackPreferences.ts`
- Feedback: `src/lib/utils/haptic.ts`, `src/lib/utils/sounds.ts`
- Offline UX: `src/components/feedback/network-status-banner.tsx`, `src/app/~offline/page.tsx`
