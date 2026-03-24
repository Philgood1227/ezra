# Page Fiches (Parent v2)

## 1. Perimetre

Ce document decrit la page `Fiches` du dashboard parent v2 telle qu'elle est implementee actuellement.

Objectif de la page:

- naviguer par matiere puis famille de template,
- creer et editer une fiche pedagogique,
- structurer l'edition par etapes,
- previsualiser la fiche en plein ecran.

## 2. Route et points d'entree

- Route: `/parent-v2/fiches`
- Fichier de page: `src/app/(parent-v2)/parent-v2/fiches/page.tsx`
- Composant principal: `ParentFichesManager`
  - `src/features/fiches/components/parent-fiches-manager.tsx`

Composants techniques relies:

- Editeur rich text: `src/components/ds/rich-text-editor.tsx`
- Modal (avec mode fullscreen): `src/components/ds/modal.tsx`
- Modele/metadonnees des fiches: `src/features/fiches/types.ts`

## 3. Architecture fonctionnelle

La page est organisee en 2 colonnes:

- Colonne gauche (navigation):
  - choix matiere,
  - liste familles de templates,
  - liste des fiches de la famille,
  - bouton `+ Nouvelle fiche`.
- Colonne droite (edition):
  - header de fiche (breadcrumb, previsualiser, enregistrer),
  - champs de base (titre, matiere badge, famille select),
  - stepper vertical,
  - zone de contenu de l'etape active,
  - navigation etapes precedente/suivante.

## 4. Modele de donnees

Type central: `FicheRecord`.

Champs principaux:

- `id`
- `matiere`: `Francais` ou `Mathematiques`
- `famille_template`
- `titre_fiche`
- `objectif` (HTML rich text)
- `blocs` (liste de blocs rich text)
- `trucs_astuces`
  - `miniChecklistHtml`
  - `astuceMemoHtml`
  - `erreursFrequentes[]` (objets `erreur`/`fix`)
- `visuels[]`
  - meta du fichier + `previewUrl`
- `statut`: `brouillon` ou `publie`
- `updatedAt`

Definitions families/matieres:

- `FICHE_FAMILLE_DEFINITIONS` dans `types.ts`
- filtrage par matiere via `getFamiliesByMatiere()`.

## 5. Persistance et cycle de vie

### 5.1 Persistance locale

- Stockage local: `localStorage`
- Cle: `ezra-parent-fiches-v1`
- Chargement au montage (hydration client).
- Ecriture automatique a chaque modification de `fiches`.

### 5.2 Initialisation

Au chargement:

- la liste est lue depuis le stockage local,
- si au moins une fiche existe:
  - la premiere fiche est selectionnee,
  - la matiere/famille actives sont alignees,
- sinon, aucun item actif.

## 6. Navigation gauche: interactions

### 6.1 Changement de matiere

Action:

- clic sur onglet `Francais` ou `Mathematiques`.

Effets:

- `matiereActive` change,
- `familleActive` bascule sur la premiere famille disponible de cette matiere,
- etape active reset sur `infos`.

### 6.2 Changement de famille

Action:

- clic sur une famille.

Effets:

- `familleActive` change,
- la liste des fiches est filtree par `(matiereActive + familleActive)`,
- etape active reset sur `infos`.

### 6.3 Selection d'une fiche

Action:

- clic sur une ligne de fiche.

Effets:

- `activeFicheId` change,
- etape active reset sur `infos`.

### 6.4 Creation d'une fiche

Action:

- clic `+ Nouvelle fiche`.

Effets:

- creation d'une fiche vide via `createDefaultFiche(matiereActive, familleActive)`,
- selection immediate de la nouvelle fiche,
- etape active `infos`,
- etat non enregistre (`hasUnsavedChanges = true`).

## 7. Header d'edition: interactions

### 7.1 Bouton Previsualiser la fiche

Action:

- clic sur `Previsualiser la fiche`.

Effets:

- ouvre une modal en mode fullscreen,
- rendu lecture seule de la fiche active.

### 7.2 Bouton Enregistrer

Action:

- clic sur `Enregistrer`.

Regles de validation:

- `titre_fiche` obligatoire,
- `objectif` obligatoire (HTML non vide apres nettoyage),
- au moins un bloc de contenu principal non vide parmi:
  - `definition_simple`
  - `regle_vue_ensemble`
  - `reconnaitre_utiliser`

Effets en succes:

- `updatedAt` mis a jour,
- `statut` force a `brouillon`,
- `hasUnsavedChanges = false`,
- feedback succes: `Fiche enregistree.`

Effets en erreur:

- feedback erreur affiche,
- repositionnement automatique sur l'etape concernee.

### 7.3 Champs de base

