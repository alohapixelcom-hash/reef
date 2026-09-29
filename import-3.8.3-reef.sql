-- import-3.8.3-reef.sql - met une base reef-moteur deja en 3.8.2 au niveau de la 3.8.3 : l'auteur et le sujet d'un article choisis par leur nom, les vraies etiquettes (taxonomie native d'EmDash), les tables de la lettre d'information.
--
-- Les colonnes d'abord, puis ce fichier, par le script qui n'ajoute que les
-- colonnes qui manquent (la 3.8.3 n'en ajoute aucune) :
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.3-reef.sql              (le plan, rien n'est ecrit)
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql import-3.8.3-reef.sql --appliquer
-- A passer apres import-3.8.1-reef.sql et import-3.8.2-reef.sql.
--
-- IDEMPOTENT : un second passage ne change rien. Aucun DELETE, aucun DROP,
-- aucune valeur de contenu effacee : le champ "Mots-cles" des articles,
-- remplace par les etiquettes natives, est cache de l'ecran, et ses valeurs
-- restent dans la base.

-- 1. AUTEUR ET SUJET CHOISIS PAR LEUR NOM.
-- Le champ devient une reference native d'EmDash (l'identifiant d'une entree
-- d'Auteurs ou de Sujets, verifie par le moteur a l'enregistrement), affichee
-- par la liste de l'extension "champs" du socle (les noms, jamais les
-- identifiants). Seuls les champs encore en liste d'identifiants changent.
-- garde: SELECT COUNT(*) FROM _emdash_fields WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug = 'author' AND type = 'select' | le champ Auteur devient une reference (choix par le nom)
UPDATE _emdash_fields SET type = 'reference', label = 'Auteur', widget = 'aloha-champs:entree', options = '{"collection":"auteurs","aide":{"fr":"La personne qui signe l''article : son nom et son portrait s''affichent sous le titre, et l''article rejoint sa page. Une nouvelle personne se crée dans « Auteurs ».","en":"The person who signs the article: their name and portrait show under the title, and the article joins their page. A new person is created in \"Authors\"."}}', validation = NULL
  WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug = 'author' AND type = 'select';
-- garde: SELECT COUNT(*) FROM _emdash_fields WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug = 'topic' AND type = 'select' | le champ Sujet devient une reference (choix par le nom)
UPDATE _emdash_fields SET type = 'reference', label = 'Sujet', widget = 'aloha-champs:entree', options = '{"collection":"sujets","aide":{"fr":"Le sujet range l''article : il s''affiche au-dessus du titre et l''article rejoint la page du sujet. Un nouveau sujet se crée dans « Sujets ».","en":"The topic files the article: it shows above the title and the article joins the topic''s page. A new topic is created in \"Topics\"."}}', validation = NULL
  WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug = 'topic' AND type = 'select';

-- Les valeurs : l'adresse d'un auteur ("mara-lindqvist") devient l'identifiant
-- de son groupe de traductions (le meme pour les deux langues). Une valeur
-- qui n'est l'adresse d'aucune entree ne change pas ; une valeur deja migree
-- n'est l'adresse de personne : le second passage ne touche a rien. Le site
-- lit les deux formes (src/moteur/references.ts du socle).
UPDATE ec_posts SET author = (SELECT COALESCE(a.translation_group, a.id) FROM ec_auteurs a WHERE a.slug = ec_posts.author AND a.deleted_at IS NULL ORDER BY a.locale = 'en' DESC LIMIT 1)
  WHERE EXISTS (SELECT 1 FROM ec_auteurs a WHERE a.slug = ec_posts.author AND a.deleted_at IS NULL);
UPDATE ec_posts SET topic = (SELECT COALESCE(s.translation_group, s.id) FROM ec_sujets s WHERE s.slug = ec_posts.topic AND s.deleted_at IS NULL ORDER BY s.locale = 'en' DESC LIMIT 1)
  WHERE EXISTS (SELECT 1 FROM ec_sujets s WHERE s.slug = ec_posts.topic AND s.deleted_at IS NULL);

-- 2. LES ETIQUETTES NATIVES.
-- Chaque mot du champ "Mots-cles" devient une etiquette (taxonomie "tag"
-- d'EmDash), rattachee a l'article (pour ses deux langues, comme EmDash le
-- fait). L'adresse d'une etiquette est son libelle en minuscules, espaces en
-- tirets (la meme regle que le site, src/js/etiquettes.ts). La traduction
-- d'un article donne la traduction de l'etiquette de meme rang. Une seule
-- fois : une marque (options, aloha:reef:etiquettes-3.8.3) empeche un second
-- passage de rendre a un article une etiquette retiree depuis.
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM options WHERE name = 'aloha:reef:etiquettes-3.8.3') THEN 1 ELSE 0 END | les mots-cles deviennent des etiquettes (une seule fois)

-- 2a. Les etiquettes des articles d'origine (ceux qui ne sont la traduction d'aucun autre).
INSERT INTO taxonomies (id, name, slug, label, parent_id, data, locale, translation_group, sort_order)
  SELECT 'etiquette:' || e.locale || ':' || e.s, 'tag', e.s, MIN(e.label), NULL, NULL, e.locale, 'etiquette:' || e.locale || ':' || e.s, 0
  FROM (SELECT p.locale AS locale, replace(lower(trim(j.value)), ' ', '-') AS s, trim(j.value) AS label
        FROM ec_posts p, json_each(CASE WHEN json_valid(p.tags) AND json_type(p.tags) = 'array' THEN p.tags ELSE '[]' END) j
        WHERE p.deleted_at IS NULL AND (p.translation_group IS NULL OR p.translation_group = p.id) AND trim(j.value) <> '') AS e
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE name = 'aloha:reef:etiquettes-3.8.3')
    AND NOT EXISTS (SELECT 1 FROM taxonomies x WHERE x.name = 'tag' AND x.slug = e.s AND x.locale = e.locale)
  GROUP BY e.locale, e.s;

