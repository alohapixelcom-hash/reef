-- import-3.4.0-reef.sql - met une base reef-moteur en ligne au niveau de la 3.4.0 : tout le site s'administre depuis le back office.
--
-- NE PAS PASSER A LA MAIN : scripts/base-3.4.0.mjs ajoute d'abord les colonnes
-- nouvelles des tables existantes (ALTER TABLE, que SQLite ne sait pas rendre
-- idempotent), dit le plan, puis passe ce fichier. Marche a suivre :
-- docs/moteur.md, "Online data".
--
-- Etabli par scripts/sql-par-difference.mjs, par difference entre deux bases
-- locales vierges : graine de la 3.3.x (socle 1.0.0), graine de la 3.4.0.
-- Idempotent : CREATE ... IF NOT EXISTS, INSERT ... WHERE NOT EXISTS sur des
-- cles fixes, UPDATE ... WHERE <valeur actuelle> IS <valeur de depart> (une
-- valeur changee par l'editeur n'est jamais ecrasee), declencheurs en dernier.
-- Aucun DELETE, aucun DROP. Les lignes "-- garde:" sont lues par le plan.

-- 1. LE SCHEMA : les tables et les index nouveaux, crees seulement s'ils manquent.

CREATE TABLE IF NOT EXISTS "ec_sujets" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "name" text default '' not null, "description" text, "color" text, "order" integer, "image" text, constraint "ec_sujets_slug_locale_unique" unique ("slug", "locale"));
CREATE TABLE IF NOT EXISTS "ec_auteurs" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "name" text default '' not null, "role" text, "bio" text, "avatar" text, "links" json, constraint "ec_auteurs_slug_locale_unique" unique ("slug", "locale"));
CREATE TABLE IF NOT EXISTS "ec_pages" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "title" text default '' not null, "lede" text, "body" json, "image" text, constraint "ec_pages_slug_locale_unique" unique ("slug", "locale"));
CREATE TABLE IF NOT EXISTS "ec_site" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "description" text, "og_alt" text, "email" text, "credit_name" text, "credit_link" text, "feed_title" text, "form_newsletter" text, "form_contact" text, "brand_color" text, constraint "ec_site_slug_locale_unique" unique ("slug", "locale"));
CREATE VIRTUAL TABLE IF NOT EXISTS "_emdash_fts_sujets" USING fts5(
				id UNINDEXED, locale UNINDEXED, name, description,
				tokenize='porter unicode61'
			);
CREATE VIRTUAL TABLE IF NOT EXISTS "_emdash_fts_auteurs" USING fts5(
				id UNINDEXED, locale UNINDEXED, name, bio,
				tokenize='porter unicode61'
			);
CREATE VIRTUAL TABLE IF NOT EXISTS "_emdash_fts_pages" USING fts5(
				id UNINDEXED, locale UNINDEXED, title, lede, body,
				tokenize='porter unicode61'
			);
