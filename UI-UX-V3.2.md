# ALTA Coaching — Direction artistique UI/UX V3.2

## Direction artistique

La V3.2 conserve l’identité ALTA — bleu dominant, orange d’accent, blanc, blanc cassé et anthracite — et la fait évoluer vers une écriture de campagne sportive contemporaine.

Le système repose sur :

- une typographie condensée en très grand format pour les messages structurants ;
- des compositions asymétriques et des décalages contrôlés ;
- une grille technique discrète, des index et des lignes graphiques produits en CSS ;
- des surfaces franches et une alternance de sections blanches, bleues, noires et blanc cassé ;
- le portrait réel de Maxime intégré à la composition plutôt que présenté comme une simple vignette ;
- des accents visuels cohérents avec la vitesse, la force et la précision.

Aucun élément de marque, slogan, visuel ou composition propriétaire d’une marque tierce n’a été repris.

## Homepage

### Hero

Le hero devient la pièce centrale du site : titre XXL en trois temps, cartouche orange, index de campagne, grille, numéro en contour, cercle de mouvement et portrait intégré dans un cadre oblique. La proposition de valeur et les deux parcours de conversion restent inchangés : bilan Tally et réservation Cal.com.

### Services

Les trois axes Musculation, Running et Préparation physique sont désormais des zones entièrement interactives. Les états `hover` et `focus-visible` activent le fond, le titre et la flèche sans déplacement des sections voisines.

### Méthode

La timeline Échanger, Évaluer, Construire, Ajuster utilise des états de focus clavier et de survol cohérents : élévation légère, accent orange et activation de la bordure.

### Formules et comparateur

- Les cartes utilisent uniquement `transform` et les propriétés visuelles pour leurs animations.
- Essentielle conserve le badge « LE PLUS ÉQUILIBRÉ » et reçoit un contraste, un numéro éditorial et un accent orange renforcés.
- Le comparateur est rapproché des cartes afin de constituer un seul bloc de décision.
- La colonne Essentielle est mise en avant sans masquer les autres offres.
- Le tableau reste défilable horizontalement sur petit écran.

### Qualifications et footer

Le visuel des qualifications conserve son reveal, son halo, son balayage lumineux et son tilt limité. Le footer adopte une grande signature ALTA, un fond anthracite, des accents de marque, un CTA final et une navigation complète.

## Système de mouvement

Variables communes :

```css
--motion-fast: 180ms;
--motion-normal: 280ms;
--motion-slow: 700ms;
--ease-premium: cubic-bezier(.2, .7, .2, 1);
```

Les boutons utilisent un lift de 3 px maximum, une échelle limitée à `1.01`, une évolution de couleur, une ombre légère et une translation de flèche. Les cartes tarifaires restent sous `1.015`. Les animations longues ou décoratives sont neutralisées avec `prefers-reduced-motion`.

## Pages services

### Musculation

La page adopte une composition dense et structurée : hero de force, repères techniques, bloc d’erreurs fréquentes, progression linéaire, bénéfices, formules, qualifications et CTA final. Le discours insiste sur la technique, le dosage, la progression et l’autonomie.

### Running

La page utilise des trajectoires courbes, un cadre oblique et un rythme volontairement plus mobile. Son contenu est organisé autour du point de départ, de la continuité, de la répartition de la charge et de l’articulation entre course et renforcement.

### Préparation physique

La page utilise un hero bleu à grille technique, une géométrie plus précise et une progression analytique. Elle distingue exigences, qualités physiques, hiérarchisation et transfert vers la pratique principale.

Les trois pages conservent le même design system, mais n’utilisent ni le même hero, ni le même rythme, ni le même ordre de sections.

## Cal.com

L’intégration officielle, le namespace `15min`, `month_view`, `useSlotsViewOnSmallScreen` et `forwardQueryParams` sont conservés.

La section est passée en composition éditoriale à deux colonnes sur ordinateur. La hauteur cible du conteneur est de 580 px sur écran large, 620 px sur tablette et 600 px sur petit écran. Le défilement horizontal est bloqué et le défilement vertical reste disponible si le widget en a besoin.

## Tally

Le popup, le formulaire inline, les champs cachés `formule` et `source`, les événements et le fallback robuste sont conservés. Le formulaire inline n’a ni hauteur fixe CSS ni grande hauteur minimale pouvant neutraliser `dynamicHeight`.

## Rationalisation de l’offre et du contact

L’ancien quatrième axe, sa page, son URL de sitemap, ses liens internes et ses références structurées ont été retirés. Les coordonnées d’appel et schémas d’URI correspondants ont également été supprimés. Le contact public repose sur Tally, Cal.com et l’e-mail.

## Responsive

Des règles spécifiques couvrent les ruptures principales autour de 1024, 820 et 520 px. Les compositions passent d’une grille de campagne à un montage vertical adapté ; les métriques deviennent des lignes, les progressions passent de quatre à deux puis une colonne et les CTA restent utilisables sans débordement horizontal.

Les largeurs 320, 375, 390, 430 et 768 px sont couvertes statiquement par ces règles fluides et les media queries. L’inspection navigateur multi-largeurs n’a pas pu être exécutée dans l’environnement de travail, car l’aperçu local n’a pas pu être établi. Aucun test visuel n’est donc revendiqué.

## Vérifications réalisées

- syntaxe JavaScript validée ;
- équilibre des blocs CSS validé ;
- neuf pages HTML publiques analysées ;
- un H1 unique par page ;
- aucun identifiant dupliqué ;
- aucun lien ou chemin de ressource interne cassé ;
- aucun attribut `href` ou `src` vide ;
- textes alternatifs présents ;
- navigation et zone principale accessibles ;
- sitemap XML valide et aligné sur les neuf pages publiques ;
- robots.txt autorise l’exploration et référence le sitemap ;
- archive contrôlée après création.

## Informations restant à fournir

Les TODO juridiques existants sont conservés. Avant publication définitive, il reste à fournir et valider l’identité juridique de l’éditeur, l’adresse, le numéro d’immatriculation applicable, le responsable de publication, les coordonnées légales de l’hébergeur, les finalités et bases légales des traitements ainsi que les durées de conservation réellement appliquées.
