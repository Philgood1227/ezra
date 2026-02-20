# Alarmes

## Objectif

Le module alarmes permet au parent de programmer des rappels pour l'enfant:

- alarmes ponctuelles
- alarmes recurrentes (semaine de travail, semaine complete, jours personnalises)
- son associe
- message en grand format cote enfant

## Data model

- `alarm_rules`
  - definition de la regle (mode, horaire/date, jours, son, message, active)
- `alarm_events`
  - occurrences declenchees et acquittement (`declenchee` -> `acknowledged`)

RLS:

- parent: CRUD sur les regles de la famille
- enfant: lecture de ses regles/evenements + acquittement de ses propres evenements

## UX

## Parent (`/parent/alarms`)

- creation et edition de regles
- activation/desactivation rapide
- suppression
- historique recent des declenchements

## Enfant (global, toutes pages enfant)

- polling periodique des alarmes dues
- affichage d'un modal plein ecran
- lecture d'un son
- bouton d'acquittement

## MVP A puis MVP B

MVP A (implante):

- evaluation "due now" par polling client (enfant)
- creation d'evenements dans `alarm_events` au moment du polling
- comportement simple et transparent

MVP B (cible):

- generation/declenchement par scheduler (cron/edge function)
- eventuellement push/web notification en plus du modal in-app
- meilleure robustesse quand l'app n'est pas ouverte

Le domaine `src/lib/domain/alarms.ts` est reutilisable pour la migration vers B.

## Qualite

Tests ajoutes:

- `src/lib/domain/alarms.test.ts`
- `src/__tests__/ParentAlarmsManager.test.tsx`
- `src/__tests__/ChildAlarmCenter.test.tsx`
