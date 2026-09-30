-- import-3.6.0-reef.sql - met une base reef-moteur en ligne au niveau de la 3.6.0 : la couleur de la marque propose de revenir a la couleur d'origine du theme.
--
-- A passer apres import-3.4.0-reef.sql (deja passe en 3.4.0 et 3.5.0), une fois :
--   npx wrangler d1 execute reef-moteur --remote --file import-3.6.0-reef.sql --config wrangler.moteur.jsonc
-- Idempotent : l'UPDATE ne touche le champ que s'il porte encore la liste de
-- la 3.5.0 (une liste deja changee n'est jamais ecrasee). Aucun DELETE, aucun
-- DROP, aucune donnee de contenu touchee : la couleur choisie par l'editeur
-- reste la sienne.

UPDATE _emdash_fields
  SET label = 'Couleur de la marque, sur tout le site (« Couleur d''origine du thème » ou vide : le corail du thème)',
      validation = '{"options":["Couleur d''origine du thème","Bleu océan","Bleu nuit","Vert émeraude","Rouge framboise","Orange soleil"]}'
  WHERE slug = 'brand_color'
    AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site')
    AND validation = '{"options":["Bleu océan","Bleu nuit","Vert émeraude","Rouge framboise","Orange soleil"]}';
