-- scripts/inventaire-medias.sql - la liste des photos de la Mediatheque a reprendre, en lecture seule : trop grandes, trop lourdes ou pas en WebP ni AVIF.
--
-- LECTURE SEULE : aucun UPDATE, aucun DELETE. Lancer sur la base du site :
--   npx wrangler d1 execute <base> --remote --file scripts/inventaire-medias.sql
-- Les seuils sont ceux de regles.ts (GRAND_COTE_MAX 2560, WEBP_LOURD 1 Mo).
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
    WHEN max(coalesce(width, 0), coalesce(height, 0)) > 2560 THEN 'plus de 2560 px'
    ELSE 'plus de 1 Mo'
  END AS motif
FROM media
WHERE mime_type LIKE 'image/%'
  AND mime_type NOT IN ('image/gif', 'image/svg+xml')
  AND (
    mime_type IN ('image/jpeg', 'image/png', 'image/heic', 'image/heif')
    OR max(coalesce(width, 0), coalesce(height, 0)) > 2560
    OR (mime_type = 'image/webp' AND size > 1048576)
  )
ORDER BY size DESC;
