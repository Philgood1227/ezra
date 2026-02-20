# Navigation Map Devices

## Objectif

Definir une architecture de navigation premium, coherente entre smartphone, tablette et desktop, avec priorite usage reel:

1. Enfant: tablette/smartphone.
2. Parent: desktop/laptop, puis smartphone.

## Espace Enfant

## Tablette Et Smartphone (cible principale)

### Barre principale (5 items max)

1. Accueil
2. Ma journee
3. Check-lists
4. Decouvertes
5. Plus

### Menu "Plus"

1. Succes
2. Cinema
3. Emotions

Raison: limiter la surcharge et garder les actions quotidiennes dans la barre principale.

## Desktop enfant (support)

1. Meme architecture.
2. Barre horizontale ou verticale compacte.
3. Pas de nouvelles sections.

## Espace Parent

## Desktop/Laptop (cible principale)

### Sidebar par groupes

1. Pilotage
   - Tableau de bord
   - Notifications
   - Alarmes
2. Organisation
   - Journees types
   - Categories de taches
   - Carnet scolaire
   - Modeles de check-lists
3. Progression
   - Succes / badges
   - Recompenses
   - Gamification
4. Vie familiale
   - Repas
   - Cinema familial
   - Base de connaissances
5. Configuration
   - Reglages

### Regles Desktop

1. Groupe actif visuellement marque.
2. Sous-menu ouvert uniquement pour le groupe actif.
3. Header page avec titre + CTA principal.

## Tablette parent

1. Sidebar repliable (icones + labels courts).
2. CTA principal reste visible dans header contenu.
3. Navigation secondaire en drawer.

## Smartphone parent

1. Header avec bouton "Menu".
2. Menu en panneau plein ecran avec groupes.
3. Action flottante optionnelle sur certaines pages de creation.

## Navigation De Contexte

## Fil d'Ariane (parent)

1. Affiche sur pages profondeur > 1:
   - connaissance detail
   - template detail
2. Format:
   - Parent / Module / Detail

## Retour contextualise (enfant)

1. Bouton retour visuel stable en haut a gauche.
2. Labels explicites:
   - "Retour aux categories"
   - "Retour a ma journee"

## Raccourcis Prioritaires

## Enfant

1. Depuis Accueil vers prochaine tache.
2. Depuis Ma journee vers fiche d'aide associee.
3. Depuis Check-lists vers tache liee (si utile).

## Parent

1. Dashboard -> module en anomalie.
2. School diary -> checklist liee.
3. Meals -> recettes/ingredients.

## Regles D'affichage Responsive

1. Ne jamais changer les noms des sections selon device.
2. Ne jamais deplacer l'action primaire hors zone visible initiale.
3. Garder 1 niveau de profondeur visible a l'ecran.
4. Eviter menus imbriques profonds.

## Etats De Navigation

1. Active: fort contraste + fond.
2. Hover/Focus: style dedie.
3. Disabled: rare, avec raison explicite.

## Checklist D'acceptation Phase 1

1. Chaque route actuelle est mappee a un groupe clair.
2. Enfant: max 5 items principaux.
3. Parent: menus regroupes par intention, pas par historique technique.
4. Smartphone et tablette couverts sans nouvelle logique metier.

