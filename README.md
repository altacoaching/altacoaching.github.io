# ALTA Coaching

Landing page statique, responsive et compatible GitHub Pages. Aucune installation n’est nécessaire : ouvrez `index.html` dans un navigateur.

## Modifier les informations générales

Ouvrez `js/script.js`. La zone placée au début du fichier concentre les informations à personnaliser :

```js
const CONFIG = {
  email: "contact@votredomaine.fr",
  tallyUrl: "https://tally.so/r/xxxxxx",
  calUrl: "https://cal.com/votre-compte/consultation",
  instagramUrl: "https://instagram.com/votrecompte"
};
```

## Ajouter Tally

Renseignez `tallyUrl` avec l’URL publique du formulaire. Tant que la valeur est vide, le site affiche un encart de remplacement et aucun iframe cassé.

## Ajouter Cal.com

Renseignez `calUrl` avec l’URL publique de votre agenda. Tant que la valeur est vide, le site affiche un encart de remplacement et invite à écrire.

## Ajouter l’e-mail

Renseignez `email`. Le formulaire n’utilise pas de serveur : il ouvre l’application e-mail du visiteur avec les informations saisies. Tant que l’adresse est `VOTRE_EMAIL`, il explique comment l’activer.

## Instagram

Renseignez `instagramUrl`. Le lien est masqué tant qu’aucune URL valide n’est définie.

## Changer les couleurs

Les couleurs principales sont dans `css/style.css`, dans le bloc `:root` : `--alta-blue` et `--alta-orange`.

## Changer les textes et les tarifs

Tout le contenu se trouve dans `index.html`. Les tarifs sont regroupés dans la section portant l’identifiant `formules`. Les témoignages sont marqués comme contenu de démonstration à remplacer. Pour ajouter une question, dupliquez simplement un bloc `<details>` dans la section FAQ.

## Ajouter les photos

Déposez vos fichiers dans `assets/images/`, avec un nom simple (par exemple `maxime-coaching.jpg`), puis modifiez l’attribut `src` de l’image concernée dans `index.html`. Deux visuels de marque sont déjà présents : `logo-alta.png` et `guide-formules.jpg`.

## GitHub Pages

1. Créez ou ouvrez le repository GitHub.
2. Ajoutez tous les fichiers et dossiers du projet, puis faites un commit sur `main`.
3. Ouvrez **Settings** → **Pages**.
4. Sous **Build and deployment**, choisissez **Deploy from a branch**.
5. Sélectionnez la branche `main` et le dossier `/ (root)`.
6. Enregistrez et attendez le déploiement.

Les chemins des ressources sont relatifs (`./css/style.css`, `./assets/images/...`) : c’est important pour que le site fonctionne correctement sur GitHub Pages, y compris lorsqu’il est publié dans un sous-dossier.
