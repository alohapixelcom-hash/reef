-- import-3.8.5-reef.sql - met une base reef-moteur deja en 3.8.4 au niveau de la 3.8.5 : la table des messages du formulaire de contact (ecran « Messages » du back office).
--
-- Le formulaire de contact garde desormais chaque message dans la base du
-- site, avant d'envoyer la notification : un message n'est jamais perdu, et
-- se lit, se classe et recoit sa reponse depuis le back office. L'extension
-- cree cette table seule au premier message ; ce fichier la cree tout de
-- suite. Les abonnes desinscrits par l'administrateur prennent l'etat
-- "desinscrit" dans la table existante : aucune colonne a ajouter.
--
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql migrations/import-3.8.5-reef.sql              (le plan, rien n'est ecrit)
--   node scripts/base-3.4.0.mjs --remote reef-moteur --sql migrations/import-3.8.5-reef.sql --appliquer
--
-- IDEMPOTENT : un second passage ne change rien. Aucun DELETE, aucun DROP.

CREATE TABLE IF NOT EXISTS courriels_messages (
  id TEXT PRIMARY KEY,
  recu_le INTEGER NOT NULL,
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  sujet TEXT NOT NULL,
  message TEXT NOT NULL,
  langue TEXT NOT NULL,
  page TEXT,
  statut TEXT NOT NULL DEFAULT 'nouveau',
  lu_le INTEGER,
  repondu_le INTEGER,
  reponse TEXT
);
CREATE INDEX IF NOT EXISTS courriels_messages_statut ON courriels_messages (statut, recu_le);
