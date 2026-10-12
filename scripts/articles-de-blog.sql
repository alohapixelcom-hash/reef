-- scripts/articles-de-blog.sql - la collection du blog d'une base deja en ligne prend le libelle de la maison : "Articles de blog" au rail, "Article de blog" au singulier (socle 1.15.0).
--
-- POURQUOI. Le libelle d'une collection est ecrit dans la base a l'installation,
-- depuis la graine du theme ; corriger seed/seed.json ne change pas une base
-- deja remplie. Le rail d'EmDash et le bouton "+ ..." de son tableau de bord
-- affichaient donc "Billets", "Articles" ou "Articles du carnet" selon le site.
-- Le nom PUBLIC de la rubrique (pages du site, menus) n'est pas dans cette
-- table : il ne bouge pas.
--
-- IDEMPOTENT. La garde ne touche qu'une ligne qui differe encore : rejoue, le
-- script ne change rien (0 ligne). Les six noms sont ceux de COLLECTIONS_DU_BLOG
-- (house.mjs, accueil/tuiles.ts). Lire d'abord la requete de controle : une
-- collection "journal" qui ne serait pas un blog se retire de la liste avant
-- de jouer le script.
--
-- JOUER (base du site, jamais sans sauvegarde du jour) :
--   npx wrangler d1 execute <site>-moteur --remote --file=scripts/articles-de-blog.sql
-- Le rail le montre au prochain chargement du back office (le manifeste
-- d'EmDash est relu a chaque requete).

SELECT slug, label, label_singular FROM _emdash_collections
WHERE slug IN ('posts', 'blog', 'articles', 'billets', 'carnet', 'journal');

UPDATE _emdash_collections
SET label = 'Articles de blog',
    label_singular = 'Article de blog',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug IN ('posts', 'blog', 'articles', 'billets', 'carnet', 'journal')
  AND (label IS NOT 'Articles de blog' OR label_singular IS NOT 'Article de blog');

SELECT slug, label, label_singular FROM _emdash_collections
WHERE slug IN ('posts', 'blog', 'articles', 'billets', 'carnet', 'journal');
