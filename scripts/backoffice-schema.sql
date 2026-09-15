-- scripts/backoffice-schema.sql - tables de connexion du site de l'acheteur uniquement.
CREATE TABLE IF NOT EXISTS aloha_auth_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, attempts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS aloha_auth_used (fingerprint TEXT PRIMARY KEY, expires INTEGER NOT NULL);
