# Blazing Planner

Planificateur non officiel pour **Naruto Blazing Revival** : collection, composition d'équipes, objectifs d'éveil et suivi des ressources farmées. Tout tourne dans le navigateur, sans compte ni serveur.

*Unofficial planner for **Naruto Blazing Revival**: collection, team building, awakening goals and farmed resources. Runs entirely in the browser — no account, no server. The interface is available in French and English.*

## Fonctionnalités

- **Collection** : les ninjas possédés avec étoiles, niveau, limit break, niveaux de ninjutsu et de technique secrète, favoris et notes.
- **Équipes** : 4 positions avec un principal et un soutien chacune, répartition des éléments et alerte quand aucun ninja n'est fort contre un élément.
- **Objectifs** : choisis l'étoile visée, le coût d'éveil est calculé depuis la base. Une liste agrégée indique ce qu'il reste à farmer. Valider un éveil met à jour le ninja et retire les matériaux de l'inventaire.
- **Inventaire** : quantités par ressource, avec ce que tes objectifs réclament.
- **Données** : sauvegarde et restauration en JSON (pour changer d'appareil ou partager avec un ami), édition de la base de ninjas et de ressources, import CSV/JSON.

## Données de jeu

La base livrée dans `src/data/` est volontairement petite : 8 ninjas d'exemple et des ressources génériques marqués *non vérifiés*, en attendant des données fiables pour le revival.

| Fichier | Contenu |
| --- | --- |
| `src/data/ninjas.json` | Les ninjas (`name`, `title`, `element`, `minStars`, `maxStars`, `awakening` ou `awakeningTemplate`) |
| `src/data/resources.json` | Les ressources (monnaies, rouleaux d'éveil…) |
| `src/data/game.json` | Cycle des éléments, limites, modèles d'éveil partagés |

Chaque joueur peut compléter ou corriger la base depuis l'onglet **Données** ; ses modifications sont stockées avec sa sauvegarde. Pour intégrer des corrections à la base commune : **Exporter la base (JSON)** puis remplacer `src/data/ninjas.json`.

### Import depuis le wiki

Le wiki Fandom de l'ancien jeu expose l'API MediaWiki publique. Le script `scripts/import-wiki.mjs` l'interroge (requêtes séquentielles et espacées) :

```bash
node scripts/import-wiki.mjs discover                    # repère les catégories et la structure d'une fiche
node scripts/import-wiki.mjs fetch "Category:Ninja"      # récupère toutes les fiches → scripts/wiki-out/raw.json
```

La conversion de `raw.json` vers `ninjas.json` dépend des champs d'infobox du wiki et sera ajoutée une fois ceux-ci connus.

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
scripts/                import depuis le wiki
```

### Déploiement

Le workflow `.github/workflows/deploy.yml` vérifie, teste et publie sur GitHub Pages à chaque push sur `main`. Dans les réglages du repo : **Settings → Pages → Source : GitHub Actions**. Pense à mettre l'adresse du repo dans `src/lib/config.ts`.

### Sauvegarde

Les données sont dans le `localStorage` du navigateur (clé `nbr-planner:v1`). Vider les données du site les efface : exporte une sauvegarde de temps en temps. Le champ `version` de la sauvegarde permet de migrer les anciennes données si le format évolue (`migrate()` dans `store.svelte.ts`).

## Contributions

Le code est public par transparence ; les pull requests ne sont pas acceptées (voir [CONTRIBUTING.md](CONTRIBUTING.md)). Les issues pour signaler un bug ou une donnée fausse sont les bienvenues.

## Licence

Code sous licence [MIT](LICENSE). Projet de fan non officiel, sans lien avec Bandai Namco, Shueisha ou Masashi Kishimoto. Aucun visuel du jeu n'est inclus.
