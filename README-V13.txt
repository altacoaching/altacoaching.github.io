ALTA V13 — CARROUSEL AVIS GOOGLE / DIRECTION ARTISTIQUE
=======================================================

Cette version traduit le mockup validé dans le site réel.

CHANGEMENTS VISUELS
- Titre : « ILS PARLENT DE LEUR EXPERIENCE ».
- Titre à l'échelle des grands titres éditoriaux du site, avec EXPERIENCE en orange ALTA.
- Note moyenne beaucoup plus présente : grand 5,0 bleu + étoiles orange agrandies.
- Cartes blanches avec relief nettement renforcé (ombres multi-niveaux + ombre portée sous la carte).
- Survol desktop : la carte monte et gagne en profondeur.
- Swipe mobile : la carte centrée se soulève automatiquement, les voisines restent plus basses.
- Flèches latérales façon carrousel Reels sur desktop.
- Pagination par points, avec point actif orange.
- Grande ponctuation décorative en arrière-plan, très légère, dans l'esprit du mockup.
- Aucun trait de séparation entre Méthode / Avis / Domaines de coaching.
- Transition verticale resserrée vers « Domaines de coaching ».
- Fond intégré à la page avec un halo orange très discret derrière les avis.

FONCTIONNEL
- Chargement dynamique des avis Google conservé.
- Liens auteur / avis / signalement conservés.
- D1 REVIEWS_GUARD et limites 25 appels/jour + 750/mois inchangés.
- Health check inchangé.
- API key jamais exposée côté client.

FICHIERS À MERGER
- index.html
- css/reviews.css
- js/reviews.js
- functions/api/google-reviews.js
- functions/api/google-reviews-schema.sql

CACHE BUST
- reviews.css?v=5
- reviews.js?v=5
- /api/google-reviews?v=5