-- 2b. Leurs traductions : le mot de meme rang dans la traduction de l'article.
INSERT INTO taxonomies (id, name, slug, label, parent_id, data, locale, translation_group, sort_order)
  SELECT 'etiquette:' || e.locale || ':' || e.s, 'tag', e.s, MIN(e.label), NULL, NULL, e.locale, MIN(e.groupe), 0
  FROM (SELECT q.locale AS locale, replace(lower(trim(jq.value)), ' ', '-') AS s, trim(jq.value) AS label, t.translation_group AS groupe
        FROM ec_posts q
        JOIN ec_posts p ON p.id = q.translation_group AND p.id <> q.id AND p.deleted_at IS NULL
        JOIN json_each(CASE WHEN json_valid(q.tags) AND json_type(q.tags) = 'array' THEN q.tags ELSE '[]' END) jq
        JOIN json_each(CASE WHEN json_valid(p.tags) AND json_type(p.tags) = 'array' THEN p.tags ELSE '[]' END) jp ON jp.key = jq.key
        JOIN taxonomies t ON t.name = 'tag' AND t.locale = p.locale AND t.slug = replace(lower(trim(jp.value)), ' ', '-')
        WHERE q.deleted_at IS NULL AND trim(jq.value) <> '') AS e
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE name = 'aloha:reef:etiquettes-3.8.3')
    AND NOT EXISTS (SELECT 1 FROM taxonomies x WHERE x.name = 'tag' AND x.slug = e.s AND x.locale = e.locale)
    AND NOT EXISTS (SELECT 1 FROM taxonomies x WHERE x.name = 'tag' AND x.locale = e.locale AND x.translation_group = e.groupe)
  GROUP BY e.locale, e.s;

-- 2c. Les mots qui restent (une traduction qui a plus de mots que l'original) : des etiquettes a part entiere.
INSERT INTO taxonomies (id, name, slug, label, parent_id, data, locale, translation_group, sort_order)
  SELECT 'etiquette:' || e.locale || ':' || e.s, 'tag', e.s, MIN(e.label), NULL, NULL, e.locale, 'etiquette:' || e.locale || ':' || e.s, 0
  FROM (SELECT p.locale AS locale, replace(lower(trim(j.value)), ' ', '-') AS s, trim(j.value) AS label
        FROM ec_posts p, json_each(CASE WHEN json_valid(p.tags) AND json_type(p.tags) = 'array' THEN p.tags ELSE '[]' END) j
        WHERE p.deleted_at IS NULL AND trim(j.value) <> '') AS e
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE name = 'aloha:reef:etiquettes-3.8.3')
    AND NOT EXISTS (SELECT 1 FROM taxonomies x WHERE x.name = 'tag' AND x.slug = e.s AND x.locale = e.locale)
  GROUP BY e.locale, e.s;

