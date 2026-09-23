ALTA V11 — Google Reviews transition carousel + diagnostics
Date: 23/09/2026

OBJECTIF
- Transformer les avis Google en bande de transition compacte, pas en grande section.
- Garder un carrousel horizontal (3 cartes desktop, 2 tablette, 1 + aperçu mobile).
- Conserver le cost guard D1 : 25 tentatives Google/jour, 750/mois, fail closed.
- Faciliter le diagnostic sans exposer la clé API et sans consommer un appel Google.

FICHIERS MODIFIÉS
- index.html
- css/reviews.css
- js/reviews.js
- functions/api/google-reviews.js

D1
La base et la table déjà créées restent valides. Ne pas recréer la base.
Binding Production attendu : REVIEWS_GUARD -> alta-reviews-guard

PLACE ID
Le code possède désormais un fallback public vers le Place ID ALTA Coaching :
ChIJl71pI8UkAGARNqUt91qW4jc
La variable GOOGLE_PLACE_ID reste acceptée si elle existe.

SECRET API
Le serveur accepte :
- GOOGLE_PLACES_API_KEY (recommandé)
- GOOGLE_MAPS_API_KEY
- GOOGLE_API_KEY
Ne jamais mettre la valeur de la clé dans GitHub.

HEALTH CHECK SANS APPEL GOOGLE
Après déploiement, ouvrir :
/api/google-reviews?health=1
Résultat attendu :
{"status":"ready","apiKeyConfigured":true,"placeIdConfigured":true,"guardConfigured":true}
Ce health check ne contacte pas Google et ne consomme pas le compteur D1.

APPEL RÉEL
La page effectue au maximum un appel à /api/google-reviews par chargement de page, uniquement quand la zone approche du viewport.
L'endpoint serveur consomme d'abord le budget D1 puis contacte Google si le budget l'autorise.
Aucun cache de contenu Places n'est ajouté.

DESIGN
- bande claire compacte entre Méthode et Domaines de coaching
- titre réduit
- note Google sur une seule ligne
- cartes d'avis ~190 px de haut
- carrousel horizontal + flèches desktop/tablette + swipe mobile
- état d'erreur réduit à une petite transition, sans grand bloc vide

IMPORTANT
Cloudflare demande un nouveau déploiement après modification d'un binding D1. La V11 déclenche ce nouveau déploiement si elle est mergée après la création du binding.
