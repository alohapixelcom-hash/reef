#!/bin/bash
# scripts/deployer-frontal.sh - met Reef sous frontal : deploie le Worker du moteur (sans domaine), puis le Worker frontal avec le domaine, et verifie en ligne que le frontal repond.
#
#   bash scripts/deployer-frontal.sh            le moteur, puis le frontal, puis le domaine sur le frontal
#   bash scripts/deployer-frontal.sh --retour   retour arriere : le domaine revient sur le moteur
#   ajouter --a-sec                              montre chaque commande et construit les paquets sans rien envoyer
#
# A lancer a la racine du depot, apres `pnpm build:moteur` (dist/client et
# dist/server/wrangler.json doivent exister : les deux Workers servent les
# memes fichiers). Le domaine ne se debranche jamais du moteur avant que le
# frontal ne soit deploye : un visiteur tombe toujours sur un Worker qui repond.
# Apres le passage au frontal, ne plus deployer le moteur avec --domain (le
# domaine y retournerait) : `wrangler deploy -c dist/server/wrangler.json` seul.
set -euo pipefail
DOMAINE="${DOMAINE:-reef.alohapixel.app}"
WR="npx --yes wrangler@4.135.0"
MOTEUR="dist/server/wrangler.json"
MODE=deployer; A_SEC=""
for a in "$@"; do case "$a" in --retour) MODE=retour ;; --a-sec) A_SEC=1 ;; *) echo "Option inconnue : $a (--retour, --a-sec)"; exit 2 ;; esac; done
[ -f "$MOTEUR" ] && [ -d dist/client ] || { echo "Lancez d'abord pnpm build:moteur : $MOTEUR est absent."; exit 1; }
SORTIE="$(mktemp -d)"
# Une etape : a sec, la commande est montree et le paquet construit (--dry-run), rien n'est envoye.
etape() {
  echo "+ $*"
  if [ -n "$A_SEC" ]; then "$@" --dry-run --outdir "$SORTIE/$(date +%s%N)" > "$SORTIE/journal.txt" 2>&1 || { tail -20 "$SORTIE/journal.txt"; exit 1; }; grep -E "Total Upload|Your Worker has access" "$SORTIE/journal.txt" | head -2 || true
  else CI=1 "$@"; fi
}
# Le domaine repond-il par le frontal ? (l'en-tete x-aloha-cache n'existe que la)
par_le_frontal() { curl -s -o /dev/null -D - "https://$DOMAINE/" | grep -qi '^x-aloha-cache:'; }
attendre() {
  [ -n "$A_SEC" ] && { echo "  (a sec : verification en ligne sautee)"; return 0; }
  for i in $(seq 1 30); do
    if par_le_frontal; then [ "$1" = frontal ] && { echo "Le domaine $DOMAINE repond par le frontal."; return 0; }
    else [ "$1" = moteur ] && { echo "Le domaine $DOMAINE repond par le moteur."; return 0; }; fi
    sleep 3
  done
  echo "Attention : apres 90 s, $DOMAINE ne repond pas encore par le $1."; return 1
}
if [ "$MODE" = deployer ]; then
  echo "1. Le moteur, sans toucher au domaine"
  etape $WR deploy -c "$MOTEUR"
  echo "2. Le frontal, et le domaine $DOMAINE deplace du moteur vers lui"
  etape $WR deploy -c wrangler.frontal.jsonc --domain "$DOMAINE"
  attendre frontal || { echo "Retour arriere : bash scripts/deployer-frontal.sh --retour"; exit 1; }
else
  echo "Retour arriere : le domaine $DOMAINE revient sur le moteur (meme build, deja en ligne)"
  etape $WR deploy -c "$MOTEUR" --domain "$DOMAINE"
  attendre moteur
  echo "Le Worker reef-frontal reste deploye sans domaine : sans effet, a supprimer quand le retour est confirme."
fi
