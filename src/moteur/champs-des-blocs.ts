// src/moteur/champs-des-blocs.ts - la carte des champs de chaque bloc (generique, socle 1.7.0) : ce que le theme declare dans theme.ts (CHAMPS_DES_BLOCS) pour que l'ecran d'un bloc cache les champs qui n'y font rien.
//
// POURQUOI. Tous les blocs de la collection "sections" partagent un schema :
// la photo, la video, l'image montree avant la video et la photo des elements
// s'affichent sur chaque bloc, alors que la plupart ne les lisent pas. Un
// client qui change une photo sans effet croit le site casse. Le theme dit
// ici quels champs agissent sur quel bloc (releve par la sonde de l'univers
// 3.8.2 : chaque champ change, publie, relu en visiteur) ; l'habillage du back
// office (habillage.ts, ECRANS_SIMPLES) cache les autres dans l'ecran du bloc.
// Rien n'est retire de la base : un champ cache garde sa valeur.
//
// Un bloc absent de la carte garde tous ses champs (un bloc ajoute plus tard
// n'est jamais ampute) ; un site sans carte aussi.

/** La carte : les champs soumis a la carte, le libelle des sous-champs d'un element, et, par bloc, ceux qui agissent. */
export interface ChampsDesBlocs {
  /** Champs de "sections" que la carte gouverne : "image", "video", "video_poster", ou un sous-champ d'element ("arguments.image"). */
  surveilles: string[];
  /** Pour un sous-champ d'element, son libelle dans la graine : l'ecran ne lui donne pas d'identifiant, il est reconnu a son libelle. */
  libelles?: Record<string, string>;
  /** Par bloc (son identifiant, le slug de l'entree), les champs surveilles qui agissent sur la page ; les autres sont caches. */
  blocs: Record<string, string[]>;
}

type ChampDeLaGraine = { slug: string; label?: string; type?: string; validation?: { subFields?: ChampDeLaGraine[] } };
type Graine = { collections: { slug: string; fields: ChampDeLaGraine[] }[] };

/** Les defauts d'une carte au regard de la graine : champ surveille absent, sous-champ sans libelle juste, bloc qui cite un champ non surveille. Liste vide : la carte est bonne. */
export function defautsDeLaCarte(carte: ChampsDesBlocs, graine: Graine): string[] {
  const defauts: string[] = [];
  const sections = graine.collections.find((c) => c.slug === "sections")?.fields ?? [];
  for (const champ of carte.surveilles) {
    const [racine, sous] = champ.split(".");
    const trouve = sections.find((f) => f.slug === racine);
    if (!trouve) {
      defauts.push(`${champ} : absent de la collection sections`);
      continue;
    }
    if (!sous) continue;
    const sousChamp = trouve.validation?.subFields?.find((f) => f.slug === sous);
    if (!sousChamp) defauts.push(`${champ} : sous-champ absent de ${racine}`);
    else if (carte.libelles?.[champ] !== sousChamp.label) defauts.push(`${champ} : libelle different de la graine (« ${sousChamp.label ?? ""} »)`);
  }
  for (const [bloc, champs] of Object.entries(carte.blocs)) {
    for (const champ of champs) if (!carte.surveilles.includes(champ)) defauts.push(`${bloc} : ${champ} n'est pas un champ surveille`);
  }
  return defauts;
}

/** Les champs surveilles caches dans l'ecran d'un bloc (vide pour un bloc absent de la carte). */
export function champsCaches(carte: ChampsDesBlocs | null | undefined, bloc: string): string[] {
  const utiles = carte?.blocs[bloc];
  return utiles ? carte.surveilles.filter((c) => !utiles.includes(c)) : [];
}
