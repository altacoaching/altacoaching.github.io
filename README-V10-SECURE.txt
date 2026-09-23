ALTA COACHING — V10 SECURE / GOOGLE REVIEWS
============================================

OBJECTIF
--------
Cette version remplace la V10 précédente et ajoute un garde-fou serveur anti-facturation.
NE PAS déployer l'ancienne V10 en parallèle.

PROTECTIONS
-----------
1. La clé Google reste uniquement dans le secret Cloudflare.
2. Les avis ne sont demandés par le navigateur que lorsque la section approche du viewport.
3. L'endpoint Cloudflare utilise D1 comme compteur global partagé entre tous les visiteurs/bots.
4. Plafond dur : 25 tentatives d'appel Google par jour.
5. Plafond dur supplémentaire : 750 tentatives d'appel Google par mois.
6. Les périodes jour/mois sont calculées en America/Los_Angeles pour suivre le cycle de facturation Google Maps.
7. FAIL CLOSED : si D1 est absent, mal configuré, en erreur ou saturé, l'endpoint NE CONTACTE PAS Google.
8. Une attaque peut donc rendre les avis temporairement indisponibles en consommant le plafond, mais elle ne peut pas faire contourner ce plafond via cet endpoint.
9. Aucun cache des contenus Google Places n'est ajouté.

IMPORTANT
---------
Le compteur est consommé AVANT l'appel Google. Un appel Google qui échoue consomme donc quand même une unité du budget local. C'est volontairement conservateur.

CONFIGURATION CLOUDFLARE OBLIGATOIRE
------------------------------------
A. Conserver les variables déjà créées :
- secret : GOOGLE_PLACES_API_KEY
- variable : GOOGLE_PLACE_ID

B. Créer une base D1, par exemple :
- alta-reviews-guard

C. Dans la console D1 de cette base, exécuter le contenu de :
- functions/api/google-reviews-schema.sql

D. Lier la base D1 au projet Pages :
- Workers & Pages > projet ALTA > Settings > Bindings > Add > D1 database
- Variable name : REVIEWS_GUARD
- Database : alta-reviews-guard
- ajouter le binding pour Production (et Preview si vous voulez tester les previews)

E. Redéployer le projet après création du binding.

COMPORTEMENT AU PLAFOND
-----------------------
À 25 appels dans une journée ou 750 dans le mois, /api/google-reviews répond 429 et n'appelle plus Google.
Le front bascule proprement vers le lien Google Maps au lieu d'afficher de faux avis.

FICHIERS
--------
- index.html
- css/reviews.css
- js/reviews.js
- functions/api/google-reviews.js
- functions/api/google-reviews-schema.sql

NOTE DE SÉCURITÉ
----------------
Le plafond est côté serveur. Il ne dépend ni du navigateur, ni d'un cookie, ni de localStorage.
D1 traite les écritures de façon sérialisée ; l'incrément et le contrôle du plafond sont réalisés dans une seule instruction SQL atomique.
