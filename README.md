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

Les données viennent du [wiki Fandom du jeu original](https://naruto-blazing.fandom.com). Le revival reprend les mêmes données et ressort les ninjas dans l'ordre du calendrier d'origine ; chaque fiche garde donc sa date de sortie globale (`globalDate`). Le contenu inédit du revival s'ajoute depuis l'onglet **Données**.

| Fichier | Contenu |
| --- | --- |
| `src/data/ninjas.json` | Les ninjas : élément, étoiles min/max, matériaux par étape d’éveil, éveil Blazing, limit break, niveau max, date de sortie |
| `src/data/resources.json` | Les ressources : monnaies et cartes matériaux (éveil, éveil Blazing, limit break, amélioration) |
| `src/data/game.json` | Cycle des éléments, limites, modèles d'éveil partagés (optionnels) |

Chaque joueur peut compléter ou corriger la base depuis l'onglet **Données** ; ses modifications sont stockées avec sa sauvegarde. Pour intégrer des corrections à la base commune : **Exporter la base (JSON)** puis remplacer `src/data/ninjas.json`.

### Import depuis le wiki

Le wiki expose l'API MediaWiki publique. Sur le wiki, chaque niveau d'étoiles d'un ninja est une fiche à part (★5, ★6, ★6 Blazing Awakened) dont l'infobox porte le nom de l'élément (`Heart Characters`…) et liste les cartes matériaux de l'étape suivante. Le script regroupe ces fiches par ninja :

```bash
node scripts/import-wiki.mjs fetch    # toutes les fiches des 5 éléments + catégories de matériaux → scripts/wiki-out/raw.json
node scripts/import-wiki.mjs build    # raw.json → src/data/ninjas.json et src/data/resources.json
```

Les requêtes sont séquentielles et espacées pour ménager le wiki. `discover` affiche les catégories et la structure d'une fiche, utile si le wiki change de format. Les avertissements de conversion sont écrits dans `scripts/wiki-out/warnings.txt`.

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

Le workflow `.github/workflows/deploy.yml` vérifie, teste et publie sur GitHub Pages à chaque push sur `main`. Dans les réglages du repo : **Settings → Pages → Source : GitHub Actions**. Le site est publié sur https://taurinese.github.io/blazing-planner/.

### Sauvegarde

Les données sont dans le `localStorage` du navigateur (clé `nbr-planner:v1`). Vider les données du site les efface : exporte une sauvegarde de temps en temps. Le champ `version` de la sauvegarde permet de migrer les anciennes données si le format évolue (`migrate()` dans `store.svelte.ts`).

## Licence

Code sous licence [MIT](LICENSE). Projet de fan non officiel, sans lien avec Bandai Namco, Shueisha ou Masashi Kishimoto. Aucun visuel du jeu n'est inclus.
