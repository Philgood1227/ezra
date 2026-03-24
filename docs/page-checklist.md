# Documentation - Page Checklist

## 1) Objectif
La page Checklist enfant (`/child/checklists`) sert a preparer la journee de demain.
Elle affiche:
- un apercu de demain,
- les moments cles (planning),
- les elements a preparer sous forme de checklist cochable.

## 2) Route et composants utilises
- Route serveur: `src/app/(child)/child/checklists/page.tsx`
- Etat de chargement: `src/app/(child)/child/checklists/loading.tsx`
- Vue principale (client): `src/components/child/tomorrow/child-tomorrow-view.tsx`
- Ligne d item checklist: `src/components/child/checklists/checklist-item-row.tsx`

## 3) Flux de donnees (serveur -> client)
1. La route appelle `getChecklistPageDataForCurrentChild()` (dans `src/lib/api/checklists.ts`).
2. Cette fonction recupere:
   - `tomorrow`: resume preparation de demain (date, type de jour, moments cles),
   - `byDay`: checklists `today` et `tomorrow`.
3. La page passe ensuite a la vue:
   - `tomorrow={pageData.tomorrow}`
   - `checklistInstances={pageData.byDay.tomorrow}`

Concretement, la page Checklist enfant affiche les checklists de demain.

## 4) Comment "demain" est calcule
La logique est timezone-aware:
- timezone famille via `getFamilyLocationForCurrentFamily()`,
- date du jour et date de demain via `buildTomorrowDateContext()`,
- cles de date au format `YYYY-MM-DD`.

## 5) Donnees chargees pour la page
### Checklist a preparer
Source principale:
- `checklist_instances`
- `checklist_instance_items`

Fonction:
- `getChecklistInstancesForChildAndDates(childId, [todayDateKey, tomorrowDateKey])`

### Moments cles de demain (bloc "Apercu/Moments cles")
La page construit les moments cles en combinant:
- taches planifiees (`task_instances`) pour demain,
- taches de templates (`template_tasks` via templates du bon weekday),
- categorie de tache (`task_categories`) pour deduire le type (mission/activite/loisir).

Ensuite:
- merge des moments (les planifiees ont priorite),
- tri,
- limitation aux 5 premiers pour affichage.

## 6) Rendu UI de la page
Dans `ChildTomorrowView`:
- Header: "DEMAIN" + sous-titre date/type de jour.
- Carte "Apercu de demain".
- Carte "Moments cles".
- Carte "A preparer" avec progression `items coches / total`.
- Bouton "C'est pret".

## 7) Interaction quand on coche une ligne
Action declenchee: `toggleChecklistInstanceItemAction({ itemId, isChecked })`

Comportement:
1. Verification online cote client (sinon erreur immediate).
2. Optimistic UI: la ligne est marquee localement.
3. Appel serveur.
4. Verifications serveur:
   - session valide,
   - role `child` ou `parent`,
   - meme famille,
   - si role child: item appartenant bien a cet enfant.
5. Update DB: `checklist_instance_items.is_checked`.
6. Revalidation des pages:
   - `/child/checklists`
   - `/child/my-day`
   - `/parent/checklists`
   - `/parent/school-diary`
7. `router.refresh()` pour sync final.

## 8) Bouton "C'est pret"
Important: actuellement ce bouton donne un feedback UI local (message + haptic), mais n ecrit pas d etat persistant en base.
Il sert de confirmation visuelle, pas de validation metier sauvegardee.

## 9) Badge checklist (compteur)
Endpoint:
- `GET /api/child/checklist-badge`

Logique:
- calcule le nombre d items non coches pour aujourd hui + demain,
- renvoie `{ count }`.

Fonction utilisee:
- `getUncheckedChecklistCountForCurrentChild()`

## 10) Supabase vs mode demo
Si Supabase est desactive:
- la page lit dans le store demo (`lib/demo/school-diary-store.ts`).

Si Supabase est actif:
- lecture/maj via tables Supabase.

Cas special child-pin:
- certaines lectures utilisent le client admin (`createSupabaseAdminClient`) quand la session est `child-pin` et que la service role key est disponible, pour eviter les blocages RLS sur la vue enfant.

## 11) Lien avec la page parent "Checklists"
La page parent (`/parent/checklists`) gere les modeles:
- creation/modification/suppression de modeles,
- gestion des items du modele,
- ordre des items.

Fichiers:
- `src/app/(parent)/parent/checklists/page.tsx`
- `src/features/school-diary/components/checklist-templates-manager.tsx`
- `src/lib/actions/checklists.ts`

Ces modeles servent ensuite a generer les checklists instances (notamment via les entrees de cahier de texte / school diary).

## 12) Points d extension utiles
Si tu veux aller plus loin:
- persister l action "C'est pret" en base,
- historiser la completion par jour,
- ajouter filtre Today/Tomorrow sur la page enfant,
- telemetry (temps de completion, taux de completion, etc.).

