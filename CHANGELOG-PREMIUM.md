# Changelog Premium V3

## V3.4 - Simplification et conversion

- Homepage ramenée à huit grandes sections : hero, suite du premier contact, services, formules, coach et qualifications, bilan Tally, réservation Cal.com, contact et FAQ.
- Parcours de conversion clarifié autour de deux actions principales : « Faire mon bilan » et « Prendre rendez-vous ».
- Offre recentrée sur trois services : musculation, running et préparation physique.
- Pages services condensées en sept sections utiles, avec un univers éditorial et visuel distinct pour chaque discipline.
- Page Contact simplifiée autour de quatre actions : bilan, rendez-vous, question écrite et email direct.
- Adresse officielle uniformisée : `maxime.altacoaching@gmail.com`.
- Liens officiels Facebook, Instagram et TikTok ajoutés à tous les pieds de page.
- Pied de page V3.4 appliqué à toutes les pages publiques, avec services, actions, contact, réseaux et informations légales.
- Champs cachés Tally `formule` et `source`, fallback robuste et intégration inline officielle conservés.
- Intégration Cal.com officielle conservée avec le namespace `15min`, la vue mensuelle, la vue mobile par créneaux et la transmission des paramètres.
- Responsive des modules Tally, Cal.com, services, contact et footer renforcé, avec respect de `prefers-reduced-motion`.
- Ajout de `V3.4-SIMPLIFICATION-CONVERSION.md` et création du livrable `alta-coaching-premium-v3.4.zip`.

## V3.2 - Direction artistique et UI/UX haute énergie

- Hero de la homepage transformé en composition éditoriale de campagne : typographie XXL, portrait intégré dans une structure asymétrique, grille, index et accents graphiques ALTA.
- Trois axes de coaching désormais mis en avant : musculation, running et préparation physique.
- Ancien quatrième axe et page associée retirés du site, des données structurées, de la navigation, du maillage et du sitemap.
- Suppression de toutes les coordonnées et références directes par appel ; le contact passe par Tally, Cal.com et l’e-mail.
- Système de mouvement harmonisé avec les variables `--motion-fast`, `--motion-normal`, `--motion-slow` et `--ease-premium`.
- Boutons, services, timeline et cartes de formules enrichis avec des états hover et focus visibles, sans animation provoquant de décalage de mise en page.
- Formule Essentielle renforcée avec badge, contraste, numéro éditorial et accent orange.
- Comparateur rapproché des cartes tarifaires et transformé en outil de décision, avec mise en avant de la colonne Essentielle et défilement horizontal mobile.
- Section Cal.com rendue plus compacte tout en conservant le snippet officiel, le namespace et sa configuration.
- Pages Musculation, Running et Préparation physique profondément retravaillées avec trois héros et trois rythmes visuels distincts.
- Footer enrichi d’une grande signature typographique ALTA et d’un CTA final.
- Responsive renforcé pour les petites largeurs et comportement `prefers-reduced-motion` étendu à toutes les nouvelles animations.
- Ajout de `UI-UX-V3.2.md` et création du livrable `alta-coaching-premium-v3.2.zip`.

## V3.1 - Finition avant publication

- Enrichissement éditorial des pages coaching en ligne, services, musculation, running, préparation physique et à propos, sans ajout de preuve ou donnée non fournie.
- Header complet, menu mobile accessible et footer premium ajoutés sur toutes les pages secondaires publiques.
- Skip-link, `main#contenu`, libellés de navigation et structure de titres uniformisés.
- Fallback Tally corrigé : popup officiel, puis questionnaire inline, puis URL publique selon le contexte.
- Champs cachés Tally `formule` et `source` conservés.
- Contraintes de hauteur Tally assouplies afin de laisser fonctionner `dynamicHeight`.
- Conteneur Cal.com renforcé sur mobile : hauteur dédiée, overflow horizontal bloqué et scroll vertical porté par un seul conteneur.
- Maillage interne enrichi entre services, coaching en ligne, à propos, contact et homepage.
- Métadonnées sociales et SEO revérifiées et différenciées sur chaque page.
- Ajout de `V3.1-VALIDATION.md` et création du livrable `alta-coaching-premium-v3.1.zip`.

## Fichiers modifiés

- `index.html` : reconstruction de la homepage et du parcours de conversion.
- `css/style.css` : refonte complète, lisible et structurée autour d’un design system.
- `js/script.js` : navigation, animations, Tally, Cal.com, tracking inactif, CTA mobile et tilt.
- `sitemap.xml`, `README.md` et documentation projet.

## Fichiers créés

- `assets/images/maxime-qualifications.webp` et original JPG.
- Pages : coaching sportif en ligne, pages de services, à propos et contact.
- `AUDIT-PREMIUM.md`, `BEFORE-AFTER.md`, `PREMIUM-SCORECARD.md` et `CHANGELOG-PREMIUM.md`.

## Design et conversion

- Hero éditorial avec portrait réel, bénéfices et CTA hiérarchisés.
- Narration problème → solution → méthode → offres → coach → preuves.
- Offre Essentielle valorisée sans dark pattern et tableau comparatif ajouté.
- Visuel qualifications central avec reveal, light sweep et tilt limité.

## Intégrations

- Tally officiel : `data-tally-src`, dynamic height, fond transparent, popup et paramètres de formule.
- Cal.com officiel : namespace `15min`, `month_view`, vue mobile et paramètres transmis.

## SEO, accessibilité et performance

- Sept pages éditoriales uniques avec métadonnées, canoniques, maillage et CTA.
- Sitemap actualisé ; JSON-LD fidèle aux informations visibles.
- Menu clavier avec Escape et boucle de focus, focus visible et reduced motion.
- Images dimensionnées et optimisées ; scripts tiers chargés avec le mécanisme officiel.

## Informations encore nécessaires

- Mentions légales et politique de confidentialité validées.
- Zone géographique et modalités exactes du présentiel.
- URL Instagram, si le réseau doit être affiché.
- Témoignages clients réels et autorisés, s’ils deviennent disponibles.
