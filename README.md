# ALTA Coaching Premium V3.1

Site statique en HTML, CSS et JavaScript vanilla, prêt pour GitHub Pages.

## Aperçu local

Ouvrez `index.html` directement ou lancez un petit serveur statique. Aucune installation et aucun build ne sont nécessaires.

## Configuration

Le bloc `CONFIG` en tête de `js/script.js` centralise :

- l’e-mail et le téléphone ;
- l’identifiant Tally `eqWMpl` ;
- le lien Cal.com `maxime-alta-coaching-ghihbc/15min` ;
- l’activation éventuelle des événements analytics.

`trackEvent()` reste volontairement inactif tant qu’aucun outil n’est configuré.

## Tally et Cal.com

Le formulaire Tally utilise l’embed officiel avec hauteur dynamique et le popup officiel. Les cartes tarifaires transmettent la formule dans le champ caché `formule`.

Le calendrier utilise le snippet inline officiel Cal.com, le namespace `15min`, la vue mensuelle et la vue par créneaux sur petit écran.

## Images

- `logo-alta-transparent.png` : logo de navigation.
- `maxime-alta.webp` : portrait optimisé.
- `maxime-qualifications.webp` : visuel qualifications optimisé.
- `maxime-qualifications-original.jpg` : source du visuel.

## Pages SEO

Les pages `coaching-sportif-en-ligne`, `sport-sante`, `musculation`, `running`, `preparation-physique`, `a-propos` et `contact` possèdent du contenu distinct, leurs métadonnées et un maillage interne.

Les pages secondaires réutilisent le header, le menu mobile accessible et le footer premium de la homepage. Le détail des vérifications V3.1 se trouve dans `V3.1-VALIDATION.md`.

## Avant publication

Complétez et faites valider les pages `mentions-legales/` et `politique-confidentialite/`. Confirmez aussi la zone géographique si vous souhaitez créer une page locale.

## GitHub Pages

Dans GitHub : **Settings → Pages → Deploy from a branch → main → / (root)**. Tous les chemins du projet sont relatifs.
