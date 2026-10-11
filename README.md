# Blazing Planner

Planificateur non officiel pour **Naruto Blazing Revival** : collection, composition d'équipes, objectifs d'éveil et suivi des ressources farmées. Tout tourne dans le navigateur, sans compte ni serveur.

*Unofficial planner for **Naruto Blazing Revival**: collection, team building, awakening goals and farmed resources. Runs entirely in the browser — no account, no server. The interface is available in French and English.*

## Fonctionnalités

- **Collection** : les ninjas possédés avec étoiles, niveau, limit break, niveaux de ninjutsu et de technique secrète, favoris et notes.
- **Équipes** : 4 positions avec un principal et un soutien chacune, répartition des éléments et alerte quand aucun ninja n'est fort contre un élément.
- **Objectifs** : choisis l'étoile visée, le coût d'éveil est calculé depuis la base. Une liste agrégée indique ce qu'il reste à farmer. Valider un éveil met à jour le ninja et retire les matériaux de l'inventaire.
- **Calendrier** : les vagues de sortie du revival, passées et annoncées, avec leurs bannières. Les ninjas pas encore sortis sont grisés mais restent planifiables (statut « Prévu »).
- **Inventaire** : quantités par ressource, avec ce que tes objectifs réclament.
- **Données** : sauvegarde et restauration en JSON (pour changer d'appareil ou partager avec un ami), édition de la base de ninjas et de ressources, import CSV/JSON.

## Données de jeu

L'app suit **uniquement le roster du revival** : les ninjas déjà sortis et ceux annoncés, avec leurs vraies dates de sortie.

| Fichier | Contenu |
| --- | --- |
| `src/data/ninjas.json` | Les ninjas du revival : élément, étoiles, matériaux par étape d'éveil, limit break, niveau max, date de sortie sur le revival, bannières |
| `src/data/resources.json` | Les matériaux d'éveil (et les monnaies) |
| `src/data/revival.json` | Les vagues de sortie du revival et les crédits des sources |
| `src/data/image-urls.json` | Adresse des cartes sur le CDN du wiki Fandom |
| `src/data/game.json` | Cycle des éléments, limites |

### Mettre à jour après une nouvelle vague

```bash
npm run data:fetch   # télécharge le roster depuis GachaWiki
npm run data:build   # le convertit pour l'app et résout les nouvelles images
```

Puis commit de `src/data/`. Chaque joueur peut aussi ajouter du contenu inédit depuis l'onglet **Données**.

### Sources et licences

- **Roster et vagues de sortie du revival :** [GachaWiki](https://gachawiki.net/naruto-blazing).
- **Données de jeu :** [wiki Fandom Naruto Blazing](https://naruto-blazing.fandom.com), sous licence [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Les fichiers de `src/data/` en sont dérivés et restent sous cette licence.
- **Icônes :** chargées depuis le CDN du wiki Fandom au moment de l'affichage ; aucun visuel du jeu n'est stocké dans ce dépôt.

## Développement

Stack : [Svelte 5](https://svelte.dev) + TypeScript + [Vite](https://vite.dev), tests avec [Vitest](https://vitest.dev). Node 20 ou plus.

```bash
npm install
npm run dev      # serveur local
npm test         # tests unitaires (logique de planification, imports)
npm run check    # vérification des types
npm run build    # build de production dans dist/
```

Structure :

```
src/
  lib/planning.ts       logique pure : coûts d'éveil, liste de farm, analyse d'équipe
  lib/importers.ts      parsing CSV/JSON et validation des sauvegardes
  lib/store.svelte.ts   état du joueur + persistance localStorage (synchro entre onglets)
  lib/i18n.svelte.ts    traductions FR/EN
  views/                un fichier par onglet
  components/           éléments réutilisables (sélecteur de ninja, étoiles, modale…)
scripts/                import du roster (GachaWiki) et des adresses d'images (Fandom)
```

### Déploiement

Le workflow `.github/workflows/deploy.yml` vérifie, teste et publie sur GitHub Pages à chaque push sur `main`. Dans les réglages du repo : **Settings → Pages → Source : GitHub Actions**. Le site est publié sur https://taurinese.github.io/blazing-planner/.

### Sauvegarde

Les données sont dans le `localStorage` du navigateur (clé `nbr-planner:v1`). Vider les données du site les efface : exporte une sauvegarde de temps en temps. Le champ `version` de la sauvegarde permet de migrer les anciennes données si le format évolue (`migrate()` dans `store.svelte.ts`).

## Licence

Code sous licence [MIT](LICENSE). Projet de fan non officiel, sans lien avec Bandai Namco, Shueisha ou Masashi Kishimoto. Les données de jeu de `src/data/` sont sous CC BY-SA 3.0 (voir [Sources et licences](#sources-et-licences)).
