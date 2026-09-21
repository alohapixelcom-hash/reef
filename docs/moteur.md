# Le moteur de publication

Reef se construit de deux façons, et c'est une variable qui choisit.

| | Moteur éteint (défaut) | Moteur allumé (`ALOHA_MOTEUR=emdash`) |
|---|---|---|
| Les billets vivent | dans `src/data/posts/*.md` | en base (Cloudflare D1), médias dans R2 |
| Publier | commit, puis build | un clic dans le back office, visible sans build |
| Le site | 100 % statique, aucun hébergeur imposé | Worker Cloudflare : pages gérées rendues à la demande, le reste figé |
| Le back office | aucun | EmDash, à `/_emdash/admin` |

Moteur éteint, le build est identique à celui d'un Reef sans moteur : les 63 fichiers HTML, XML et TXT ont été comparés un par un (21 septembre 2026).

Le moteur est [EmDash](https://github.com/emdash-cms/emdash) (licence MIT), un CMS fait pour Astro et Cloudflare. Reef ne le réécrit pas : il s'y branche.

## Allumer le moteur en local

```bash
pnpm dev:moteur                                          # http://localhost:4321, back office à /_emdash/admin
node scripts/moteur-import.mjs --url http://localhost:4321   # verse les billets Markdown en base, une fois
```

Au premier démarrage, EmDash crée ses tables et applique `seed/seed.json`, qui décrit le SCHÉMA de Reef (la collection `posts` et ses champs). Le contenu, lui, passe par l'API : l'import fait subir à chaque billet la même validation qu'un billet saisi à la main. Il est rejouable : un billet déjà présent (même slug, même langue) est sauté.

En local, `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` ouvre une session d'administrateur sans clé d'accès. Cette porte n'existe qu'en développement.

## Comment c'est branché

Cinq pièces, et aucune page ne sait d'où vient un billet.

1. **`moteur.config.mjs`** pose l'adapter Cloudflare, React (l'interface du back office) et EmDash, uniquement quand la variable est là. Il porte aussi LA liste des pages gérées (`PAGES_GEREES`) : celles-là se rendent à la demande, toutes les autres restent figées au build.
2. **L'alias `@moteur/source`** pointe vers `src/moteur/source.fichiers.ts` ou `src/moteur/source.emdash.ts`. Les deux exportent les mêmes fonctions (`billetsPublies`, `billetParSlug`, `corpsDuBillet`) et rendent la même forme : une entrée de collection `posts`. Aucun composant n'a été réécrit pour le moteur.
3. **`src/js/posts.ts`** reste le seul endroit qui liste des billets. Il lit la source par l'alias ; le tri, les références et le temps de lecture valent pour les deux.
4. **`src/moteur/chemins.ts`** : une page rendue à la demande ne reçoit pas de props. `propsDeLaPage(Astro, getStaticPaths)` rejoue le `getStaticPaths` de la page et y cherche l'adresse demandée. Ce qui existe au build existe à la demande, au même endroit ; une adresse que le build n'aurait pas produite répond 404.
5. **`src/moteur/TexteRiche.*.astro`** rend le corps d'un billet de la base (Portable Text) dans la colonne de lecture, avec les mêmes ancres d'intertitre (`github-slugger`, comme Astro) et la même coloration du code (Shiki, deux thèmes).

### Ajouter une page gérée

1. L'inscrire dans `PAGES_GEREES` (`moteur.config.mjs`).
2. Dans la page : `const props = await propsDeLaPage<Props>(Astro, getStaticPaths); if (!props) return introuvable();`.
3. Lire les billets par `@js/posts`, jamais par `getCollection("posts")`.

Une page oubliée resterait figée sur le contenu du dernier build : c'est exactement le défaut que le moteur corrige.

### Deux pièges déjà payés

- **`/blog/2/` arrive sur la route d'article.** À la demande, un paramètre nommé (`[id]`) passe avant un paramètre de reste (`[...page]`). `blog/[id].astro` reconnaît un numéro et rend l'archive ; le rendu vit dans `src/components/Pages/`.
- **`trailingSlash: "always"` casse l'API du moteur.** Ses routes s'appellent sans barre finale. Moteur allumé, le réglage passe à `"ignore"`.

## Déployer

`wrangler.moteur.jsonc` décrit le Worker : base `DB`, médias `MEDIA`, et un cron à la minute pour les publications programmées. Au premier `wrangler deploy`, Wrangler crée la base et le compartiment s'ils n'existent pas.

```bash
pnpm build:moteur
pnpm wrangler deploy --config wrangler.moteur.jsonc
```

## Ce qui a été mesuré

Build de production servi par workerd en local, trois passes, 21 septembre 2026 :

| Geste | Visible sur le site après |
|---|---|
| Publier | 55 à 93 ms (billet, liste et flux RSS) |
| Corriger un titre et republier | 47 à 57 ms |
| Dépublier | 44 à 54 ms (la page repasse en 404) |

Un brouillon répond 404 tant qu'il n'est pas publié. Ces chiffres sont locaux : en ligne s'ajoutent le réseau et le cache de Cloudflare, à mesurer après le premier déploiement.
