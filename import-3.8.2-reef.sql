-- import-3.8.2-reef.sql - met une base reef-moteur deja en 3.8.1 au niveau de la 3.8.2 (et les champs communs aux deux langues enfin communs) : un champ de plus, le logo pour le mode sombre.
--
-- Les colonnes d'abord, puis ce fichier, par le script qui n'ajoute que les
-- colonnes qui manquent (une seconde fois, il n'ajoute rien) :
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.2-reef.sql              (le plan, rien n'est ecrit)
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.2-reef.sql --appliquer
-- Idempotent : chaque champ n'est ajoute que s'il n'existe pas encore, a la
-- suite des champs de sa collection. Aucun DELETE, aucun DROP, aucune donnee
-- de contenu touchee : les champs restent vides, et vide rend le site tel
-- qu'il est (le logo des Parametres).

-- champ site/logo_dark (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3VRF282D4RK0000000000A1', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'logo_dark', 'Logo pour le mode sombre (vide : le logo des Paramètres sert aussi sur fond sombre)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM _emdash_fields WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site')), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 0, 0
  WHERE EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'site')
    AND NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'logo_dark' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));

-- LES CHAMPS COMMUNS AUX DEUX LANGUES. La graine les declare "translatable":
-- false (photos, adresses des boutons, "Masquer ce bloc", couleur, police,
-- place...), mais EmDash 0.38 ne lit pas ce drapeau a l'installation
-- (applySeed ne le passe pas a la creation du champ, mesure du 29 septembre
-- 2026) : une base installee depuis la graine les a en "traduisible", et une
-- couleur ou une photo choisie en anglais ne valait pas pour le francais. Ce
-- UPDATE rend a chaque champ ce que la graine dit ; ensuite, EmDash recopie la
-- valeur dans l'autre langue a chaque enregistrement. Idempotent : il ne
-- touche que les champs encore marques traduisibles ; aucune valeur de contenu
-- n'est ecrite.
UPDATE _emdash_fields SET translatable = 0
  WHERE translatable = 1
    AND ((collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug IN ('topic', 'author'))
     OR (collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND slug IN ('hidden', 'image', 'video', 'video_poster', 'meta_image', 'order'))
     OR (collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sujets') AND slug IN ('color', 'order', 'image'))
     OR (collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'auteurs') AND slug IN ('avatar'))
     OR (collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'pages') AND slug IN ('image'))
     OR (collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site') AND slug IN ('brand_color', 'font', 'logo_dark')));