- Titre (`Input`): edition directe.
- Matiere: badge lecture seule.
- Famille (`Select`):
  - change `famille_template`,
  - remappe les blocs via `remapBlocksForFamille()` pour conserver ce qui est commun et regenerer les blocs attendus par la nouvelle famille.

## 8. Stepper et contenu par etape

Etapes actuelles (fixes):

1. `infos`
2. `objectif`
3. `contenu`
4. `exemples`
5. `astuces`
6. `visuels`

Navigation:

- clic direct sur une etape dans la colonne stepper,
- boutons `Etape precedente` / `Etape suivante`.

### 8.1 Etape infos

- resume rapide,
- meta (`updatedAt`, `statut`),
- actions:
  - `Dupliquer la fiche`
  - `Supprimer la fiche` (avec `window.confirm`).

### 8.2 Etape objectif

- un editeur rich text pour `objectif`.

### 8.3 Etape contenu

- edite uniquement ces blocs:
  - `definition_simple`
  - `regle_vue_ensemble`
  - `reconnaitre_utiliser`

### 8.4 Etape exemples

- edite:
  - `exemples`
  - `mini_exercice`

### 8.5 Etape astuces

- bloc `a_retenir` (rich text),
- `miniChecklistHtml` (rich text),
- `astuceMemoHtml` (rich text),
- liste `erreursFrequentes`:
  - ajout d'une ligne,
  - edition `erreur` + `fix`,
  - suppression d'une ligne,
  - garde-fou: la derniere ligne ne peut pas etre retiree (minimum 1).

### 8.6 Etape visuels

- bouton `+ Ajouter un visuel`,
- par visuel:
  - `title`,
  - `visualForLabel` (note/legende),
  - `instruction`,
  - upload fichier image,
  - suppression du visuel,
  - apercu image si `previewUrl` present.

## 9. Upload visuels

Contraintes:

- taille max: `5 MB` (`MAX_VISUAL_FILE_BYTES`),
- formats acceptes (input): `PNG`, `JPG/JPEG`, `SVG`.

Comportement:

- lecture locale du fichier via `FileReader` en Data URL,
- stockage dans la fiche (`fileName`, `mimeType`, `sizeBytes`, `previewUrl`),
- message d'erreur si depassement de taille.

## 10. Editeur rich text: toolbar et interactions

Toolbar visuelle actuelle:

- `B` (gras)
- `I` (italique)
- `U` (souligne) si active
- `�` liste a puces
- `1.` liste numerotee
- `"` citation/callout si active
- Exergues couleurs (3 boutons carres)
- `URL` (lien)
- Tags pedagogiques (si actives): `S`, `V`, `C`, `GN`, `GV`, `GP`, `GA`

Comportements:

- actions en toggle,
- bouton lien via `window.prompt`:
  - URL vide => suppression lien,
- tags pedagogiques:
  - clic sur tag actif => retire le style,
  - clic sur un autre tag => remplace/applique ce tag.

Sortie HTML:

- mark pedagogique rendu en `span[data-pedagogical-tag="..."]` avec classe CSS `pedagogical-tag-*`.

## 11. Previsualisation fullscreen

Ouverture:

- bouton `Previsualiser la fiche`.

Fermeture:

- clic fond (overlay),
- bouton `x`,
- touche `Escape`.

Rendu affiche:

- header fiche (matiere, famille, titre),
- objectif si non vide,
- blocs de contenu non vides,
- section `Trucs & astuces` si contenu non vide,
- visuels si presents.

Mode:

- lecture seule, sans edition.

## 12. Regles de mapping matiere/famille/template

### 12.1 Mapping present

- Familles conditionnees par matiere (`getFamiliesByMatiere`).
- Blocs templates conditionnes par famille (`getBlockTemplatesForFamille`).
- Remap des blocs lors du changement de famille (`remapBlocksForFamille`).

### 12.2 Limite actuelle

Les etapes d'edition sont fixes et ne changent pas selon matiere/famille.
Les blocs optionnels de famille (`schema_phrase`, `tableau_numeration`, `repere_geometrique`, `demarche_resolution`) existent dans le modele mais ne sont pas encore tous exposes dans une etape dediee de l'UI actuelle.

## 13. Etats UI et feedback

- `hasUnsavedChanges` pilote le libelle du bouton (`Enregistrer` / `Enregistre`).
- `feedback` affiche messages succes/erreur en haut de la zone edition.

## 14. Checklist QA rapide

- Changer matiere => familles filtrees correctement.
- Changer famille => liste fiches filtree et fiche active stable.
- `+ Nouvelle fiche` pre-remplit matiere+famille actives.
- Validation sauvegarde bloque si titre/objectif/contenu principal absents.
- Toolbar rich text applique bien les styles au texte selectionne.
- Upload > 5 MB refuse avec message.
- Preview fullscreen s'ouvre/se ferme (overlay, X, Escape).
- Donnees persistantes apres refresh (localStorage).
