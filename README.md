# ALTA Coaching

Site statique HTML/CSS/JavaScript compatible GitHub Pages. Aucune installation n’est nécessaire.

## Configuration

Modifiez seulement le bloc `CONFIG` au début de `js/script.js` :

- `email` et `phone` pour les liens directs ;
- `tallyUrl` et `tallyFormId` pour le questionnaire ;
- `calUrl` pour le calendrier de réservation ;
- `instagramUrl` pour afficher le lien Instagram ;
- `analyticsEnabled` pour activer ultérieurement l’écoute des événements `alta:track`.

Les CTA de formules ouvrent Tally avec un champ caché `formule` quand le widget officiel est disponible. Le formulaire intégré reste accessible dans la page.

## Images

- `assets/images/logo-alta-transparent.png` : logo en transparence.
- `assets/images/maxime-alta.webp` : portrait optimisé pour le web.

## SEO et fichiers à compléter

`robots.txt`, `sitemap.xml`, les métadonnées et les données structurées sont présents. Avant publication définitive, complétez les pages `mentions-legales/` et `politique-confidentialite/` avec les informations validées.

## GitHub Pages

Dans GitHub, ouvrez **Settings** → **Pages**, choisissez **Deploy from a branch**, puis `main` et `/ (root)`. Les chemins sont relatifs afin de fonctionner sur GitHub Pages.
