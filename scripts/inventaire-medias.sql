-- scripts/inventaire-medias.sql - la liste des photos de la Mediatheque a reprendre, en lecture seule : plus de 2880 px, ou ni en WebP ni en AVIF.
--
-- LECTURE SEULE : aucun UPDATE, aucun DELETE. Lancer sur la base du site :
--   npx wrangler d1 execute <base> --remote --file scripts/inventaire-medias.sql
-- Le seuil est celui de regles.ts (GRAND_COTE_MAX 2880). Un WebP qui tient
-- dans le plafond n'est jamais recompresse, quel que soit son poids.
-- Ce qui sort ici se reprend par la carte Photos du tableau de bord,
-- « Optimiser les photos existantes » : meme cle, original garde sous
-- backups/aloha-medias/<cle>, adresse des pages inchangee.
SELECT
  id,
  filename,
  mime_type,
  size,
  width,
  height,
  CASE
    WHEN mime_type IN ('image/jpeg', 'image/png', 'image/heic', 'image/heif') THEN 'format a convertir'
    ELSE 'plus de 2880 px'
  END AS motif
FROM media
WHERE mime_type LIKE 'image/%'
  AND mime_type NOT IN ('image/gif', 'image/svg+xml')
  AND (
    mime_type IN ('image/jpeg', 'image/png', 'image/heic', 'image/heif')
    OR max(coalesce(width, 0), coalesce(height, 0)) > 2880
  )
ORDER BY size DESC;
