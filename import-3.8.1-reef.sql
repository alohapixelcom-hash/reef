-- import-3.8.1-reef.sql - met une base reef-moteur deja en 3.6.0 ou 3.8.0 au niveau de la 3.8.1 : deux champs de plus, la police du site et la place d'un bloc sur l'accueil.
--
-- Les colonnes d'abord, puis ce fichier, par le script qui n'ajoute que les
-- colonnes qui manquent (une seconde fois, il n'ajoute rien) :
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.1-reef.sql              (le plan, rien n'est ecrit)
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.1-reef.sql --appliquer
-- Idempotent : chaque champ n'est ajoute que s'il n'existe pas encore, a la
-- suite des champs de sa collection. Aucun DELETE, aucun DROP, aucune donnee
-- de contenu touchee : les deux champs restent vides, et vide rend le site tel
-- qu'il est (la police du theme, l'ordre du theme).

-- champ site/font (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3RCMS0F0NTS1TE0000000A1', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'font', 'Police du site, pour les titres et le texte (« Police d''origine du thème » ou vide : celle du thème ; les autres sont déjà installées sur chaque appareil, rien à télécharger)', 'select', 'TEXT', 0, 0, NULL, '{"options":["Police d''origine du thème","Police du système, la plus légère","Classique, à empattements","Titres classiques, texte sans empattements"]}', NULL, NULL, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM _emdash_fields WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site')), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 0, 0
  WHERE EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'site')
    AND NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'font' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));

-- champ sections/order (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3RCMS0RDRE0B10C0000000A', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'order', 'Place du bloc sur l''accueil, de haut en bas (1 : tout en haut ; vide : la place prévue par le thème ; sans effet sur les autres pages)', 'integer', 'INTEGER', 0, 0, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM _emdash_fields WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections')), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 0, 0
  WHERE EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'sections')
    AND NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'order' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
