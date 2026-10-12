-- import-3.9.0-reef.sql - met une base reef-moteur deja en 3.8.5 au niveau de la 3.9.0 : la collection du blog prend le libelle de la maison au rail (« Articles de blog », « Article de blog » au singulier) ; le titre de l'accueil passe entre 30 et 60 caracteres.
--
-- Le reste de la 3.9.0 (ecran SEO, photos converties, tableau de bord en
-- tuiles) cree ses tables seul au premier usage : rien a ecrire pour lui.
-- Le titre de l'accueil ne change que s'il est encore celui de la 3.8.5 : un
-- titre deja modifie dans le back office reste celui de l'editeur.
--
--   npx wrangler d1 execute reef-moteur --remote --config wrangler.moteur.jsonc --file=migrations/import-3.9.0-reef.sql
--
-- IDEMPOTENT : un second passage ne change rien. Aucun DELETE, aucun DROP.

UPDATE _emdash_collections
SET label = 'Articles de blog',
    label_singular = 'Article de blog',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'posts'
  AND (label IS NOT 'Articles de blog' OR label_singular IS NOT 'Article de blog');

UPDATE ec_sections SET meta_title = 'Reef Notes, a working notebook from a web studio'
WHERE slug = 'hero' AND locale = 'en' AND meta_title = 'Reef Notes, a working notebook from an independent web studio';