CREATE TABLE IF NOT EXISTS courriels_journal (
  id TEXT PRIMARY KEY,
  quand INTEGER NOT NULL,
  formulaire TEXT NOT NULL,
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  fournisseur TEXT NOT NULL,
  etat TEXT NOT NULL,
  code TEXT,
  erreur TEXT,
  identifiant TEXT,
  message TEXT,
  renvoi_de TEXT
);
CREATE TABLE IF NOT EXISTS courriels_reglages (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  modifie_le INTEGER NOT NULL,
  modifie_par TEXT
);
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msfz0mmt0hp1ctgw668bdd"
			ON "ec_posts" (
				("pub_date" IS NOT NULL),
				"pub_date",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msfz0mmt0hp1ctgw668bdd_loc"
			ON "ec_posts" (
				locale,
				("pub_date" IS NOT NULL),
				"pub_date",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msfz11hgfzex6pa4t3n5xt"
			ON "ec_sections" (
				("page" IS NOT NULL),
				"page",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msfz11hgfzex6pa4t3n5xt_loc"
			ON "ec_sections" (
				locale,
				("page" IS NOT NULL),
				"page",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_slug"
			ON "ec_sujets" (slug)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_del_sched"
			ON "ec_sujets" (deleted_at, scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_live_revision"
			ON "ec_sujets" (live_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_draft_revision"
			ON "ec_sujets" (draft_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_author"
			ON "ec_sujets" (author_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_primary_byline"
			ON "ec_sujets" (primary_byline_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_locale"
			ON "ec_sujets" (locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_tg_locale"
			ON "ec_sujets" (translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_del_tg_locale"
			ON "ec_sujets" (deleted_at, translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_deleted_updated_id"
			ON "ec_sujets" (deleted_at, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_deleted_status"
			ON "ec_sujets" (deleted_at, status)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_deleted_created_id"
			ON "ec_sujets" (deleted_at, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_deleted_published_id"
			ON "ec_sujets" (deleted_at, published_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_loc_upd"
			ON "ec_sujets" (deleted_at, locale, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_sujets_loc_crt"
			ON "ec_sujets" (deleted_at, locale, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msfz1e3xgx8wqqvng59jaz"
			ON "ec_sujets" (
				("order" IS NOT NULL),
				"order",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msfz1e3xgx8wqqvng59jaz_loc"
			ON "ec_sujets" (
				locale,
				("order" IS NOT NULL),
				"order",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_slug"
			ON "ec_auteurs" (slug)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_del_sched"
			ON "ec_auteurs" (deleted_at, scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_live_revision"
			ON "ec_auteurs" (live_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_draft_revision"
			ON "ec_auteurs" (draft_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_author"
			ON "ec_auteurs" (author_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_primary_byline"
			ON "ec_auteurs" (primary_byline_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_locale"
			ON "ec_auteurs" (locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_tg_locale"
			ON "ec_auteurs" (translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_del_tg_locale"
			ON "ec_auteurs" (deleted_at, translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_deleted_updated_id"
			ON "ec_auteurs" (deleted_at, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_deleted_status"
			ON "ec_auteurs" (deleted_at, status)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_deleted_created_id"
			ON "ec_auteurs" (deleted_at, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_deleted_published_id"
			ON "ec_auteurs" (deleted_at, published_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_loc_upd"
			ON "ec_auteurs" (deleted_at, locale, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_auteurs_loc_crt"
			ON "ec_auteurs" (deleted_at, locale, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_slug"
			ON "ec_pages" (slug)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_del_sched"
			ON "ec_pages" (deleted_at, scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_live_revision"
			ON "ec_pages" (live_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_draft_revision"
			ON "ec_pages" (draft_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_author"
			ON "ec_pages" (author_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_primary_byline"
			ON "ec_pages" (primary_byline_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_locale"
			ON "ec_pages" (locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_tg_locale"
			ON "ec_pages" (translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_del_tg_locale"
			ON "ec_pages" (deleted_at, translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_deleted_updated_id"
			ON "ec_pages" (deleted_at, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_deleted_status"
			ON "ec_pages" (deleted_at, status)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_deleted_created_id"
			ON "ec_pages" (deleted_at, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_deleted_published_id"
			ON "ec_pages" (deleted_at, published_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_loc_upd"
			ON "ec_pages" (deleted_at, locale, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_pages_loc_crt"
			ON "ec_pages" (deleted_at, locale, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_slug"
			ON "ec_site" (slug)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_del_sched"
			ON "ec_site" (deleted_at, scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_live_revision"
			ON "ec_site" (live_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_draft_revision"
			ON "ec_site" (draft_revision_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_author"
			ON "ec_site" (author_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_primary_byline"
			ON "ec_site" (primary_byline_id)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_locale"
			ON "ec_site" (locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_tg_locale"
			ON "ec_site" (translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_del_tg_locale"
			ON "ec_site" (deleted_at, translation_group, locale)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_deleted_updated_id"
			ON "ec_site" (deleted_at, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_deleted_status"
			ON "ec_site" (deleted_at, status)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_deleted_created_id"
			ON "ec_site" (deleted_at, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_deleted_published_id"
			ON "ec_site" (deleted_at, published_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_loc_upd"
			ON "ec_site" (deleted_at, locale, updated_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_ec_site_loc_crt"
			ON "ec_site" (deleted_at, locale, created_at DESC, id DESC)
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msg228abq1x8x97wf3849j"
			ON "ec_posts" (
				("topic" IS NOT NULL),
				"topic",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msg228abq1x8x97wf3849j_loc"
			ON "ec_posts" (
				locale,
				("topic" IS NOT NULL),
				"topic",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msg232mnh7ng79yktp4am7"
			ON "ec_posts" (
				("author" IS NOT NULL),
				"author",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS "idx_cf_01m3msg232mnh7ng79yktp4am7_loc"
			ON "ec_posts" (
				locale,
				("author" IS NOT NULL),
				"author",
				id
			)
			WHERE deleted_at IS NULL
		;
CREATE INDEX IF NOT EXISTS courriels_journal_quand ON courriels_journal (quand);
CREATE INDEX IF NOT EXISTS courriels_journal_etat ON courriels_journal (etat, quand);
CREATE INDEX IF NOT EXISTS courriels_journal_destinataire ON courriels_journal (destinataire, quand);

-- 2. LES COLLECTIONS ET LEURS CHAMPS : les nouveaux, puis ce qui change dans les anciens (libelles, choix, ordre), seulement si la valeur est encore celle de depart.

-- garde: SELECT count(*) FROM _emdash_collections WHERE slug = 'sections' AND ("label_singular" IS 'Section' OR "label_singular" IS 'Bloc') | collection sections : label_singular
UPDATE _emdash_collections SET "label_singular" = 'Bloc', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE slug = 'sections' AND "label_singular" IS 'Section';
-- garde: SELECT count(*) FROM _emdash_collections WHERE slug = 'sections' AND ("description" IS 'Les textes rédigés de l''accueil et des pages fixes : chaque entrée porte une section, sous le même identifiant dans les deux langues. Un champ laissé vide garde le texte livré avec le thème.' OR "description" IS 'Chaque bloc d''une page du site : son titre, ses textes, ses boutons et leurs adresses, sa photo. Un bloc existe en anglais et en français, sous le même identifiant. Un champ laissé vide garde le texte livré avec le thème.') | collection sections : description
UPDATE _emdash_collections SET "description" = 'Chaque bloc d''une page du site : son titre, ses textes, ses boutons et leurs adresses, sa photo. Un bloc existe en anglais et en français, sous le même identifiant. Un champ laissé vide garde le texte livré avec le thème.', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE slug = 'sections' AND "description" IS 'Les textes rédigés de l''accueil et des pages fixes : chaque entrée porte une section, sous le même identifiant dans les deux langues. Un champ laissé vide garde le texte livré avec le thème.';
-- collection sujets (nouvelle)
INSERT INTO _emdash_collections ("id", "slug", "label", "label_singular", "description", "icon", "supports", "source", "created_at", "updated_at", "search_config", "has_seo", "url_pattern", "comments_enabled", "comments_moderation", "comments_closed_after_days", "comments_auto_approve_users", "hidden", "sort_order", "admin_config", "title_field", "date_field", "routable", "edit_locking", "nav_group")
  SELECT '01M3MSFZ1ESFRH4NQ4WGKDQ3YR', 'sujets', 'Sujets', 'Sujet', 'Les sujets du blog : chacun a sa page, sa couleur et sa description. Pour ranger un billet dans un nouveau sujet, ajoutez aussi son identifiant aux choix du champ « Sujet » des Articles (Types de contenu).', NULL, '["drafts","revisions","search","seo"]', 'seed', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{"enabled":true}', 1, '/topics/{slug}', 0, 'first_time', 90, 1, 0, 3, '{"listColumns":["color","order"]}', 'name', NULL, 1, 1, NULL
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'sujets');
-- collection auteurs (nouvelle)
INSERT INTO _emdash_collections ("id", "slug", "label", "label_singular", "description", "icon", "supports", "source", "created_at", "updated_at", "search_config", "has_seo", "url_pattern", "comments_enabled", "comments_moderation", "comments_closed_after_days", "comments_auto_approve_users", "hidden", "sort_order", "admin_config", "title_field", "date_field", "routable", "edit_locking", "nav_group")
  SELECT '01M3MSFZ1T52SSZQBTZ6NE73HE', 'auteurs', 'Auteurs', 'Auteur', 'Les personnes qui signent les billets : chacune a sa page. Pour signer un billet d''un nouvel auteur, ajoutez aussi son identifiant aux choix du champ « Auteur » des Articles (Types de contenu).', NULL, '["drafts","revisions","search","seo"]', 'seed', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{"enabled":true}', 1, '/authors/{slug}', 0, 'first_time', 90, 1, 0, 4, '{"listColumns":["role"]}', 'name', NULL, 1, 1, NULL
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'auteurs');
-- collection pages (nouvelle)
INSERT INTO _emdash_collections ("id", "slug", "label", "label_singular", "description", "icon", "supports", "source", "created_at", "updated_at", "search_config", "has_seo", "url_pattern", "comments_enabled", "comments_moderation", "comments_closed_after_days", "comments_auto_approve_users", "hidden", "sort_order", "admin_config", "title_field", "date_field", "routable", "edit_locking", "nav_group")
  SELECT '01M3MSFZ254NXMZ4476198C8VM', 'pages', 'Pages', 'Page', 'Des pages en plus, écrites ici de A à Z : une page simple (titre, introduction, texte, photo) à l''adresse de son identifiant. Pour qu''on la trouve, ajoutez-la ensuite à un menu.', NULL, '["drafts","revisions","search","seo"]', 'seed', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), '{"enabled":true}', 1, '/{slug}', 0, 'first_time', 90, 1, 0, 5, NULL, 'title', NULL, 1, 1, NULL
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'pages');
-- collection site (nouvelle)
INSERT INTO _emdash_collections ("id", "slug", "label", "label_singular", "description", "icon", "supports", "source", "created_at", "updated_at", "search_config", "has_seo", "url_pattern", "comments_enabled", "comments_moderation", "comments_closed_after_days", "comments_auto_approve_users", "hidden", "sort_order", "admin_config", "title_field", "date_field", "routable", "edit_locking", "nav_group")
  SELECT '01M3MSFZ2FQZ814NFFF2RWS77E', 'site', 'Réglages par langue', 'Réglages de la langue', 'Ce qui change avec la langue et que les Réglages du site n''ont pas : la description du site, l''adresse de contact, le crédit du pied de page, le titre du flux RSS, la couleur de la marque. Une seule entrée par langue.', NULL, '["drafts","revisions"]', 'seed', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 0, NULL, 0, 'first_time', 90, 1, 0, 6, NULL, NULL, NULL, 0, 1, NULL
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = 'site');
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'topic' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND ("label" IS 'Rubrique' OR "label" IS 'Sujet (l''identifiant d''une entrée de Sujets)') | champ posts/topic : label
UPDATE _emdash_fields SET "label" = 'Sujet (l''identifiant d''une entrée de Sujets)' WHERE slug = 'topic' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND "label" IS 'Rubrique';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'author' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND ("label" IS 'Signature' OR "label" IS 'Auteur (l''identifiant d''une entrée d''Auteurs)') | champ posts/author : label
UPDATE _emdash_fields SET "label" = 'Auteur (l''identifiant d''une entrée d''Auteurs)' WHERE slug = 'author' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'posts') AND "label" IS 'Signature';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Titre' OR "label" IS 'Titre du bloc') | champ sections/title : label
UPDATE _emdash_fields SET "label" = 'Titre du bloc' WHERE slug = 'title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Titre';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'page' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Page' OR "label" IS 'Page où se trouve ce bloc') | champ sections/page : label
UPDATE _emdash_fields SET "label" = 'Page où se trouve ce bloc' WHERE slug = 'page' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Page';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'page' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("validation" IS '{"options":["accueil","billet","blog","rubriques","auteurs","recherche","a-propos","contact","mentions-legales","confidentialite","conditions","toutes"]}' OR "validation" IS '{"options":["Accueil","Billet","Tous les billets","Sujets","Page d''un sujet","Auteurs","Page d''un auteur","Recherche","À propos","Contact","Mentions légales","Confidentialité","Conditions","Tout le site","Page introuvable"]}') | champ sections/page : validation
UPDATE _emdash_fields SET "validation" = '{"options":["Accueil","Billet","Tous les billets","Sujets","Page d''un sujet","Auteurs","Page d''un auteur","Recherche","À propos","Contact","Mentions légales","Confidentialité","Conditions","Tout le site","Page introuvable"]}' WHERE slug = 'page' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "validation" IS '{"options":["accueil","billet","blog","rubriques","auteurs","recherche","a-propos","contact","mentions-legales","confidentialite","conditions","toutes"]}';
-- champ sections/hidden (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1146MRRRHW5HWXEFX2', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'hidden', 'Masquer ce bloc : les visiteurs ne le voient plus (décoché : le bloc s''affiche)', 'boolean', 'INTEGER', 0, 0, NULL, NULL, NULL, NULL, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'hidden' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'eyebrow' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Surtitre' OR "label" IS 'Petit titre au-dessus du titre') | champ sections/eyebrow : label
UPDATE _emdash_fields SET "label" = 'Petit titre au-dessus du titre' WHERE slug = 'eyebrow' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Surtitre';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'eyebrow' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 2 OR "sort_order" IS 3) | champ sections/eyebrow : sort_order
UPDATE _emdash_fields SET "sort_order" = 3 WHERE slug = 'eyebrow' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 2;
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'accent' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Mot en couleur (un mot du titre)' OR "label" IS 'Mot du titre écrit en couleur (recopiez un mot du titre)') | champ sections/accent : label
UPDATE _emdash_fields SET "label" = 'Mot du titre écrit en couleur (recopiez un mot du titre)' WHERE slug = 'accent' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Mot en couleur (un mot du titre)';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'accent' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 3 OR "sort_order" IS 4) | champ sections/accent : sort_order
UPDATE _emdash_fields SET "sort_order" = 4 WHERE slug = 'accent' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 3;
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'lede' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Chapô' OR "label" IS 'Texte d''introduction, sous le titre') | champ sections/lede : label
UPDATE _emdash_fields SET "label" = 'Texte d''introduction, sous le titre' WHERE slug = 'lede' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Chapô';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'lede' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 4 OR "sort_order" IS 5) | champ sections/lede : sort_order
UPDATE _emdash_fields SET "sort_order" = 5 WHERE slug = 'lede' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 4;
-- champ sections/body (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11SM2GS8X7DW61K640', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'body', 'Texte', 'text', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 6, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'body' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- champ sections/image (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11FJTSMZ4MKMEZ8RZ3', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'image', 'Photo du bloc (vide : la photo livrée avec le thème)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 7, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'image' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- champ sections/video (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11F0D66M1YZ7M9RAJT', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'video', 'Adresse de la vidéo du bloc (vide : la vidéo livrée avec le thème)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 8, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'video' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- champ sections/video_poster (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11R7SKYCZ597VG5X7K', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'video_poster', 'Image montrée avant la vidéo (vide : celle livrée avec le thème)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'video_poster' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'arguments' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Blocs de la liste, dans l''ordre de la page' OR "label" IS 'Éléments du bloc, dans l''ordre de la page') | champ sections/arguments : label
UPDATE _emdash_fields SET "label" = 'Éléments du bloc, dans l''ordre de la page' WHERE slug = 'arguments' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Blocs de la liste, dans l''ordre de la page';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'arguments' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("validation" IS '{"subFields":[{"slug":"title","label":"Titre","type":"string"},{"slug":"body","label":"Texte","type":"text"}]}' OR "validation" IS '{"subFields":[{"slug":"title","label":"Titre","type":"string"},{"slug":"body","label":"Texte","type":"text"},{"slug":"anchor","label":"Ancre de la clause dans l''adresse de la page (vide : tirée du titre)","type":"string"},{"slug":"link","label":"Adresse du lien (vide : celle prévue par le thème)","type":"string"}]}') | champ sections/arguments : validation
UPDATE _emdash_fields SET "validation" = '{"subFields":[{"slug":"title","label":"Titre","type":"string"},{"slug":"body","label":"Texte","type":"text"},{"slug":"anchor","label":"Ancre de la clause dans l''adresse de la page (vide : tirée du titre)","type":"string"},{"slug":"link","label":"Adresse du lien (vide : celle prévue par le thème)","type":"string"}]}' WHERE slug = 'arguments' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "validation" IS '{"subFields":[{"slug":"title","label":"Titre","type":"string"},{"slug":"body","label":"Texte","type":"text"}]}';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'arguments' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 5 OR "sort_order" IS 10) | champ sections/arguments : sort_order
UPDATE _emdash_fields SET "sort_order" = 10 WHERE slug = 'arguments' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 5;
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'cta' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Bouton principal' OR "label" IS 'Texte du bouton principal') | champ sections/cta : label
UPDATE _emdash_fields SET "label" = 'Texte du bouton principal' WHERE slug = 'cta' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Bouton principal';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'cta' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 6 OR "sort_order" IS 11) | champ sections/cta : sort_order
UPDATE _emdash_fields SET "sort_order" = 11 WHERE slug = 'cta' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 6;
-- champ sections/cta_link (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11BXM3R5GZ6TZJVJ8V', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'cta_link', 'Adresse du bouton principal (vide : la page prévue par le thème)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 12, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'cta_link' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'cta_secondary' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Bouton secondaire' OR "label" IS 'Texte du bouton secondaire') | champ sections/cta_secondary : label
UPDATE _emdash_fields SET "label" = 'Texte du bouton secondaire' WHERE slug = 'cta_secondary' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Bouton secondaire';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'cta_secondary' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 7 OR "sort_order" IS 13) | champ sections/cta_secondary : sort_order
UPDATE _emdash_fields SET "sort_order" = 13 WHERE slug = 'cta_secondary' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 7;
-- champ sections/cta_secondary_link (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11EXM2RJFDHW9AH871', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'cta_secondary_link', 'Adresse du bouton secondaire (vide : la page prévue par le thème)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 14, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'cta_secondary_link' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'note' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Note' OR "label" IS 'Note en petit, sous le bloc') | champ sections/note : label
UPDATE _emdash_fields SET "label" = 'Note en petit, sous le bloc' WHERE slug = 'note' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Note';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'note' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 8 OR "sort_order" IS 15) | champ sections/note : sort_order
UPDATE _emdash_fields SET "sort_order" = 15 WHERE slug = 'note' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 8;
-- champ sections/breadcrumb (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11JRBXGDF9XJC9MXQ2', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'breadcrumb', 'Nom de la page dans le fil d''Ariane, au-dessus du titre', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 16, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'breadcrumb' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'meta_title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Titre pour les moteurs de recherche' OR "label" IS 'Titre de la page dans les résultats de recherche') | champ sections/meta_title : label
UPDATE _emdash_fields SET "label" = 'Titre de la page dans les résultats de recherche' WHERE slug = 'meta_title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Titre pour les moteurs de recherche';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'meta_title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 9 OR "sort_order" IS 17) | champ sections/meta_title : sort_order
UPDATE _emdash_fields SET "sort_order" = 17 WHERE slug = 'meta_title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 9;
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'meta_description' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Description pour les moteurs de recherche' OR "label" IS 'Description de la page dans les résultats de recherche') | champ sections/meta_description : label
UPDATE _emdash_fields SET "label" = 'Description de la page dans les résultats de recherche' WHERE slug = 'meta_description' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Description pour les moteurs de recherche';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'meta_description' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 10 OR "sort_order" IS 18) | champ sections/meta_description : sort_order
UPDATE _emdash_fields SET "sort_order" = 18 WHERE slug = 'meta_description' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 10;
-- champ sections/meta_image (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ11A79SWMTTJ1PYA4TB', (SELECT id FROM _emdash_collections WHERE slug = 'sections'), 'meta_image', 'Image de partage de la page sur les réseaux (vide : celle du site)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 19, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'meta_image' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections'));
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'revised' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("label" IS 'Date de révision (documents légaux)' OR "label" IS 'Date de dernière mise à jour (pages légales)') | champ sections/revised : label
UPDATE _emdash_fields SET "label" = 'Date de dernière mise à jour (pages légales)' WHERE slug = 'revised' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "label" IS 'Date de révision (documents légaux)';
-- garde: SELECT count(*) FROM _emdash_fields WHERE slug = 'revised' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND ("sort_order" IS 11 OR "sort_order" IS 20) | champ sections/revised : sort_order
UPDATE _emdash_fields SET "sort_order" = 20 WHERE slug = 'revised' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sections') AND "sort_order" IS 11;
-- champ sujets/name (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1EJTPW56V75ZY7Y8K1', (SELECT id FROM _emdash_collections WHERE slug = 'sujets'), 'name', 'Nom du sujet', 'string', 'TEXT', 1, 0, NULL, NULL, NULL, NULL, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'name' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sujets'));
-- champ sujets/description (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1EBVB1YA3CHPV4AAZQ', (SELECT id FROM _emdash_collections WHERE slug = 'sujets'), 'description', 'Description, en tête de la page du sujet et sur sa carte', 'text', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'description' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sujets'));
-- champ sujets/color (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1E28QRA3G6KCS5YZ01', (SELECT id FROM _emdash_collections WHERE slug = 'sujets'), 'color', 'Couleur du sujet (vide : le corail du thème)', 'select', 'TEXT', 0, 0, NULL, '{"options":["Corail","Aigue-marine","Encre"]}', NULL, NULL, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'color' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sujets'));
-- champ sujets/order (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1E3XGX8WQQVNG59JAZ', (SELECT id FROM _emdash_collections WHERE slug = 'sujets'), 'order', 'Rang dans les listes (1 en premier)', 'integer', 'INTEGER', 0, 0, NULL, '{"min":0,"max":999}', NULL, NULL, 3, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 1
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'order' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sujets'));
-- champ sujets/image (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1EBQ8A4MY3EM127ST1', (SELECT id FROM _emdash_collections WHERE slug = 'sujets'), 'image', 'Image de partage de la page du sujet sur les réseaux (vide : celle du site)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 4, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'image' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'sujets'));
-- champ auteurs/name (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1TVJSVY62PWHY992ZC', (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'), 'name', 'Nom', 'string', 'TEXT', 1, 0, NULL, NULL, NULL, NULL, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'name' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'));
-- champ auteurs/role (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1T1P020QSDKB2ZPN8G', (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'), 'role', 'Rôle, sous le nom', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'role' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'));
-- champ auteurs/bio (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1TY4CYN0P3N941SWY6', (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'), 'bio', 'Biographie courte', 'text', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'bio' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'));
-- champ auteurs/avatar (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1TJ9BPJJRD3MMFNC8P', (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'), 'avatar', 'Portrait (vide : les initiales)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 3, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'avatar' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'));
-- champ auteurs/links (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ1TY2FPF3BNA2VZRQS1', (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'), 'links', 'Liens ailleurs (site, réseaux), sur sa page', 'repeater', 'JSON', 0, 0, NULL, '{"subFields":[{"slug":"label","label":"Libellé du lien","type":"string"},{"slug":"href","label":"Adresse (https://...)","type":"string"}]}', NULL, NULL, 4, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'links' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'auteurs'));
-- champ pages/title (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ25XW7NBJJEN6A1YQTY', (SELECT id FROM _emdash_collections WHERE slug = 'pages'), 'title', 'Titre de la page', 'string', 'TEXT', 1, 0, NULL, NULL, NULL, NULL, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'pages'));
-- champ pages/lede (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ25RN4HPR17R35YXVKM', (SELECT id FROM _emdash_collections WHERE slug = 'pages'), 'lede', 'Texte d''introduction, sous le titre', 'text', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'lede' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'pages'));
-- champ pages/body (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ25QYV69N058HNRX7Y2', (SELECT id FROM _emdash_collections WHERE slug = 'pages'), 'body', 'Texte de la page', 'portableText', 'JSON', 0, 0, NULL, NULL, NULL, NULL, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'body' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'pages'));
-- champ pages/image (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ25GB9Z85YBHAKEAJV4', (SELECT id FROM _emdash_collections WHERE slug = 'pages'), 'image', 'Photo en haut de la page (vide : pas de photo)', 'image', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 3, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'image' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'pages'));
-- champ site/description (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FH6Y8AZ6F3MA92E9Q', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'description', 'Description du site, reprise par Google et les réseaux quand une page n''a pas la sienne', 'text', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'description' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/og_alt (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FE1GAAE2SYNWXKEK0', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'og_alt', 'Ce que montre l''image de partage, en une phrase, pour les personnes aveugles', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'og_alt' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/email (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FH8Z8M74HBYTSNC3H', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'email', 'Adresse e-mail de contact, dans le pied de page et la page Contact', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'email' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/credit_name (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FVP255N451SWD0EWW', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'credit_name', 'Nom affiché dans le pied de page après « Thème Reef par »', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 3, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'credit_name' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/credit_link (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FFBD0PAEY80QENFJZ', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'credit_link', 'Lien de ce nom (vide : l''adresse e-mail de contact)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 4, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'credit_link' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/feed_title (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2F138AQ632KGEMQAZ9', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'feed_title', 'Titre du flux RSS de cette langue (vide : celui du thème)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 5, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'feed_title' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/form_newsletter (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FBP0YM1F8J3FGMQW2', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'form_newsletter', 'Adresse d''un service externe qui reçoit les inscriptions à la lettre (vide : le formulaire reste une démonstration et n''envoie rien)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 6, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'form_newsletter' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/form_contact (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2F5C6JYKN15EF1DYPW', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'form_contact', 'Adresse d''un service externe qui reçoit les messages de la page Contact, quand l''écran Courriels n''est pas branché (sans l''un ni l''autre, le formulaire n''envoie rien)', 'string', 'TEXT', 0, 0, NULL, NULL, NULL, NULL, 7, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'form_contact' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- champ site/brand_color (nouveau)
INSERT INTO _emdash_fields ("id", "collection_id", "slug", "label", "type", "column_type", "required", "unique", "default_value", "validation", "widget", "options", "sort_order", "created_at", "searchable", "translatable", "indexed")
  SELECT '01M3MSFZ2FGR8ND4FP0GME27RX', (SELECT id FROM _emdash_collections WHERE slug = 'site'), 'brand_color', 'Couleur de la marque, sur tout le site (vide : le corail du thème)', 'select', 'TEXT', 0, 0, NULL, '{"options":["Bleu océan","Bleu nuit","Vert émeraude","Rouge framboise","Orange soleil"]}', NULL, NULL, 8, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 0, 1, 0
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = 'brand_color' AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = 'site'));
-- suivi des medias de la collection sujets (nouvelle)
INSERT INTO _emdash_media_usage_index_status ("adapter_id", "scope_type", "scope_key", "status", "schema_version", "started_at", "completed_at", "cursor", "indexed_source_count", "failed_source_count", "last_error_code", "updated_at", "collection_id", "change_epoch", "reconciliation_required", "last_incremental_success_at", "capture_state")
  SELECT 'content-media', 'collection', 'sujets', 'complete', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '2026-09-28T19:57:29.881Z', NULL, 10, 0, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '01M3MSFZ1ESFRH4NQ4WGKDQ3YR', 20, 0, NULL, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_media_usage_index_status WHERE adapter_id = 'content-media' AND scope_type = 'collection' AND scope_key = 'sujets');
-- suivi des medias de la collection auteurs (nouvelle)
INSERT INTO _emdash_media_usage_index_status ("adapter_id", "scope_type", "scope_key", "status", "schema_version", "started_at", "completed_at", "cursor", "indexed_source_count", "failed_source_count", "last_error_code", "updated_at", "collection_id", "change_epoch", "reconciliation_required", "last_incremental_success_at", "capture_state")
  SELECT 'content-media', 'collection', 'auteurs', 'complete', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '2026-09-28T19:57:29.890Z', NULL, 6, 0, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '01M3MSFZ1T52SSZQBTZ6NE73HE', 12, 0, NULL, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_media_usage_index_status WHERE adapter_id = 'content-media' AND scope_type = 'collection' AND scope_key = 'auteurs');
-- suivi des medias de la collection pages (nouvelle)
INSERT INTO _emdash_media_usage_index_status ("adapter_id", "scope_type", "scope_key", "status", "schema_version", "started_at", "completed_at", "cursor", "indexed_source_count", "failed_source_count", "last_error_code", "updated_at", "collection_id", "change_epoch", "reconciliation_required", "last_incremental_success_at", "capture_state")
  SELECT 'content-media', 'collection', 'pages', 'stale', 1, NULL, NULL, NULL, 0, 0, 'CONTENT_USAGE_STALE', strftime('%Y-%m-%dT%H:%M:%fZ','now'), '01M3MSFZ254NXMZ4476198C8VM', 0, 1, NULL, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_media_usage_index_status WHERE adapter_id = 'content-media' AND scope_type = 'collection' AND scope_key = 'pages');
-- suivi des medias de la collection site (nouvelle)
INSERT INTO _emdash_media_usage_index_status ("adapter_id", "scope_type", "scope_key", "status", "schema_version", "started_at", "completed_at", "cursor", "indexed_source_count", "failed_source_count", "last_error_code", "updated_at", "collection_id", "change_epoch", "reconciliation_required", "last_incremental_success_at", "capture_state")
  SELECT 'content-media', 'collection', 'site', 'complete', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '2026-09-28T19:57:29.866Z', NULL, 2, 0, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), '01M3MSFZ2FQZ814NFFF2RWS77E', 4, 0, NULL, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_media_usage_index_status WHERE adapter_id = 'content-media' AND scope_type = 'collection' AND scope_key = 'site');

-- 3. LES ENTREES NOUVELLES, publiees, avec leur revision en ligne ; la langue source d'abord, la traduction s'y rattache.

-- sections/bande-sujets (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1J7759W5XX10KBZDGX3', 'sections', '01M3MSG1J61JQTN5B0S4JTN4CC', '{"title":"All topics","page":"Accueil"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'bande-sujets' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1J7759W5XX10KBZDGX3');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1J61JQTN5B0S4JTN4CC', 'bande-sujets', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1J7759W5XX10KBZDGX3', 'en', '01M3MSG1J61JQTN5B0S4JTN4CC', 'All topics', 'Accueil', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'bande-sujets' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1J7759W5XX10KBZDGX3' AND entry_id = '01M3MSG1J61JQTN5B0S4JTN4CC');
-- sections/en-tete (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1PQ6A6QCWQ5144F68N7', 'sections', '01M3MSG1PP3QZ4FD51PKEFF20V', '{"title":"Reef Notes, back to the home page","page":"Tout le site","eyebrow":"Home"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'en-tete' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1PQ6A6QCWQ5144F68N7');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1PP3QZ4FD51PKEFF20V', 'en-tete', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1PQ6A6QCWQ5144F68N7', 'en', '01M3MSG1PP3QZ4FD51PKEFF20V', 'Reef Notes, back to the home page', 'Tout le site', NULL, 'Home', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'en-tete' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1PQ6A6QCWQ5144F68N7' AND entry_id = '01M3MSG1PP3QZ4FD51PKEFF20V');
-- sections/introuvable (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1Q1QSEDNV348WESB6XT', 'sections', '01M3MSG1Q0YDZF11T3KZ9ENFWJ', '{"title":"Nothing at this address","page":"Page introuvable","eyebrow":"404","accent":"Nothing","lede":"The link is wrong, or the post moved and we failed to leave a redirect. Neither is your problem. Three ways back, below.","arguments":[{"title":"Search the blog"}],"cta":"Back to the home page","cta_secondary":"Browse all posts","meta_title":"Page not found","meta_description":"There is nothing at this address. The archive and the search box both still work."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'introuvable' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1Q1QSEDNV348WESB6XT');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1Q0YDZF11T3KZ9ENFWJ', 'introuvable', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1Q1QSEDNV348WESB6XT', 'en', '01M3MSG1Q0YDZF11T3KZ9ENFWJ', 'Nothing at this address', 'Page introuvable', NULL, '404', 'Nothing', 'The link is wrong, or the post moved and we failed to leave a redirect. Neither is your problem. Three ways back, below.', NULL, NULL, NULL, NULL, '[{"title":"Search the blog"}]', 'Back to the home page', NULL, 'Browse all posts', NULL, NULL, NULL, 'Page not found', 'There is nothing at this address. The archive and the search box both still work.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'introuvable' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1Q1QSEDNV348WESB6XT' AND entry_id = '01M3MSG1Q0YDZF11T3KZ9ENFWJ');
-- sections/sommaire-legal (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1P2T7P2CKKXX2722GJ8', 'sections', '01M3MSG1P18CABFDXBVBTQSPBB', '{"title":"On this page","page":"Mentions légales","cta":"Back to top","note":"Last updated on {date}"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sommaire-legal' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1P2T7P2CKKXX2722GJ8');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1P18CABFDXBVBTQSPBB', 'sommaire-legal', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1P2T7P2CKKXX2722GJ8', 'en', '01M3MSG1P18CABFDXBVBTQSPBB', 'On this page', 'Mentions légales', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Back to top', NULL, NULL, NULL, 'Last updated on {date}', NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sommaire-legal' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1P2T7P2CKKXX2722GJ8' AND entry_id = '01M3MSG1P18CABFDXBVBTQSPBB');
-- sections/sujet (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1M1PZEC13NGVTF1TSNT', 'sections', '01M3MSG1M0ASW7QGH3ED51W5TF', '{"page":"Page d''un sujet","eyebrow":"Topics","body":"Posts filed under {topic}"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sujet' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1M1PZEC13NGVTF1TSNT');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1M0ASW7QGH3ED51W5TF', 'sujet', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1M1PZEC13NGVTF1TSNT', 'en', '01M3MSG1M0ASW7QGH3ED51W5TF', NULL, 'Page d''un sujet', NULL, 'Topics', NULL, NULL, 'Posts filed under {topic}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sujet' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1M1PZEC13NGVTF1TSNT' AND entry_id = '01M3MSG1M0ASW7QGH3ED51W5TF');
-- sections/bande-sujets (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1JAK3MRT79JBHBCCBV9', 'sections', '01M3MSG1J9YA8AZJ0G3JX9SYBE', '{"title":"Tous les sujets","page":"Accueil"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'bande-sujets' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1JAK3MRT79JBHBCCBV9');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1J9YA8AZJ0G3JX9SYBE', 'bande-sujets', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1JAK3MRT79JBHBCCBV9', 'fr', (SELECT translation_group FROM "ec_sections" WHERE slug = 'bande-sujets' AND locale = 'en'), 'Tous les sujets', 'Accueil', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'bande-sujets' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1JAK3MRT79JBHBCCBV9' AND entry_id = '01M3MSG1J9YA8AZJ0G3JX9SYBE');
-- sections/en-tete (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1PTGNHZABWVVM49HJKW', 'sections', '01M3MSG1PSRJWSETW038VWH4K6', '{"title":"Reef Notes, retour à l''accueil","page":"Tout le site","eyebrow":"Accueil"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'en-tete' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1PTGNHZABWVVM49HJKW');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1PSRJWSETW038VWH4K6', 'en-tete', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1PTGNHZABWVVM49HJKW', 'fr', (SELECT translation_group FROM "ec_sections" WHERE slug = 'en-tete' AND locale = 'en'), 'Reef Notes, retour à l''accueil', 'Tout le site', NULL, 'Accueil', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'en-tete' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1PTGNHZABWVVM49HJKW' AND entry_id = '01M3MSG1PSRJWSETW038VWH4K6');
-- sections/introuvable (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1Q4MPCYZHGTQNRHFZ51', 'sections', '01M3MSG1Q3Q70QVYB6388AC61M', '{"title":"Rien à cette adresse","page":"Page introuvable","eyebrow":"404","accent":"Rien","lede":"Le lien est faux, ou l''article a déménagé sans que nous ayons laissé de redirection. Ni l''un ni l''autre n''est votre problème. Trois chemins de retour, ci-dessous.","arguments":[{"title":"Rechercher dans le blog"}],"cta":"Retour à l''accueil","cta_secondary":"Voir tous les articles","meta_title":"Page introuvable","meta_description":"Il n''y a rien à cette adresse. Les archives et la recherche fonctionnent toujours."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'introuvable' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1Q4MPCYZHGTQNRHFZ51');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1Q3Q70QVYB6388AC61M', 'introuvable', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1Q4MPCYZHGTQNRHFZ51', 'fr', (SELECT translation_group FROM "ec_sections" WHERE slug = 'introuvable' AND locale = 'en'), 'Rien à cette adresse', 'Page introuvable', NULL, '404', 'Rien', 'Le lien est faux, ou l''article a déménagé sans que nous ayons laissé de redirection. Ni l''un ni l''autre n''est votre problème. Trois chemins de retour, ci-dessous.', NULL, NULL, NULL, NULL, '[{"title":"Rechercher dans le blog"}]', 'Retour à l''accueil', NULL, 'Voir tous les articles', NULL, NULL, NULL, 'Page introuvable', 'Il n''y a rien à cette adresse. Les archives et la recherche fonctionnent toujours.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'introuvable' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1Q4MPCYZHGTQNRHFZ51' AND entry_id = '01M3MSG1Q3Q70QVYB6388AC61M');
-- sections/sommaire-legal (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1P43KM9DQCXGRR34W5M', 'sections', '01M3MSG1P37EMKWYYMACMMT2ER', '{"title":"Sur cette page","page":"Mentions légales","cta":"Revenir en haut","note":"Mise à jour le {date}"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sommaire-legal' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1P43KM9DQCXGRR34W5M');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1P37EMKWYYMACMMT2ER', 'sommaire-legal', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1P43KM9DQCXGRR34W5M', 'fr', (SELECT translation_group FROM "ec_sections" WHERE slug = 'sommaire-legal' AND locale = 'en'), 'Sur cette page', 'Mentions légales', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Revenir en haut', NULL, NULL, NULL, 'Mise à jour le {date}', NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sommaire-legal' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1P43KM9DQCXGRR34W5M' AND entry_id = '01M3MSG1P37EMKWYYMACMMT2ER');
-- sections/sujet (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1M3EDRVHXBP20YEDQD9', 'sections', '01M3MSG1M2HNC7SWHHQ0Q05VEZ', '{"page":"Page d''un sujet","eyebrow":"Sujets","body":"Articles classés dans {topic}"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sujet' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1M3EDRVHXBP20YEDQD9');
INSERT INTO "ec_sections" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "title", "page", "hidden", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised")
  SELECT '01M3MSG1M2HNC7SWHHQ0Q05VEZ', 'sujet', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1M3EDRVHXBP20YEDQD9', 'fr', (SELECT translation_group FROM "ec_sections" WHERE slug = 'sujet' AND locale = 'en'), NULL, 'Page d''un sujet', NULL, 'Sujets', NULL, NULL, 'Articles classés dans {topic}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sections" WHERE slug = 'sujet' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1M3EDRVHXBP20YEDQD9' AND entry_id = '01M3MSG1M2HNC7SWHHQ0Q05VEZ');
-- sujets/craft (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1QVS5W7D7T23TQF0CAH', 'sujets', '01M3MSG1QTFY2EDX5HH4JWS63G', '{"name":"Craft","description":"The slow half of the job: naming things well, writing markup that survives the next redesign, choosing the boring solution on purpose. Notes on how a page is actually built, not on how it gets demoed.","color":"Aigue-marine","order":1}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'craft' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1QVS5W7D7T23TQF0CAH');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1QTFY2EDX5HH4JWS63G', 'craft', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1QVS5W7D7T23TQF0CAH', 'en', '01M3MSG1QTFY2EDX5HH4JWS63G', 'Craft', 'The slow half of the job: naming things well, writing markup that survives the next redesign, choosing the boring solution on purpose. Notes on how a page is actually built, not on how it gets demoed.', 'Aigue-marine', 1, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'craft' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1QVS5W7D7T23TQF0CAH' AND entry_id = '01M3MSG1QTFY2EDX5HH4JWS63G');
-- sujets/design (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1R1VHCP8ADBC4S3AXS2', 'sujets', '01M3MSG1R0QWEFNKV326R8SK4M', '{"name":"Design","description":"Interface decisions taken in the open: states before screens, contrast that survives dark mode, motion that carries meaning instead of attention. Design here is a set of constraints, not a mood board.","color":"Aigue-marine","order":4}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'design' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R1VHCP8ADBC4S3AXS2');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1R0QWEFNKV326R8SK4M', 'design', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1R1VHCP8ADBC4S3AXS2', 'en', '01M3MSG1R0QWEFNKV326R8SK4M', 'Design', 'Interface decisions taken in the open: states before screens, contrast that survives dark mode, motion that carries meaning instead of attention. Design here is a set of constraints, not a mood board.', 'Aigue-marine', 4, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'design' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R1VHCP8ADBC4S3AXS2' AND entry_id = '01M3MSG1R0QWEFNKV326R8SK4M');
-- sujets/performance (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1R72WX0GCEMQC8TYAKW', 'sujets', '01M3MSG1R6R5DG7P93F3KWZ7PJ', '{"name":"Performance","description":"Numbers we can defend: budgets agreed before the first commit, what the field data says once real phones show up, and the gap between a good lab score and a page that feels quick. Mostly it is about shipping less.","color":"Corail","order":2}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'performance' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R72WX0GCEMQC8TYAKW');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1R6R5DG7P93F3KWZ7PJ', 'performance', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1R72WX0GCEMQC8TYAKW', 'en', '01M3MSG1R6R5DG7P93F3KWZ7PJ', 'Performance', 'Numbers we can defend: budgets agreed before the first commit, what the field data says once real phones show up, and the gap between a good lab score and a page that feels quick. Mostly it is about shipping less.', 'Corail', 2, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'performance' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R72WX0GCEMQC8TYAKW' AND entry_id = '01M3MSG1R6R5DG7P93F3KWZ7PJ');
-- sujets/studio (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RC2FCSY7Y5GCGGYSDJ', 'sujets', '01M3MSG1RBBSSSEVDN5R5CEDEW', '{"name":"Studio","description":"The business behind the code: writing a brief a client can actually sign, pricing work instead of hours, staying alive between two projects. The part of independent practice nobody puts in a portfolio.","color":"Corail","order":5}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'studio' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RC2FCSY7Y5GCGGYSDJ');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1RBBSSSEVDN5R5CEDEW', 'studio', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RC2FCSY7Y5GCGGYSDJ', 'en', '01M3MSG1RBBSSSEVDN5R5CEDEW', 'Studio', 'The business behind the code: writing a brief a client can actually sign, pricing work instead of hours, staying alive between two projects. The part of independent practice nobody puts in a portfolio.', 'Corail', 5, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'studio' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RC2FCSY7Y5GCGGYSDJ' AND entry_id = '01M3MSG1RBBSSSEVDN5R5CEDEW');
-- sujets/typography (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RGTHR1XGXYJZH8SAZK', 'sujets', '01M3MSG1RF0PKAHFTZD7C2C025', '{"name":"Typography","description":"Type is most of a website, and most of the work is invisible: measure, rhythm, loading strategy, the fallback nobody bothered to design. What we ship, and what it costs in kilobytes.","color":"Encre","order":3}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'typography' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RGTHR1XGXYJZH8SAZK');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1RF0PKAHFTZD7C2C025', 'typography', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RGTHR1XGXYJZH8SAZK', 'en', '01M3MSG1RF0PKAHFTZD7C2C025', 'Typography', 'Type is most of a website, and most of the work is invisible: measure, rhythm, loading strategy, the fallback nobody bothered to design. What we ship, and what it costs in kilobytes.', 'Encre', 3, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'typography' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RGTHR1XGXYJZH8SAZK' AND entry_id = '01M3MSG1RF0PKAHFTZD7C2C025');
-- sujets/craft (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1QZFB6Z5KS5F7DRP3BP', 'sujets', '01M3MSG1QYH0F39YW0FEZ86DM9', '{"name":"Artisanat","description":"La moitié lente du métier : bien nommer les choses, écrire un balisage qui survivra à la prochaine refonte, choisir la solution ennuyeuse en connaissance de cause. Des notes sur la façon dont une page se construit vraiment, pas sur la façon dont on la démontre.","color":"Aigue-marine","order":1}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'craft' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1QZFB6Z5KS5F7DRP3BP');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1QYH0F39YW0FEZ86DM9', 'craft', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1QZFB6Z5KS5F7DRP3BP', 'fr', (SELECT translation_group FROM "ec_sujets" WHERE slug = 'craft' AND locale = 'en'), 'Artisanat', 'La moitié lente du métier : bien nommer les choses, écrire un balisage qui survivra à la prochaine refonte, choisir la solution ennuyeuse en connaissance de cause. Des notes sur la façon dont une page se construit vraiment, pas sur la façon dont on la démontre.', 'Aigue-marine', 1, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'craft' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1QZFB6Z5KS5F7DRP3BP' AND entry_id = '01M3MSG1QYH0F39YW0FEZ86DM9');
-- sujets/design (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1R4Y9C5MHRE9K8ZA4S2', 'sujets', '01M3MSG1R334J5MF2952YWTGSF', '{"name":"Design","description":"Des décisions d''interface prises à voix haute : les états avant les écrans, un contraste qui tient aussi en mode sombre, une animation qui porte du sens plutôt que de l''attention. Ici, le design est une liste de contraintes, pas une planche d''ambiance.","color":"Aigue-marine","order":4}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'design' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R4Y9C5MHRE9K8ZA4S2');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1R334J5MF2952YWTGSF', 'design', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1R4Y9C5MHRE9K8ZA4S2', 'fr', (SELECT translation_group FROM "ec_sujets" WHERE slug = 'design' AND locale = 'en'), 'Design', 'Des décisions d''interface prises à voix haute : les états avant les écrans, un contraste qui tient aussi en mode sombre, une animation qui porte du sens plutôt que de l''attention. Ici, le design est une liste de contraintes, pas une planche d''ambiance.', 'Aigue-marine', 4, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'design' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R4Y9C5MHRE9K8ZA4S2' AND entry_id = '01M3MSG1R334J5MF2952YWTGSF');
-- sujets/performance (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1R9MV7XDBQ094D251V2', 'sujets', '01M3MSG1R8EQZBPGGH2M4VA42R', '{"name":"Performance","description":"Des chiffres qu''on peut défendre : des budgets posés avant le premier commit, ce que racontent les données de terrain quand les vrais téléphones arrivent, et l''écart entre un bon score en laboratoire et une page qui paraît rapide. Au fond, il s''agit surtout d''en livrer moins.","color":"Corail","order":2}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'performance' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R9MV7XDBQ094D251V2');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1R8EQZBPGGH2M4VA42R', 'performance', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1R9MV7XDBQ094D251V2', 'fr', (SELECT translation_group FROM "ec_sujets" WHERE slug = 'performance' AND locale = 'en'), 'Performance', 'Des chiffres qu''on peut défendre : des budgets posés avant le premier commit, ce que racontent les données de terrain quand les vrais téléphones arrivent, et l''écart entre un bon score en laboratoire et une page qui paraît rapide. Au fond, il s''agit surtout d''en livrer moins.', 'Corail', 2, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'performance' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1R9MV7XDBQ094D251V2' AND entry_id = '01M3MSG1R8EQZBPGGH2M4VA42R');
-- sujets/studio (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RE6Q2FFP85PQCXVX4R', 'sujets', '01M3MSG1RDJBD4A55E82JY57Y6', '{"name":"Studio","description":"Le métier derrière le code : rédiger un cahier des charges qu''un client peut vraiment signer, facturer un travail plutôt que des heures, tenir entre deux projets. La partie du travail indépendant que personne ne met dans son portfolio.","color":"Corail","order":5}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'studio' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RE6Q2FFP85PQCXVX4R');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1RDJBD4A55E82JY57Y6', 'studio', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RE6Q2FFP85PQCXVX4R', 'fr', (SELECT translation_group FROM "ec_sujets" WHERE slug = 'studio' AND locale = 'en'), 'Studio', 'Le métier derrière le code : rédiger un cahier des charges qu''un client peut vraiment signer, facturer un travail plutôt que des heures, tenir entre deux projets. La partie du travail indépendant que personne ne met dans son portfolio.', 'Corail', 5, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'studio' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RE6Q2FFP85PQCXVX4R' AND entry_id = '01M3MSG1RDJBD4A55E82JY57Y6');
-- sujets/typography (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RKG343Z85PAT9M3XPW', 'sujets', '01M3MSG1RJ7BAJP2VDRYB0E1NQ', '{"name":"Typographie","description":"La typographie, c''est l''essentiel d''un site, et l''essentiel du travail ne se voit pas : la longueur de ligne, le rythme vertical, la stratégie de chargement, la police de secours que personne n''a pris la peine de dessiner. Ce qu''on livre, et ce que ça coûte en kilo-octets.","color":"Encre","order":3}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'typography' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RKG343Z85PAT9M3XPW');
INSERT INTO "ec_sujets" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "description", "color", "order", "image")
  SELECT '01M3MSG1RJ7BAJP2VDRYB0E1NQ', 'typography', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RKG343Z85PAT9M3XPW', 'fr', (SELECT translation_group FROM "ec_sujets" WHERE slug = 'typography' AND locale = 'en'), 'Typographie', 'La typographie, c''est l''essentiel d''un site, et l''essentiel du travail ne se voit pas : la longueur de ligne, le rythme vertical, la stratégie de chargement, la police de secours que personne n''a pris la peine de dessiner. Ce qu''on livre, et ce que ça coûte en kilo-octets.', 'Encre', 3, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_sujets" WHERE slug = 'typography' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RKG343Z85PAT9M3XPW' AND entry_id = '01M3MSG1RJ7BAJP2VDRYB0E1NQ');
-- auteurs/mara-lindqvist (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RPZQK0PZ5C436XTSVR', 'auteurs', '01M3MSG1RN7ZD81NB7R9QFZ0RS', '{"name":"Mara Lindqvist","role":"Founder and web developer","bio":"Mara opened the studio in 2016 after eight years in agencies, and still writes most of the HTML that ships. She is happiest on the boring parts of a project: naming, data modelling, and the contract clause nobody wants to read."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'mara-lindqvist' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RPZQK0PZ5C436XTSVR');
INSERT INTO "ec_auteurs" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "role", "bio", "avatar", "links")
  SELECT '01M3MSG1RN7ZD81NB7R9QFZ0RS', 'mara-lindqvist', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RPZQK0PZ5C436XTSVR', 'en', '01M3MSG1RN7ZD81NB7R9QFZ0RS', 'Mara Lindqvist', 'Founder and web developer', 'Mara opened the studio in 2016 after eight years in agencies, and still writes most of the HTML that ships. She is happiest on the boring parts of a project: naming, data modelling, and the contract clause nobody wants to read.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'mara-lindqvist' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RPZQK0PZ5C436XTSVR' AND entry_id = '01M3MSG1RN7ZD81NB7R9QFZ0RS');
-- auteurs/noor-benali (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RVSQYR1HZWMDCFEVVD', 'auteurs', '01M3MSG1RT5C735SVYH5TBWZTA', '{"name":"Noor Benali","role":"Performance engineer","bio":"Noor joined from a retail platform where a hundred milliseconds had a price tag attached, and brought the habit of measuring before arguing. She owns the studio''s field data pipeline and the uncomfortable meeting where we show clients what their site does on a five year old phone."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'noor-benali' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RVSQYR1HZWMDCFEVVD');
INSERT INTO "ec_auteurs" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "role", "bio", "avatar", "links")
  SELECT '01M3MSG1RT5C735SVYH5TBWZTA', 'noor-benali', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RVSQYR1HZWMDCFEVVD', 'en', '01M3MSG1RT5C735SVYH5TBWZTA', 'Noor Benali', 'Performance engineer', 'Noor joined from a retail platform where a hundred milliseconds had a price tag attached, and brought the habit of measuring before arguing. She owns the studio''s field data pipeline and the uncomfortable meeting where we show clients what their site does on a five year old phone.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'noor-benali' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RVSQYR1HZWMDCFEVVD' AND entry_id = '01M3MSG1RT5C735SVYH5TBWZTA');
-- auteurs/tomas-abaroa (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1S017BCHWD3J87X4APD', 'auteurs', '01M3MSG1RZH8J9QMAQ2G82SMWS', '{"name":"Tomas Abaroa","role":"Interface designer","bio":"Tomas designs in the browser, which is a polite way of saying he redraws his own comps three times before anyone sees them. He runs the studio''s type and colour decisions, and keeps a spreadsheet of every contrast ratio we have ever argued about."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'tomas-abaroa' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1S017BCHWD3J87X4APD');
INSERT INTO "ec_auteurs" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "role", "bio", "avatar", "links")
  SELECT '01M3MSG1RZH8J9QMAQ2G82SMWS', 'tomas-abaroa', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1S017BCHWD3J87X4APD', 'en', '01M3MSG1RZH8J9QMAQ2G82SMWS', 'Tomas Abaroa', 'Interface designer', 'Tomas designs in the browser, which is a polite way of saying he redraws his own comps three times before anyone sees them. He runs the studio''s type and colour decisions, and keeps a spreadsheet of every contrast ratio we have ever argued about.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'tomas-abaroa' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1S017BCHWD3J87X4APD' AND entry_id = '01M3MSG1RZH8J9QMAQ2G82SMWS');
-- auteurs/mara-lindqvist (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RSD2ZETK0EXPM41XMJ', 'auteurs', '01M3MSG1RR83S8S2HMKVN286PB', '{"name":"Mara Lindqvist","role":"Fondatrice et développeuse web","bio":"Mara a ouvert le studio en 2016, après huit ans passés en agence, et écrit encore la majeure partie du HTML qui part en production. Ce sont les parties ingrates d''un projet qui l''intéressent : le nommage, la modélisation des données et la clause de contrat que personne n''a envie de lire."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'mara-lindqvist' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RSD2ZETK0EXPM41XMJ');
INSERT INTO "ec_auteurs" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "role", "bio", "avatar", "links")
  SELECT '01M3MSG1RR83S8S2HMKVN286PB', 'mara-lindqvist', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RSD2ZETK0EXPM41XMJ', 'fr', (SELECT translation_group FROM "ec_auteurs" WHERE slug = 'mara-lindqvist' AND locale = 'en'), 'Mara Lindqvist', 'Fondatrice et développeuse web', 'Mara a ouvert le studio en 2016, après huit ans passés en agence, et écrit encore la majeure partie du HTML qui part en production. Ce sont les parties ingrates d''un projet qui l''intéressent : le nommage, la modélisation des données et la clause de contrat que personne n''a envie de lire.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'mara-lindqvist' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RSD2ZETK0EXPM41XMJ' AND entry_id = '01M3MSG1RR83S8S2HMKVN286PB');
-- auteurs/noor-benali (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1RYA1HWX9BZ4BW5X5DX', 'auteurs', '01M3MSG1RX5H0XTMPE5C673E3J', '{"name":"Noor Benali","role":"Ingénieure performance","bio":"Noor vient d''une plateforme de commerce en ligne où cent millisecondes avaient une valeur chiffrée, et elle en a gardé l''habitude de mesurer avant de discuter. Elle s''occupe de la collecte des données de terrain du studio et de la réunion inconfortable où l''on montre au client ce que donne son site sur un téléphone de cinq ans d''âge."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'noor-benali' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RYA1HWX9BZ4BW5X5DX');
INSERT INTO "ec_auteurs" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "role", "bio", "avatar", "links")
  SELECT '01M3MSG1RX5H0XTMPE5C673E3J', 'noor-benali', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1RYA1HWX9BZ4BW5X5DX', 'fr', (SELECT translation_group FROM "ec_auteurs" WHERE slug = 'noor-benali' AND locale = 'en'), 'Noor Benali', 'Ingénieure performance', 'Noor vient d''une plateforme de commerce en ligne où cent millisecondes avaient une valeur chiffrée, et elle en a gardé l''habitude de mesurer avant de discuter. Elle s''occupe de la collecte des données de terrain du studio et de la réunion inconfortable où l''on montre au client ce que donne son site sur un téléphone de cinq ans d''âge.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'noor-benali' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1RYA1HWX9BZ4BW5X5DX' AND entry_id = '01M3MSG1RX5H0XTMPE5C673E3J');
-- auteurs/tomas-abaroa (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1S37C3WRA1P9EM1KJ0N', 'auteurs', '01M3MSG1S2BHRR209A725AZEF1', '{"name":"Tomas Abaroa","role":"Designer d''interface","bio":"Tomas dessine directement dans le navigateur, ce qui est une façon polie de dire qu''il refait ses propres maquettes trois fois avant de les montrer. Il tranche les questions de typographie et de couleur du studio, et tient à jour un tableau de tous les rapports de contraste sur lesquels nous nous sommes disputés."}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'tomas-abaroa' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1S37C3WRA1P9EM1KJ0N');
INSERT INTO "ec_auteurs" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "name", "role", "bio", "avatar", "links")
  SELECT '01M3MSG1S2BHRR209A725AZEF1', 'tomas-abaroa', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1S37C3WRA1P9EM1KJ0N', 'fr', (SELECT translation_group FROM "ec_auteurs" WHERE slug = 'tomas-abaroa' AND locale = 'en'), 'Tomas Abaroa', 'Designer d''interface', 'Tomas dessine directement dans le navigateur, ce qui est une façon polie de dire qu''il refait ses propres maquettes trois fois avant de les montrer. Il tranche les questions de typographie et de couleur du studio, et tient à jour un tableau de tous les rapports de contraste sur lesquels nous nous sommes disputés.', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_auteurs" WHERE slug = 'tomas-abaroa' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1S37C3WRA1P9EM1KJ0N' AND entry_id = '01M3MSG1S2BHRR209A725AZEF1');
-- site/site (en)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1Q8S1NPSH1FZZDV0JME', 'site', '01M3MSG1Q63NW4GSDQVRXSZ79S', '{"description":"A free Astro 7 blog theme built for reading: an editorial home, a post page tuned for eight minutes of attention, topic archives, author pages, client-side search, and a bilingual layer that costs one line per language.","og_alt":"Looking through the barrel of a turquoise wave at a sandy shore","email":"hello@example.com","credit_name":"Example Studio","feed_title":"Reef - the Astro theme for people who write"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_site" WHERE slug = 'site' AND locale = 'en') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1Q8S1NPSH1FZZDV0JME');
INSERT INTO "ec_site" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "description", "og_alt", "email", "credit_name", "credit_link", "feed_title", "form_newsletter", "form_contact", "brand_color")
  SELECT '01M3MSG1Q63NW4GSDQVRXSZ79S', 'site', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1Q8S1NPSH1FZZDV0JME', 'en', '01M3MSG1Q63NW4GSDQVRXSZ79S', 'A free Astro 7 blog theme built for reading: an editorial home, a post page tuned for eight minutes of attention, topic archives, author pages, client-side search, and a bilingual layer that costs one line per language.', 'Looking through the barrel of a turquoise wave at a sandy shore', 'hello@example.com', 'Example Studio', NULL, 'Reef - the Astro theme for people who write', NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_site" WHERE slug = 'site' AND locale = 'en') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1Q8S1NPSH1FZZDV0JME' AND entry_id = '01M3MSG1Q63NW4GSDQVRXSZ79S');
-- site/site (fr)
INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)
  SELECT '01M3MSG1QSWFVEG5JRTX5ZRBXZ', 'site', '01M3MSG1QQ2DPPRJ9VA7JWFXVP', '{"description":"Journaux de chantier, temps de chargement, typographie et gestion d''un petit studio web. En français et en anglais, quelques notes par mois, écrites par les trois personnes qui font le travail.","og_alt":"Vue à travers le tube d''une vague turquoise, vers une plage de sable","email":"hello@example.com","credit_name":"Example Studio","feed_title":"Reef, le thème Astro pour celles et ceux qui écrivent"}', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE NOT EXISTS (SELECT 1 FROM "ec_site" WHERE slug = 'site' AND locale = 'fr') AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1QSWFVEG5JRTX5ZRBXZ');
INSERT INTO "ec_site" ("id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "scheduled_at", "version", "live_revision_id", "locale", "translation_group", "description", "og_alt", "email", "credit_name", "credit_link", "feed_title", "form_newsletter", "form_contact", "brand_color")
  SELECT '01M3MSG1QQ2DPPRJ9VA7JWFXVP', 'site', 'published', (SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, 2, '01M3MSG1QSWFVEG5JRTX5ZRBXZ', 'fr', (SELECT translation_group FROM "ec_site" WHERE slug = 'site' AND locale = 'en'), 'Journaux de chantier, temps de chargement, typographie et gestion d''un petit studio web. En français et en anglais, quelques notes par mois, écrites par les trois personnes qui font le travail.', 'Vue à travers le tube d''une vague turquoise, vers une plage de sable', 'hello@example.com', 'Example Studio', NULL, 'Reef, le thème Astro pour celles et ceux qui écrivent', NULL, NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM "ec_site" WHERE slug = 'site' AND locale = 'fr') AND EXISTS (SELECT 1 FROM revisions WHERE id = '01M3MSG1QSWFVEG5JRTX5ZRBXZ' AND entry_id = '01M3MSG1QQ2DPPRJ9VA7JWFXVP');

-- 4. LES ENTREES EXISTANTES : chaque valeur nouvelle, sur la ligne et sur sa revision en ligne, seulement si la valeur est encore celle de depart.

-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-la-une' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/a-la-une (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'a-la-une' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-la-une' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-la-une' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-lire-ensuite' AND locale = 'en' AND ("page" IS 'billet' OR "page" IS 'Billet') | sections/a-lire-ensuite (en) : page
UPDATE "ec_sections" SET "page" = 'Billet' WHERE slug = 'a-lire-ensuite' AND locale = 'en' AND "page" IS 'billet';
UPDATE revisions SET data = json_set(data, '$.page', 'Billet')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-lire-ensuite' AND locale = 'en') AND json_extract(data, '$.page') IS 'billet' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-lire-ensuite' AND locale = 'en') IS 'Billet';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'en' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos (en) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos' AND locale = 'en' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'en') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'en') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'About the studio') | sections/a-propos (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'About the studio' WHERE slug = 'a-propos' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'About the studio')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'en') IS 'About the studio';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-appel' AND locale = 'en' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-appel (en) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-appel' AND locale = 'en' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-appel' AND locale = 'en') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-appel' AND locale = 'en') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-histoire' AND locale = 'en' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-histoire (en) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-histoire' AND locale = 'en' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-histoire' AND locale = 'en') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-histoire' AND locale = 'en') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-regles' AND locale = 'en' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-regles (en) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-regles' AND locale = 'en' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-regles' AND locale = 'en') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-regles' AND locale = 'en') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-signatures' AND locale = 'en' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-signatures (en) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-signatures' AND locale = 'en' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-signatures' AND locale = 'en') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-signatures' AND locale = 'en') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'archives' AND locale = 'en' AND ("page" IS 'blog' OR "page" IS 'Tous les billets') | sections/archives (en) : page
UPDATE "ec_sections" SET "page" = 'Tous les billets' WHERE slug = 'archives' AND locale = 'en' AND "page" IS 'blog';
UPDATE revisions SET data = json_set(data, '$.page', 'Tous les billets')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'archives' AND locale = 'en') AND json_extract(data, '$.page') IS 'blog' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'archives' AND locale = 'en') IS 'Tous les billets';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'archives' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'All posts') | sections/archives (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'All posts' WHERE slug = 'archives' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'All posts')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'archives' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'archives' AND locale = 'en') IS 'All posts';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'en' AND ("page" IS 'auteurs' OR "page" IS 'Auteurs') | sections/auteurs (en) : page
UPDATE "ec_sections" SET "page" = 'Auteurs' WHERE slug = 'auteurs' AND locale = 'en' AND "page" IS 'auteurs';
UPDATE revisions SET data = json_set(data, '$.page', 'Auteurs')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'en') AND json_extract(data, '$.page') IS 'auteurs' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'en') IS 'Auteurs';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Authors') | sections/auteurs (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Authors' WHERE slug = 'auteurs' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Authors')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'en') IS 'Authors';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en' AND ("page" IS 'conditions' OR "page" IS 'Conditions') | sections/conditions (en) : page
UPDATE "ec_sections" SET "page" = 'Conditions' WHERE slug = 'conditions' AND locale = 'en' AND "page" IS 'conditions';
UPDATE revisions SET data = json_set(data, '$.page', 'Conditions')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en') AND json_extract(data, '$.page') IS 'conditions' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en') IS 'Conditions';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en' AND ("eyebrow" IS NULL OR "eyebrow" IS 'Legal') | sections/conditions (en) : eyebrow
UPDATE "ec_sections" SET "eyebrow" = 'Legal' WHERE slug = 'conditions' AND locale = 'en' AND "eyebrow" IS NULL;
UPDATE revisions SET data = json_set(data, '$.eyebrow', 'Legal')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en') AND json_extract(data, '$.eyebrow') IS NULL AND (SELECT "eyebrow" FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en') IS 'Legal';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Terms of use') | sections/conditions (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Terms of use' WHERE slug = 'conditions' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Terms of use')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'en') IS 'Terms of use';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en' AND ("page" IS 'confidentialite' OR "page" IS 'Confidentialité') | sections/confidentialite (en) : page
UPDATE "ec_sections" SET "page" = 'Confidentialité' WHERE slug = 'confidentialite' AND locale = 'en' AND "page" IS 'confidentialite';
UPDATE revisions SET data = json_set(data, '$.page', 'Confidentialité')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en') AND json_extract(data, '$.page') IS 'confidentialite' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en') IS 'Confidentialité';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en' AND ("eyebrow" IS NULL OR "eyebrow" IS 'Legal') | sections/confidentialite (en) : eyebrow
UPDATE "ec_sections" SET "eyebrow" = 'Legal' WHERE slug = 'confidentialite' AND locale = 'en' AND "eyebrow" IS NULL;
UPDATE revisions SET data = json_set(data, '$.eyebrow', 'Legal')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en') AND json_extract(data, '$.eyebrow') IS NULL AND (SELECT "eyebrow" FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en') IS 'Legal';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Privacy policy') | sections/confidentialite (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Privacy policy' WHERE slug = 'confidentialite' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Privacy policy')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'en') IS 'Privacy policy';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact' AND locale = 'en' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact (en) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact' AND locale = 'en' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact' AND locale = 'en') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact' AND locale = 'en') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Contact') | sections/contact (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Contact' WHERE slug = 'contact' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'contact' AND locale = 'en') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact-direct' AND locale = 'en' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact-direct (en) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact-direct' AND locale = 'en' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact-direct' AND locale = 'en') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact-direct' AND locale = 'en') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact-formulaire' AND locale = 'en' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact-formulaire (en) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact-formulaire' AND locale = 'en' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact-formulaire' AND locale = 'en') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact-formulaire' AND locale = 'en') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact-suite' AND locale = 'en' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact-suite (en) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact-suite' AND locale = 'en' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact-suite' AND locale = 'en') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact-suite' AND locale = 'en') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'dernieres-notes' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/dernieres-notes (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'dernieres-notes' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'dernieres-notes' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'dernieres-notes' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'hero' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/hero (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'hero' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'hero' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'hero' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'lettre' AND locale = 'en' AND ("page" IS 'toutes' OR "page" IS 'Tout le site') | sections/lettre (en) : page
UPDATE "ec_sections" SET "page" = 'Tout le site' WHERE slug = 'lettre' AND locale = 'en' AND "page" IS 'toutes';
UPDATE revisions SET data = json_set(data, '$.page', 'Tout le site')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'lettre' AND locale = 'en') AND json_extract(data, '$.page') IS 'toutes' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'lettre' AND locale = 'en') IS 'Tout le site';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'lettre-flux' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/lettre-flux (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'lettre-flux' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'lettre-flux' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'lettre-flux' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en' AND ("page" IS 'mentions-legales' OR "page" IS 'Mentions légales') | sections/mentions-legales (en) : page
UPDATE "ec_sections" SET "page" = 'Mentions légales' WHERE slug = 'mentions-legales' AND locale = 'en' AND "page" IS 'mentions-legales';
UPDATE revisions SET data = json_set(data, '$.page', 'Mentions légales')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en') AND json_extract(data, '$.page') IS 'mentions-legales' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en') IS 'Mentions légales';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Legal notice') | sections/mentions-legales (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Legal notice' WHERE slug = 'mentions-legales' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Legal notice')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en') IS 'Legal notice';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en' AND ("revised" IS NULL OR "revised" IS '2026-09-24T00:00:00.000Z') | sections/mentions-legales (en) : revised
UPDATE "ec_sections" SET "revised" = '2026-09-24T00:00:00.000Z' WHERE slug = 'mentions-legales' AND locale = 'en' AND "revised" IS NULL;
UPDATE revisions SET data = json_set(data, '$.revised', '2026-09-24T00:00:00.000Z')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en') AND json_extract(data, '$.revised') IS NULL AND (SELECT "revised" FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'en') IS '2026-09-24T00:00:00.000Z';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en' AND ("page" IS 'toutes' OR "page" IS 'Tout le site') | sections/pied-de-page (en) : page
UPDATE "ec_sections" SET "page" = 'Tout le site' WHERE slug = 'pied-de-page' AND locale = 'en' AND "page" IS 'toutes';
UPDATE revisions SET data = json_set(data, '$.page', 'Tout le site')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') AND json_extract(data, '$.page') IS 'toutes' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') IS 'Tout le site';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en' AND ("body" IS NULL OR "body" IS 'Built with Astro, set in Space Grotesk and Instrument Sans.') | sections/pied-de-page (en) : body
UPDATE "ec_sections" SET "body" = 'Built with Astro, set in Space Grotesk and Instrument Sans.' WHERE slug = 'pied-de-page' AND locale = 'en' AND "body" IS NULL;
UPDATE revisions SET data = json_set(data, '$.body', 'Built with Astro, set in Space Grotesk and Instrument Sans.')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') AND json_extract(data, '$.body') IS NULL AND (SELECT "body" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') IS 'Built with Astro, set in Space Grotesk and Instrument Sans.';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en' AND ("cta" IS NULL OR "cta" IS 'Reef theme by') | sections/pied-de-page (en) : cta
UPDATE "ec_sections" SET "cta" = 'Reef theme by' WHERE slug = 'pied-de-page' AND locale = 'en' AND "cta" IS NULL;
UPDATE revisions SET data = json_set(data, '$.cta', 'Reef theme by')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') AND json_extract(data, '$.cta') IS NULL AND (SELECT "cta" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') IS 'Reef theme by';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en' AND ("cta_secondary" IS NULL OR "cta_secondary" IS 'Back to top') | sections/pied-de-page (en) : cta_secondary
UPDATE "ec_sections" SET "cta_secondary" = 'Back to top' WHERE slug = 'pied-de-page' AND locale = 'en' AND "cta_secondary" IS NULL;
UPDATE revisions SET data = json_set(data, '$.cta_secondary', 'Back to top')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') AND json_extract(data, '$.cta_secondary') IS NULL AND (SELECT "cta_secondary" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') IS 'Back to top';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en' AND ("note" IS NULL OR "note" IS 'All rights reserved.') | sections/pied-de-page (en) : note
UPDATE "ec_sections" SET "note" = 'All rights reserved.' WHERE slug = 'pied-de-page' AND locale = 'en' AND "note" IS NULL;
UPDATE revisions SET data = json_set(data, '$.note', 'All rights reserved.')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') AND json_extract(data, '$.note') IS NULL AND (SELECT "note" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'en') IS 'All rights reserved.';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'en' AND ("page" IS 'recherche' OR "page" IS 'Recherche') | sections/recherche (en) : page
UPDATE "ec_sections" SET "page" = 'Recherche' WHERE slug = 'recherche' AND locale = 'en' AND "page" IS 'recherche';
UPDATE revisions SET data = json_set(data, '$.page', 'Recherche')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'en') AND json_extract(data, '$.page') IS 'recherche' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'en') IS 'Recherche';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Search') | sections/recherche (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Search' WHERE slug = 'recherche' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Search')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'en') IS 'Search';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'en' AND ("page" IS 'rubriques' OR "page" IS 'Sujets') | sections/rubriques (en) : page
UPDATE "ec_sections" SET "page" = 'Sujets' WHERE slug = 'rubriques' AND locale = 'en' AND "page" IS 'rubriques';
UPDATE revisions SET data = json_set(data, '$.page', 'Sujets')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'en') AND json_extract(data, '$.page') IS 'rubriques' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'en') IS 'Sujets';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'en' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Topics') | sections/rubriques (en) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Topics' WHERE slug = 'rubriques' AND locale = 'en' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Topics')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'en') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'en') IS 'Topics';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'signatures' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/signatures (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'signatures' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'signatures' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'signatures' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/studio (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'studio' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en' AND ("eyebrow" IS NULL OR "eyebrow" IS 'About') | sections/studio (en) : eyebrow
UPDATE "ec_sections" SET "eyebrow" = 'About' WHERE slug = 'studio' AND locale = 'en' AND "eyebrow" IS NULL;
UPDATE revisions SET data = json_set(data, '$.eyebrow', 'About')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en') AND json_extract(data, '$.eyebrow') IS NULL AND (SELECT "eyebrow" FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en') IS 'About';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en' AND ("cta_secondary" IS NULL OR "cta_secondary" IS 'Contact') | sections/studio (en) : cta_secondary
UPDATE "ec_sections" SET "cta_secondary" = 'Contact' WHERE slug = 'studio' AND locale = 'en' AND "cta_secondary" IS NULL;
UPDATE revisions SET data = json_set(data, '$.cta_secondary', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en') AND json_extract(data, '$.cta_secondary') IS NULL AND (SELECT "cta_secondary" FROM "ec_sections" WHERE slug = 'studio' AND locale = 'en') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'sujets' AND locale = 'en' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/sujets (en) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'sujets' AND locale = 'en' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'sujets' AND locale = 'en') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'sujets' AND locale = 'en') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-la-une' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/a-la-une (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'a-la-une' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-la-une' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-la-une' AND locale = 'fr') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-lire-ensuite' AND locale = 'fr' AND ("page" IS 'billet' OR "page" IS 'Billet') | sections/a-lire-ensuite (fr) : page
UPDATE "ec_sections" SET "page" = 'Billet' WHERE slug = 'a-lire-ensuite' AND locale = 'fr' AND "page" IS 'billet';
UPDATE revisions SET data = json_set(data, '$.page', 'Billet')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-lire-ensuite' AND locale = 'fr') AND json_extract(data, '$.page') IS 'billet' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-lire-ensuite' AND locale = 'fr') IS 'Billet';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'fr' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos (fr) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos' AND locale = 'fr' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'fr') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'fr') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'À propos du studio') | sections/a-propos (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'À propos du studio' WHERE slug = 'a-propos' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'À propos du studio')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'a-propos' AND locale = 'fr') IS 'À propos du studio';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-appel' AND locale = 'fr' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-appel (fr) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-appel' AND locale = 'fr' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-appel' AND locale = 'fr') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-appel' AND locale = 'fr') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-histoire' AND locale = 'fr' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-histoire (fr) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-histoire' AND locale = 'fr' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-histoire' AND locale = 'fr') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-histoire' AND locale = 'fr') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-regles' AND locale = 'fr' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-regles (fr) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-regles' AND locale = 'fr' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-regles' AND locale = 'fr') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-regles' AND locale = 'fr') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'a-propos-signatures' AND locale = 'fr' AND ("page" IS 'a-propos' OR "page" IS 'À propos') | sections/a-propos-signatures (fr) : page
UPDATE "ec_sections" SET "page" = 'À propos' WHERE slug = 'a-propos-signatures' AND locale = 'fr' AND "page" IS 'a-propos';
UPDATE revisions SET data = json_set(data, '$.page', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'a-propos-signatures' AND locale = 'fr') AND json_extract(data, '$.page') IS 'a-propos' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'a-propos-signatures' AND locale = 'fr') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'archives' AND locale = 'fr' AND ("page" IS 'blog' OR "page" IS 'Tous les billets') | sections/archives (fr) : page
UPDATE "ec_sections" SET "page" = 'Tous les billets' WHERE slug = 'archives' AND locale = 'fr' AND "page" IS 'blog';
UPDATE revisions SET data = json_set(data, '$.page', 'Tous les billets')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'archives' AND locale = 'fr') AND json_extract(data, '$.page') IS 'blog' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'archives' AND locale = 'fr') IS 'Tous les billets';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'archives' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Tous les articles') | sections/archives (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Tous les articles' WHERE slug = 'archives' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Tous les articles')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'archives' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'archives' AND locale = 'fr') IS 'Tous les articles';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'fr' AND ("page" IS 'auteurs' OR "page" IS 'Auteurs') | sections/auteurs (fr) : page
UPDATE "ec_sections" SET "page" = 'Auteurs' WHERE slug = 'auteurs' AND locale = 'fr' AND "page" IS 'auteurs';
UPDATE revisions SET data = json_set(data, '$.page', 'Auteurs')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'fr') AND json_extract(data, '$.page') IS 'auteurs' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'fr') IS 'Auteurs';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Auteurs') | sections/auteurs (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Auteurs' WHERE slug = 'auteurs' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Auteurs')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'auteurs' AND locale = 'fr') IS 'Auteurs';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr' AND ("page" IS 'conditions' OR "page" IS 'Conditions') | sections/conditions (fr) : page
UPDATE "ec_sections" SET "page" = 'Conditions' WHERE slug = 'conditions' AND locale = 'fr' AND "page" IS 'conditions';
UPDATE revisions SET data = json_set(data, '$.page', 'Conditions')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr') AND json_extract(data, '$.page') IS 'conditions' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr') IS 'Conditions';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr' AND ("eyebrow" IS NULL OR "eyebrow" IS 'Légal') | sections/conditions (fr) : eyebrow
UPDATE "ec_sections" SET "eyebrow" = 'Légal' WHERE slug = 'conditions' AND locale = 'fr' AND "eyebrow" IS NULL;
UPDATE revisions SET data = json_set(data, '$.eyebrow', 'Légal')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr') AND json_extract(data, '$.eyebrow') IS NULL AND (SELECT "eyebrow" FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr') IS 'Légal';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Conditions d''utilisation') | sections/conditions (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Conditions d''utilisation' WHERE slug = 'conditions' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Conditions d''utilisation')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'conditions' AND locale = 'fr') IS 'Conditions d''utilisation';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr' AND ("page" IS 'confidentialite' OR "page" IS 'Confidentialité') | sections/confidentialite (fr) : page
UPDATE "ec_sections" SET "page" = 'Confidentialité' WHERE slug = 'confidentialite' AND locale = 'fr' AND "page" IS 'confidentialite';
UPDATE revisions SET data = json_set(data, '$.page', 'Confidentialité')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr') AND json_extract(data, '$.page') IS 'confidentialite' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr') IS 'Confidentialité';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr' AND ("eyebrow" IS NULL OR "eyebrow" IS 'Légal') | sections/confidentialite (fr) : eyebrow
UPDATE "ec_sections" SET "eyebrow" = 'Légal' WHERE slug = 'confidentialite' AND locale = 'fr' AND "eyebrow" IS NULL;
UPDATE revisions SET data = json_set(data, '$.eyebrow', 'Légal')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr') AND json_extract(data, '$.eyebrow') IS NULL AND (SELECT "eyebrow" FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr') IS 'Légal';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Politique de confidentialité') | sections/confidentialite (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Politique de confidentialité' WHERE slug = 'confidentialite' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Politique de confidentialité')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'confidentialite' AND locale = 'fr') IS 'Politique de confidentialité';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact' AND locale = 'fr' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact (fr) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact' AND locale = 'fr' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact' AND locale = 'fr') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact' AND locale = 'fr') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Contact') | sections/contact (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Contact' WHERE slug = 'contact' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'contact' AND locale = 'fr') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact-direct' AND locale = 'fr' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact-direct (fr) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact-direct' AND locale = 'fr' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact-direct' AND locale = 'fr') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact-direct' AND locale = 'fr') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact-formulaire' AND locale = 'fr' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact-formulaire (fr) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact-formulaire' AND locale = 'fr' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact-formulaire' AND locale = 'fr') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact-formulaire' AND locale = 'fr') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'contact-suite' AND locale = 'fr' AND ("page" IS 'contact' OR "page" IS 'Contact') | sections/contact-suite (fr) : page
UPDATE "ec_sections" SET "page" = 'Contact' WHERE slug = 'contact-suite' AND locale = 'fr' AND "page" IS 'contact';
UPDATE revisions SET data = json_set(data, '$.page', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'contact-suite' AND locale = 'fr') AND json_extract(data, '$.page') IS 'contact' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'contact-suite' AND locale = 'fr') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'dernieres-notes' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/dernieres-notes (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'dernieres-notes' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'dernieres-notes' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'dernieres-notes' AND locale = 'fr') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'hero' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/hero (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'hero' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'hero' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'hero' AND locale = 'fr') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'lettre' AND locale = 'fr' AND ("page" IS 'toutes' OR "page" IS 'Tout le site') | sections/lettre (fr) : page
UPDATE "ec_sections" SET "page" = 'Tout le site' WHERE slug = 'lettre' AND locale = 'fr' AND "page" IS 'toutes';
UPDATE revisions SET data = json_set(data, '$.page', 'Tout le site')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'lettre' AND locale = 'fr') AND json_extract(data, '$.page') IS 'toutes' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'lettre' AND locale = 'fr') IS 'Tout le site';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'lettre-flux' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/lettre-flux (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'lettre-flux' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'lettre-flux' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'lettre-flux' AND locale = 'fr') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr' AND ("page" IS 'mentions-legales' OR "page" IS 'Mentions légales') | sections/mentions-legales (fr) : page
UPDATE "ec_sections" SET "page" = 'Mentions légales' WHERE slug = 'mentions-legales' AND locale = 'fr' AND "page" IS 'mentions-legales';
UPDATE revisions SET data = json_set(data, '$.page', 'Mentions légales')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr') AND json_extract(data, '$.page') IS 'mentions-legales' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr') IS 'Mentions légales';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Mentions légales') | sections/mentions-legales (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Mentions légales' WHERE slug = 'mentions-legales' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Mentions légales')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr') IS 'Mentions légales';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr' AND ("revised" IS NULL OR "revised" IS '2026-09-24T00:00:00.000Z') | sections/mentions-legales (fr) : revised
UPDATE "ec_sections" SET "revised" = '2026-09-24T00:00:00.000Z' WHERE slug = 'mentions-legales' AND locale = 'fr' AND "revised" IS NULL;
UPDATE revisions SET data = json_set(data, '$.revised', '2026-09-24T00:00:00.000Z')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr') AND json_extract(data, '$.revised') IS NULL AND (SELECT "revised" FROM "ec_sections" WHERE slug = 'mentions-legales' AND locale = 'fr') IS '2026-09-24T00:00:00.000Z';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr' AND ("page" IS 'toutes' OR "page" IS 'Tout le site') | sections/pied-de-page (fr) : page
UPDATE "ec_sections" SET "page" = 'Tout le site' WHERE slug = 'pied-de-page' AND locale = 'fr' AND "page" IS 'toutes';
UPDATE revisions SET data = json_set(data, '$.page', 'Tout le site')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') AND json_extract(data, '$.page') IS 'toutes' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') IS 'Tout le site';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr' AND ("body" IS NULL OR "body" IS 'Fait avec Astro, composé en Space Grotesk et Instrument Sans.') | sections/pied-de-page (fr) : body
UPDATE "ec_sections" SET "body" = 'Fait avec Astro, composé en Space Grotesk et Instrument Sans.' WHERE slug = 'pied-de-page' AND locale = 'fr' AND "body" IS NULL;
UPDATE revisions SET data = json_set(data, '$.body', 'Fait avec Astro, composé en Space Grotesk et Instrument Sans.')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') AND json_extract(data, '$.body') IS NULL AND (SELECT "body" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') IS 'Fait avec Astro, composé en Space Grotesk et Instrument Sans.';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr' AND ("cta" IS NULL OR "cta" IS 'Thème Reef par') | sections/pied-de-page (fr) : cta
UPDATE "ec_sections" SET "cta" = 'Thème Reef par' WHERE slug = 'pied-de-page' AND locale = 'fr' AND "cta" IS NULL;
UPDATE revisions SET data = json_set(data, '$.cta', 'Thème Reef par')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') AND json_extract(data, '$.cta') IS NULL AND (SELECT "cta" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') IS 'Thème Reef par';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr' AND ("cta_secondary" IS NULL OR "cta_secondary" IS 'Revenir en haut') | sections/pied-de-page (fr) : cta_secondary
UPDATE "ec_sections" SET "cta_secondary" = 'Revenir en haut' WHERE slug = 'pied-de-page' AND locale = 'fr' AND "cta_secondary" IS NULL;
UPDATE revisions SET data = json_set(data, '$.cta_secondary', 'Revenir en haut')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') AND json_extract(data, '$.cta_secondary') IS NULL AND (SELECT "cta_secondary" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') IS 'Revenir en haut';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr' AND ("note" IS NULL OR "note" IS 'Tous droits réservés.') | sections/pied-de-page (fr) : note
UPDATE "ec_sections" SET "note" = 'Tous droits réservés.' WHERE slug = 'pied-de-page' AND locale = 'fr' AND "note" IS NULL;
UPDATE revisions SET data = json_set(data, '$.note', 'Tous droits réservés.')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') AND json_extract(data, '$.note') IS NULL AND (SELECT "note" FROM "ec_sections" WHERE slug = 'pied-de-page' AND locale = 'fr') IS 'Tous droits réservés.';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'fr' AND ("page" IS 'recherche' OR "page" IS 'Recherche') | sections/recherche (fr) : page
UPDATE "ec_sections" SET "page" = 'Recherche' WHERE slug = 'recherche' AND locale = 'fr' AND "page" IS 'recherche';
UPDATE revisions SET data = json_set(data, '$.page', 'Recherche')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'fr') AND json_extract(data, '$.page') IS 'recherche' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'fr') IS 'Recherche';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Recherche') | sections/recherche (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Recherche' WHERE slug = 'recherche' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Recherche')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'recherche' AND locale = 'fr') IS 'Recherche';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'fr' AND ("page" IS 'rubriques' OR "page" IS 'Sujets') | sections/rubriques (fr) : page
UPDATE "ec_sections" SET "page" = 'Sujets' WHERE slug = 'rubriques' AND locale = 'fr' AND "page" IS 'rubriques';
UPDATE revisions SET data = json_set(data, '$.page', 'Sujets')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'fr') AND json_extract(data, '$.page') IS 'rubriques' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'fr') IS 'Sujets';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'fr' AND ("breadcrumb" IS NULL OR "breadcrumb" IS 'Sujets') | sections/rubriques (fr) : breadcrumb
UPDATE "ec_sections" SET "breadcrumb" = 'Sujets' WHERE slug = 'rubriques' AND locale = 'fr' AND "breadcrumb" IS NULL;
UPDATE revisions SET data = json_set(data, '$.breadcrumb', 'Sujets')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'fr') AND json_extract(data, '$.breadcrumb') IS NULL AND (SELECT "breadcrumb" FROM "ec_sections" WHERE slug = 'rubriques' AND locale = 'fr') IS 'Sujets';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'signatures' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/signatures (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'signatures' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'signatures' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'signatures' AND locale = 'fr') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/studio (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'studio' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr') IS 'Accueil';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr' AND ("eyebrow" IS NULL OR "eyebrow" IS 'À propos') | sections/studio (fr) : eyebrow
UPDATE "ec_sections" SET "eyebrow" = 'À propos' WHERE slug = 'studio' AND locale = 'fr' AND "eyebrow" IS NULL;
UPDATE revisions SET data = json_set(data, '$.eyebrow', 'À propos')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr') AND json_extract(data, '$.eyebrow') IS NULL AND (SELECT "eyebrow" FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr') IS 'À propos';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr' AND ("cta_secondary" IS NULL OR "cta_secondary" IS 'Contact') | sections/studio (fr) : cta_secondary
UPDATE "ec_sections" SET "cta_secondary" = 'Contact' WHERE slug = 'studio' AND locale = 'fr' AND "cta_secondary" IS NULL;
UPDATE revisions SET data = json_set(data, '$.cta_secondary', 'Contact')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr') AND json_extract(data, '$.cta_secondary') IS NULL AND (SELECT "cta_secondary" FROM "ec_sections" WHERE slug = 'studio' AND locale = 'fr') IS 'Contact';
-- garde: SELECT count(*) FROM "ec_sections" WHERE slug = 'sujets' AND locale = 'fr' AND ("page" IS 'accueil' OR "page" IS 'Accueil') | sections/sujets (fr) : page
UPDATE "ec_sections" SET "page" = 'Accueil' WHERE slug = 'sujets' AND locale = 'fr' AND "page" IS 'accueil';
UPDATE revisions SET data = json_set(data, '$.page', 'Accueil')
  WHERE id = (SELECT live_revision_id FROM "ec_sections" WHERE slug = 'sujets' AND locale = 'fr') AND json_extract(data, '$.page') IS 'accueil' AND (SELECT "page" FROM "ec_sections" WHERE slug = 'sujets' AND locale = 'fr') IS 'Accueil';

-- 5. LES MENUS NATIFS, un par nom et par langue, avec leurs liens ; un menu du meme nom deja cree a la main n'est pas touche.

-- menu actions (en)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'actions' AND locale = 'en') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2YPTCTJY0ECAPH4RJ5') THEN 1 ELSE 0 END | menu actions (en) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ2YPTCTJY0ECAPH4RJ5', 'actions', 'Boutons en haut à droite de chaque page', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSFZ2YPTCTJY0ECAPH4RJ5'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'actions' AND locale = 'en');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S88W43Y9G51K341Q90', '01M3MSFZ2YPTCTJY0ECAPH4RJ5', NULL, 0, 'custom', NULL, NULL, '#newsletter', 'Subscribe', NULL, NULL, 'bouton', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S88W43Y9G51K341Q90'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2YPTCTJY0ECAPH4RJ5') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S88W43Y9G51K341Q90');
-- menu pied-legal (en)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-legal' AND locale = 'en') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ31E5TPRZHAAZJH29M2') THEN 1 ELSE 0 END | menu pied-legal (en) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ31E5TPRZHAAZJH29M2', 'pied-legal', 'Legal', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSFZ31E5TPRZHAAZJH29M2'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-legal' AND locale = 'en');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SBKR9A5HFVWMY8MZTF', '01M3MSFZ31E5TPRZHAAZJH29M2', NULL, 0, 'custom', NULL, NULL, '/legal/', 'Legal notice', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1SBKR9A5HFVWMY8MZTF'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ31E5TPRZHAAZJH29M2') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SBKR9A5HFVWMY8MZTF');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SBCW458M0XR4J72YN5', '01M3MSFZ31E5TPRZHAAZJH29M2', NULL, 1, 'custom', NULL, NULL, '/privacy/', 'Privacy', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1SBCW458M0XR4J72YN5'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ31E5TPRZHAAZJH29M2') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SBCW458M0XR4J72YN5');
-- menu pied-lire (en)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-lire' AND locale = 'en') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2ZXWZXSFW9DZR25QSJ') THEN 1 ELSE 0 END | menu pied-lire (en) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ2ZXWZXSFW9DZR25QSJ', 'pied-lire', 'Read', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSFZ2ZXWZXSFW9DZR25QSJ'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-lire' AND locale = 'en');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S9V611JYQ7ABNN2SR7', '01M3MSFZ2ZXWZXSFW9DZR25QSJ', NULL, 0, 'custom', NULL, NULL, '/blog/', 'Posts', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S9V611JYQ7ABNN2SR7'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2ZXWZXSFW9DZR25QSJ') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S9V611JYQ7ABNN2SR7');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S90PRHTSQF3KWQANP1', '01M3MSFZ2ZXWZXSFW9DZR25QSJ', NULL, 1, 'custom', NULL, NULL, '/topics/', 'Topics', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S90PRHTSQF3KWQANP1'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2ZXWZXSFW9DZR25QSJ') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S90PRHTSQF3KWQANP1');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S9HR5G76NR8P7FR0EM', '01M3MSFZ2ZXWZXSFW9DZR25QSJ', NULL, 2, 'custom', NULL, NULL, '/authors/', 'Authors', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S9HR5G76NR8P7FR0EM'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2ZXWZXSFW9DZR25QSJ') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S9HR5G76NR8P7FR0EM');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S9C0R01XEHVSVSEW2J', '01M3MSFZ2ZXWZXSFW9DZR25QSJ', NULL, 3, 'custom', NULL, NULL, '/rss.xml', 'RSS feed', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S9C0R01XEHVSVSEW2J'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2ZXWZXSFW9DZR25QSJ') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S9C0R01XEHVSVSEW2J');
-- menu pied-studio (en)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-studio' AND locale = 'en') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ30KV6Y0A6HEDXF8YY6') THEN 1 ELSE 0 END | menu pied-studio (en) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ30KV6Y0A6HEDXF8YY6', 'pied-studio', 'The studio', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSFZ30KV6Y0A6HEDXF8YY6'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-studio' AND locale = 'en');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SA6M96ZYXDGPRA83P0', '01M3MSFZ30KV6Y0A6HEDXF8YY6', NULL, 0, 'custom', NULL, NULL, '/about/', 'About', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1SA6M96ZYXDGPRA83P0'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ30KV6Y0A6HEDXF8YY6') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SA6M96ZYXDGPRA83P0');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SA82V19ERN96ETP0GS', '01M3MSFZ30KV6Y0A6HEDXF8YY6', NULL, 1, 'custom', NULL, NULL, '/contact/', 'Contact', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1SA82V19ERN96ETP0GS'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ30KV6Y0A6HEDXF8YY6') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SA82V19ERN96ETP0GS');
-- menu principal (en)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'principal' AND locale = 'en') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2WH0P4MXXCS1BCWZT9') THEN 1 ELSE 0 END | menu principal (en) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ2WH0P4MXXCS1BCWZT9', 'principal', 'Menu principal, en haut de chaque page', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSFZ2WH0P4MXXCS1BCWZT9'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'principal' AND locale = 'en');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S4ZF1AS0RSN7J0D58Y', '01M3MSFZ2WH0P4MXXCS1BCWZT9', NULL, 0, 'custom', NULL, NULL, '/blog/', 'Posts', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S4ZF1AS0RSN7J0D58Y'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2WH0P4MXXCS1BCWZT9') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S4ZF1AS0RSN7J0D58Y');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S5Y5FHXB4H30PNN1KT', '01M3MSFZ2WH0P4MXXCS1BCWZT9', NULL, 1, 'custom', NULL, NULL, '/topics/', 'Topics', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S5Y5FHXB4H30PNN1KT'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2WH0P4MXXCS1BCWZT9') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S5Y5FHXB4H30PNN1KT');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S5VZRNJXZ59K3TB2J6', '01M3MSFZ2WH0P4MXXCS1BCWZT9', NULL, 2, 'custom', NULL, NULL, '/about/', 'About', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S5VZRNJXZ59K3TB2J6'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2WH0P4MXXCS1BCWZT9') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S5VZRNJXZ59K3TB2J6');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S708TFS15E3TV24QZH', '01M3MSFZ2WH0P4MXXCS1BCWZT9', NULL, 3, 'custom', NULL, NULL, '/contact/', 'Contact', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S708TFS15E3TV24QZH'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2WH0P4MXXCS1BCWZT9') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S708TFS15E3TV24QZH');
-- menu tiroir (en)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'tiroir' AND locale = 'en') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2X1ZA048GM4FVGQC21') THEN 1 ELSE 0 END | menu tiroir (en) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ2X1ZA048GM4FVGQC21', 'tiroir', 'Liens ajoutés au menu sur téléphone', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSFZ2X1ZA048GM4FVGQC21'
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'tiroir' AND locale = 'en');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S7P32PBC8FH09649T0', '01M3MSFZ2X1ZA048GM4FVGQC21', NULL, 0, 'custom', NULL, NULL, '/authors/', 'Authors', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S7P32PBC8FH09649T0'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2X1ZA048GM4FVGQC21') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S7P32PBC8FH09649T0');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1S852YCHK1Q5EBCE8YA', '01M3MSFZ2X1ZA048GM4FVGQC21', NULL, 1, 'custom', NULL, NULL, '/search/', 'Search', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'en', '01M3MSG1S852YCHK1Q5EBCE8YA'
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ2X1ZA048GM4FVGQC21') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1S852YCHK1Q5EBCE8YA');
-- menu actions (fr)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'actions' AND locale = 'fr') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34Q9NG6WT8KYVX02XF') THEN 1 ELSE 0 END | menu actions (fr) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ34Q9NG6WT8KYVX02XF', 'actions', 'Boutons en haut à droite de chaque page', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menus WHERE name = 'actions' AND locale = 'en')
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'actions' AND locale = 'fr');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SE72THRT5T12TP7ND0', '01M3MSFZ34Q9NG6WT8KYVX02XF', NULL, 0, 'custom', NULL, NULL, '#newsletter', 'S''abonner', NULL, NULL, 'bouton', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S88W43Y9G51K341Q90')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34Q9NG6WT8KYVX02XF') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SE72THRT5T12TP7ND0');
-- menu pied-legal (fr)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-legal' AND locale = 'fr') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ36XQZ4H5BG3PRBNDDW') THEN 1 ELSE 0 END | menu pied-legal (fr) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ36XQZ4H5BG3PRBNDDW', 'pied-legal', 'Légal', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menus WHERE name = 'pied-legal' AND locale = 'en')
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-legal' AND locale = 'fr');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SH9HW3GRTT69NQBS2W', '01M3MSFZ36XQZ4H5BG3PRBNDDW', NULL, 0, 'custom', NULL, NULL, '/fr/legal/', 'Mentions légales', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1SBKR9A5HFVWMY8MZTF')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ36XQZ4H5BG3PRBNDDW') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SH9HW3GRTT69NQBS2W');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SH5QVSS579F07HZYDE', '01M3MSFZ36XQZ4H5BG3PRBNDDW', NULL, 1, 'custom', NULL, NULL, '/fr/privacy/', 'Confidentialité', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1SBCW458M0XR4J72YN5')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ36XQZ4H5BG3PRBNDDW') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SH5QVSS579F07HZYDE');
-- menu pied-lire (fr)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-lire' AND locale = 'fr') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34B8VBS9D17G2DQ7MG') THEN 1 ELSE 0 END | menu pied-lire (fr) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ34B8VBS9D17G2DQ7MG', 'pied-lire', 'Lire', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menus WHERE name = 'pied-lire' AND locale = 'en')
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-lire' AND locale = 'fr');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SFS80NCGRC0XMGC4X7', '01M3MSFZ34B8VBS9D17G2DQ7MG', NULL, 0, 'custom', NULL, NULL, '/fr/blog/', 'Articles', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S9V611JYQ7ABNN2SR7')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34B8VBS9D17G2DQ7MG') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SFS80NCGRC0XMGC4X7');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SFFNP7WST3X066F4SW', '01M3MSFZ34B8VBS9D17G2DQ7MG', NULL, 1, 'custom', NULL, NULL, '/fr/topics/', 'Sujets', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S90PRHTSQF3KWQANP1')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34B8VBS9D17G2DQ7MG') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SFFNP7WST3X066F4SW');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SFJA92NN02J710VAZD', '01M3MSFZ34B8VBS9D17G2DQ7MG', NULL, 2, 'custom', NULL, NULL, '/fr/authors/', 'Auteurs', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S9HR5G76NR8P7FR0EM')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34B8VBS9D17G2DQ7MG') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SFJA92NN02J710VAZD');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SFT6YEV0ZQGQ0DA971', '01M3MSFZ34B8VBS9D17G2DQ7MG', NULL, 3, 'custom', NULL, NULL, '/fr/rss.xml', 'Flux RSS', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S9C0R01XEHVSVSEW2J')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ34B8VBS9D17G2DQ7MG') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SFT6YEV0ZQGQ0DA971');
-- menu pied-studio (fr)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-studio' AND locale = 'fr') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ35WSK3SCQWBF6A1H38') THEN 1 ELSE 0 END | menu pied-studio (fr) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ35WSK3SCQWBF6A1H38', 'pied-studio', 'Le studio', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menus WHERE name = 'pied-studio' AND locale = 'en')
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'pied-studio' AND locale = 'fr');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SGQ8DPV33Q9WZA5AH7', '01M3MSFZ35WSK3SCQWBF6A1H38', NULL, 0, 'custom', NULL, NULL, '/fr/about/', 'À propos', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1SA6M96ZYXDGPRA83P0')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ35WSK3SCQWBF6A1H38') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SGQ8DPV33Q9WZA5AH7');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SGACH1H44K5YAJFCN9', '01M3MSFZ35WSK3SCQWBF6A1H38', NULL, 1, 'custom', NULL, NULL, '/fr/contact/', 'Contact', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1SA82V19ERN96ETP0GS')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ35WSK3SCQWBF6A1H38') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SGACH1H44K5YAJFCN9');
-- menu principal (fr)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'principal' AND locale = 'fr') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ32P7NNCNWC68ZYXSTH') THEN 1 ELSE 0 END | menu principal (fr) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ32P7NNCNWC68ZYXSTH', 'principal', 'Menu principal, en haut de chaque page', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menus WHERE name = 'principal' AND locale = 'en')
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'principal' AND locale = 'fr');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SCKTXYCHG905SCA6PW', '01M3MSFZ32P7NNCNWC68ZYXSTH', NULL, 0, 'custom', NULL, NULL, '/fr/blog/', 'Articles', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S4ZF1AS0RSN7J0D58Y')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ32P7NNCNWC68ZYXSTH') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SCKTXYCHG905SCA6PW');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SCG3G29WT2036589D0', '01M3MSFZ32P7NNCNWC68ZYXSTH', NULL, 1, 'custom', NULL, NULL, '/fr/topics/', 'Sujets', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S5Y5FHXB4H30PNN1KT')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ32P7NNCNWC68ZYXSTH') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SCG3G29WT2036589D0');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SCZEQTMG5N7QE36FJ0', '01M3MSFZ32P7NNCNWC68ZYXSTH', NULL, 2, 'custom', NULL, NULL, '/fr/about/', 'À propos', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S5VZRNJXZ59K3TB2J6')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ32P7NNCNWC68ZYXSTH') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SCZEQTMG5N7QE36FJ0');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SC8S6KWJF6PZ7YG5KF', '01M3MSFZ32P7NNCNWC68ZYXSTH', NULL, 3, 'custom', NULL, NULL, '/fr/contact/', 'Contact', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S708TFS15E3TV24QZH')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ32P7NNCNWC68ZYXSTH') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SC8S6KWJF6PZ7YG5KF');
-- menu tiroir (fr)
-- garde: SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'tiroir' AND locale = 'fr') THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ33KK0C4E17ZNWCECVG') THEN 1 ELSE 0 END | menu tiroir (fr) : deja cree a la main, ses liens restent ceux de l'editeur
INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)
  SELECT '01M3MSFZ33KK0C4E17ZNWCECVG', 'tiroir', 'Liens ajoutés au menu sur téléphone', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menus WHERE name = 'tiroir' AND locale = 'en')
  WHERE NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = 'tiroir' AND locale = 'fr');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SD8B9HAQ581ZT72XP3', '01M3MSFZ33KK0C4E17ZNWCECVG', NULL, 0, 'custom', NULL, NULL, '/fr/authors/', 'Auteurs', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S7P32PBC8FH09649T0')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ33KK0C4E17ZNWCECVG') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SD8B9HAQ581ZT72XP3');
