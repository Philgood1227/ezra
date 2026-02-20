# Animations and Feedback

## Motion primitives

Les primitives de `src/components/motion` sont la base unique:

1. `PageTransition`
- Transition de route (fade-in).
- A appliquer au niveau layout/shell pour eviter les doublons.

2. `StaggerContainer` + `StaggerItem`
- Entree progressive des listes/cartes.
- Delai subtil (50-70ms).

3. `ScaleOnTap`
- Feedback tactile visuel sur actions importantes.
- Utilise sur cards interactives, items tab bar, boutons cles.

4. `FadeIn`
- Apparition simple pour etats secondaires (empty state, messages).

## Reduced motion

Toutes les animations Framer Motion respectent `prefers-reduced-motion`.

Regles:

- Pas d'animation decorative sans valeur fonctionnelle.
- Desactivation automatique des transitions complexes en mode reduce.
- Durations courtes et lisibles.

## Haptic feedback

Utilitaire: `src/lib/utils/haptic.ts`.

API:

```ts
haptic("tap");
haptic("success");
haptic("error");
```

Comportement:

- Verifie support `navigator.vibrate`.
- Verifie preference utilisateur (`hapticsEnabled`).

## Sound feedback

Utilitaire: `src/lib/utils/sounds.ts`.

API:

```ts
playSound("taskComplete");
playSound("checklistComplete");
playSound("badgeUnlock");
```

Comportement:

- Web Audio court et calme.
- Desactive si `soundsEnabled` est faux.
- Desactive en reduced motion.

## Preferences utilisateur

Source: `src/lib/preferences/feedback.ts`.

- `hapticsEnabled` (defaut `true`)
- `soundsEnabled` (defaut `false`)

Hook client:

- `useFeedbackPreferences(scope)`

UI:

- `src/components/preferences/feedback-preferences-card.tsx`

## Offline-safe interactions

Avant action serveur, verifier la connectivite:

```ts
if (!isOnline()) {
  toast.error("Mode hors-ligne active, action indisponible.");
  return;
}
```

Utilitaire: `src/lib/utils/network.ts`.
