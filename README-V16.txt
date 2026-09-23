ALTA V16 — Correctif carrousel mobile

- Corrige le comportement iOS où la première carte pouvait rester surélevée après un swipe.
- Le style :hover des cartes est désormais limité aux périphériques avec pointeur fin (souris/trackpad).
- Sur mobile tactile, seule la classe .is-active surélève la carte centrée ; l’ancienne carte redescend dès que l’active change.
- Aucun changement du design validé : fond blanc, liseré orange, pas de carte orange, pas de dégradé sombre.
- Cache-busting passé en v8.