INSERT INTO _emdash_menu_items ("id", "menu_id", "parent_id", "sort_order", "type", "reference_collection", "reference_id", "custom_url", "label", "title_attr", "target", "css_classes", "created_at", "locale", "translation_group")
  SELECT '01M3MSG1SE41G6NRZ9TKX0PXS1', '01M3MSFZ33KK0C4E17ZNWCECVG', NULL, 1, 'custom', NULL, NULL, '/fr/search/', 'Rechercher', NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'fr', (SELECT translation_group FROM _emdash_menu_items WHERE id = '01M3MSG1S852YCHK1Q5EBCE8YA')
  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = '01M3MSFZ33KK0C4E17ZNWCECVG') AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = '01M3MSG1SE41G6NRZ9TKX0PXS1');

-- 6. LES REGLAGES DU SITE nouveaux (un reglage existant n'est jamais ecrase).

INSERT OR IGNORE INTO options (name, value) VALUES ('site:postsPerPage', '9');

-- 7. LES DECLENCHEURS (index de recherche des collections nouvelles), en dernier.

CREATE TRIGGER IF NOT EXISTS "emdash_mu_5fb4f8c5d8199f9bf66544dcf11089bc_ai"
		AFTER INSERT ON "ec_sujets"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'sujets'
				AND collection_id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
						AND collection.slug = 'sujets'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ1ESFRH4NQ4WGKDQ3YR',
				'sujets',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'sujets'
				AND collection_id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_5fb4f8c5d8199f9bf66544dcf11089bc_au"
		AFTER UPDATE ON "ec_sujets"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'sujets'
				AND collection_id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
						AND collection.slug = 'sujets'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ1ESFRH4NQ4WGKDQ3YR',
				'sujets',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'sujets'
				AND collection_id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_5fb4f8c5d8199f9bf66544dcf11089bc_ad"
		AFTER DELETE ON "ec_sujets"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'sujets'
				AND collection_id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
						AND collection.slug = 'sujets'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ1ESFRH4NQ4WGKDQ3YR',
				'sujets',
				OLD.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'sujets'
				AND collection_id = '01M3MSFZ1ESFRH4NQ4WGKDQ3YR'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_c62250538ac63287711845fa2328c185_ai"
		AFTER INSERT ON "ec_auteurs"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'auteurs'
				AND collection_id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
						AND collection.slug = 'auteurs'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ1T52SSZQBTZ6NE73HE',
				'auteurs',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'auteurs'
				AND collection_id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_c62250538ac63287711845fa2328c185_au"
		AFTER UPDATE ON "ec_auteurs"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'auteurs'
				AND collection_id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
						AND collection.slug = 'auteurs'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ1T52SSZQBTZ6NE73HE',
				'auteurs',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'auteurs'
				AND collection_id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_c62250538ac63287711845fa2328c185_ad"
		AFTER DELETE ON "ec_auteurs"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'auteurs'
				AND collection_id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
						AND collection.slug = 'auteurs'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ1T52SSZQBTZ6NE73HE',
				'auteurs',
				OLD.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'auteurs'
				AND collection_id = '01M3MSFZ1T52SSZQBTZ6NE73HE'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_277857695b4d12bfcdeb2b8044b8be7d_ai"
		AFTER INSERT ON "ec_pages"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'pages'
				AND collection_id = '01M3MSFZ254NXMZ4476198C8VM'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ254NXMZ4476198C8VM'
						AND collection.slug = 'pages'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ254NXMZ4476198C8VM',
				'pages',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'pages'
				AND collection_id = '01M3MSFZ254NXMZ4476198C8VM'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_277857695b4d12bfcdeb2b8044b8be7d_au"
		AFTER UPDATE ON "ec_pages"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'pages'
				AND collection_id = '01M3MSFZ254NXMZ4476198C8VM'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ254NXMZ4476198C8VM'
						AND collection.slug = 'pages'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ254NXMZ4476198C8VM',
				'pages',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'pages'
				AND collection_id = '01M3MSFZ254NXMZ4476198C8VM'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_277857695b4d12bfcdeb2b8044b8be7d_ad"
		AFTER DELETE ON "ec_pages"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'pages'
				AND collection_id = '01M3MSFZ254NXMZ4476198C8VM'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ254NXMZ4476198C8VM'
						AND collection.slug = 'pages'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ254NXMZ4476198C8VM',
				'pages',
				OLD.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'pages'
				AND collection_id = '01M3MSFZ254NXMZ4476198C8VM'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_f66226b9f7eaf33104a0a6be75b44dfe_ai"
		AFTER INSERT ON "ec_site"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'site'
				AND collection_id = '01M3MSFZ2FQZ814NFFF2RWS77E'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ2FQZ814NFFF2RWS77E'
						AND collection.slug = 'site'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ2FQZ814NFFF2RWS77E',
				'site',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'site'
				AND collection_id = '01M3MSFZ2FQZ814NFFF2RWS77E'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_f66226b9f7eaf33104a0a6be75b44dfe_au"
		AFTER UPDATE ON "ec_site"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'site'
				AND collection_id = '01M3MSFZ2FQZ814NFFF2RWS77E'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ2FQZ814NFFF2RWS77E'
						AND collection.slug = 'site'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ2FQZ814NFFF2RWS77E',
				'site',
				NEW.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'site'
				AND collection_id = '01M3MSFZ2FQZ814NFFF2RWS77E'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
CREATE TRIGGER IF NOT EXISTS "emdash_mu_f66226b9f7eaf33104a0a6be75b44dfe_ad"
		AFTER DELETE ON "ec_site"
		FOR EACH ROW
		BEGIN
			UPDATE _emdash_media_usage_index_status
			SET change_epoch = change_epoch + 1,
				status = CASE WHEN status = 'complete' THEN 'stale' ELSE status END,
				completed_at = CASE WHEN status = 'complete' THEN NULL ELSE completed_at END,
				updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'site'
				AND collection_id = '01M3MSFZ2FQZ814NFFF2RWS77E'
				AND capture_state = 'active'
				AND EXISTS (
					SELECT 1
					FROM _emdash_collections AS collection
					WHERE collection.id = '01M3MSFZ2FQZ814NFFF2RWS77E'
						AND collection.slug = 'site'
				);

			SELECT CASE
				WHEN changes() <> 1 THEN RAISE(ABORT, 'media usage capture inactive')
			END;

			INSERT INTO _emdash_media_usage_work (
				collection_id,
				collection_slug,
				content_id,
				change_epoch,
				work_version,
				state,
				attempt_count,
				next_attempt_at,
				lease_token,
				lease_expires_at,
				last_attempted_at,
				last_error_code,
				created_at,
				updated_at
			)
			SELECT
				'01M3MSFZ2FQZ814NFFF2RWS77E',
				'site',
				OLD.id,
				change_epoch,
				1,
				'pending',
				0,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				NULL,
				NULL,
				NULL,
				NULL,
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
				strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			FROM _emdash_media_usage_index_status
			WHERE adapter_id = 'content-media'
				AND scope_type = 'collection'
				AND scope_key = 'site'
				AND collection_id = '01M3MSFZ2FQZ814NFFF2RWS77E'
				AND capture_state = 'active'
			ON CONFLICT (collection_id, content_id) DO UPDATE SET
				collection_slug = excluded.collection_slug,
				change_epoch = excluded.change_epoch,
				work_version = _emdash_media_usage_work.work_version + 1,
				state = 'pending',
				attempt_count = 0,
				next_attempt_at = excluded.next_attempt_at,
				lease_token = NULL,
				lease_expires_at = NULL,
				last_attempted_at = NULL,
				last_error_code = NULL,
				updated_at = excluded.updated_at;
		END;