-- 2d. Chaque article recoit ses etiquettes (EmDash range le groupe de l'article et celui de l'etiquette).
INSERT INTO content_taxonomies (collection, entry_id, taxonomy_id)
  SELECT DISTINCT 'posts', COALESCE(p.translation_group, p.id), t.translation_group
  FROM ec_posts p
  JOIN json_each(CASE WHEN json_valid(p.tags) AND json_type(p.tags) = 'array' THEN p.tags ELSE '[]' END) j
  JOIN taxonomies t ON t.name = 'tag' AND t.locale = p.locale AND t.slug = replace(lower(trim(j.value)), ' ', '-')
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE name = 'aloha:reef:etiquettes-3.8.3') AND p.deleted_at IS NULL AND t.translation_group IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM content_taxonomies c WHERE c.collection = 'posts' AND c.entry_id = COALESCE(p.translation_group, p.id) AND c.taxonomy_id = t.translation_group);

-- 2e. La marque : la migration des mots-cles est faite.
INSERT INTO options (name, value) SELECT 'aloha:reef:etiquettes-3.8.3', '"fait"' WHERE NOT EXISTS (SELECT 1 FROM options WHERE name = 'aloha:reef:etiquettes-3.8.3');

-- 2f. Le champ "Mots-cles" quitte l'ecran de l'article : il reste defini (EmDash
-- renvoie chaque valeur a l'enregistrement, un champ retire ferait refuser
-- l'article), mais son ecran ne montre plus rien (champ "cache" de
-- l'extension "champs" du socle). La colonne et ses valeurs restent.
-- garde: SELECT COUNT(*) FROM _emdash_fields WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug = 'tags' AND widget IS NULL | le champ Mots-cles quitte l'ecran de l'article (valeurs gardees)
UPDATE _emdash_fields SET widget = 'aloha-champs:cache', label = 'Anciens mots-clés (remplacés par les étiquettes)'
  WHERE collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND slug = 'tags' AND widget IS NULL;

-- 2g. Les categories : Reef range ses articles par sujet, la taxonomie
-- "category" de la graine d'origine ne s'applique plus aux articles (elle
-- reste definie, et revient si un jour on l'y rattache). Seulement si elle
-- n'a aucune categorie.
-- garde: SELECT COUNT(*) FROM _emdash_taxonomy_defs WHERE name = 'category' AND collections <> '[]' AND NOT EXISTS (SELECT 1 FROM taxonomies WHERE name = 'category') | les categories (vides) ne s'appliquent plus aux articles
UPDATE _emdash_taxonomy_defs SET collections = '[]'
  WHERE name = 'category' AND collections <> '[]' AND NOT EXISTS (SELECT 1 FROM taxonomies WHERE name = 'category');

-- 3. LA LETTRE D'INFORMATION : ses deux tables (extension Courriels du socle,
-- noyau/lettre.ts, SQL_LETTRE). L'extension les cree aussi seule au premier
-- usage ; les deux chemins sont idempotents.
CREATE TABLE IF NOT EXISTS courriels_abonnes (
  id TEXT PRIMARY KEY,
  adresse TEXT NOT NULL UNIQUE,
  langue TEXT NOT NULL,
  etat TEXT NOT NULL,
  jeton TEXT NOT NULL UNIQUE,
  page TEXT,
  demande_le INTEGER NOT NULL,
  confirme_le INTEGER
);
CREATE INDEX IF NOT EXISTS courriels_abonnes_etat ON courriels_abonnes (etat, confirme_le);
CREATE TABLE IF NOT EXISTS courriels_parutions (
  id TEXT PRIMARY KEY,
  quand INTEGER NOT NULL,
  article TEXT NOT NULL,
  titre TEXT NOT NULL,
  envoyes INTEGER NOT NULL,
  refuses INTEGER NOT NULL,
  par TEXT
);
CREATE INDEX IF NOT EXISTS courriels_parutions_article ON courriels_parutions (article, quand);
