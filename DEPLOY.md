<!-- DEPLOY.md - comment la demo en ligne est publiee. Ne concerne pas le theme vendu. -->

# Deploiement de la demo

`reef.alohapixel.app` est le Worker Cloudflare **reef-demo**. Depuis le
19 aout 2026 il est publie automatiquement par **Workers Builds** a chaque
push sur `main`. Il n'y a plus rien a lancer depuis un Mac.

| Reglage | Valeur |
|---|---|
| Depot | `alohapixelcom-hash/reef` |
| Branche de production | `main` |
| Commande de build | `pnpm run build` |
| Commande de deploiement | `npx wrangler deploy` |

## Trois choses a ne pas casser

**`packageManager: pnpm@11.22.0` dans package.json.** La CI Cloudflare part
sinon sur pnpm 10, qui ne lit pas la cle `allowBuilds` de
`pnpm-workspace.yaml` : esbuild et sharp resteraient sans binaire natif, et
le build echouerait sans dire pourquoi. Verifie le 19 aout sur aloha, ou
l'erreur exacte etait `ERROR packages field missing or empty`.

**`run_worker_first = true` dans wrangler.toml.** Sans lui, Cloudflare sert
`index.html` directement pour `/` et la redirection de langue ne s'execute
jamais. C'est aussi pour cela que le worker teste lui-meme l'extension du
chemin : il voit toutes les requetes et doit laisser passer les feuilles de
style.

**Le theme vendu ne contient ni `wrangler.toml` ni `src/worker.ts`.** Ces
deux fichiers appartiennent a la demo. L'archive vendue est construite a
part et vit dans R2.

## Les images

Les photographies de `src/assets/` habillent **la demo**. Elles ne partent
pas dans l'archive vendue : une licence d'image couvre l'affichage sur nos
propres sites, pas la redistribution dans un fichier que des acheteurs
telechargent. Le theme livre les emplacements, l'acheteur met les siennes.
