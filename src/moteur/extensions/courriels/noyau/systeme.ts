// src/moteur/extensions/courriels/noyau/systeme.ts - les courriels du back office (lien de connexion, invitation, verification) reecrits en francais, avec leur lien.
//
// POURQUOI. EmDash 0.38 ecrit ces trois courriels en anglais, en dur
// (@emdash-cms/auth) : « Sign in to ... », « You've been invited to ... »,
// « Verify your email for ... ». Une creatrice francaise recoit un message
// qu'elle ne lit pas, et Gmail range plus volontiers en indesirable un
// courriel neuf, en anglais, qui ne contient qu'un lien. Le canal les
// reconnait a leur sujet, garde le lien (et lui seul) et les reecrit.
//
// FICHIER PUR : ni base, ni reseau. Un courriel qui ne ressemble a aucun des
// trois passe tel quel : un EmDash qui change ses textes n'est jamais casse,
// il redevient anglais.

export interface CourrielDuBackOffice {
  sujet: string;
  texte: string;
  html: string;
}

const LIEN = /https?:\/\/\S+/;

const echapper = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(titre: string, phrases: string[], bouton: string, lien: string, fin: string[]): string {
  const p = (t: string) => `<p style="margin:0 0 16px">${echapper(t)}</p>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#222;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:22px;margin:0 0 20px">${echapper(titre)}</h1>
${phrases.map(p).join("\n")}
<p style="margin:28px 0"><a href="${echapper(lien)}" style="background:#222;color:#fff;padding:12px 22px;text-decoration:none;border-radius:999px;display:inline-block">${echapper(bouton)}</a></p>
${fin.map((t) => `<p style="margin:0 0 12px;color:#666;font-size:14px">${echapper(t)}</p>`).join("\n")}
</body></html>`;
}

/** Le courriel en francais, ou null quand le sujet n'est pas celui d'un courriel connu du back office. */
export function courrielDuBackOffice(sujet: string, texte: string): CourrielDuBackOffice | null {
  const lien = LIEN.exec(texte)?.[0];
  if (!lien) return null;
  let m = /^Sign in to (.+)$/.exec(sujet);
  if (m) {
    const site = m[1]!;
    const fin = ["Ce lien est valable 15 minutes.", "Si vous n'avez pas demandé à vous connecter, ignorez simplement ce courriel."];
    return {
      sujet: `Votre lien de connexion à ${site}`,
      texte: [`Bonjour,`, `Pour vous connecter au back office de ${site}, ouvrez ce lien :`, lien, ...fin].join("\n\n"),
      html: page(`Connexion à ${site}`, ["Bonjour,", `Pour vous connecter au back office de ${site}, cliquez sur le bouton ci-dessous.`], "Me connecter", lien, fin),
    };
  }
  m = /^You've been invited to (.+)$/.exec(sujet);
  if (m) {
    const site = m[1]!;
    const fin = ["Ce lien est valable 7 jours.", "Si vous ne vous attendiez pas à cette invitation, ignorez simplement ce courriel."];
    return {
      sujet: `Votre accès au back office de ${site}`,
      texte: [`Bonjour,`, `On vous invite à gérer le site ${site}. Pour créer votre accès, ouvrez ce lien :`, lien, ...fin].join("\n\n"),
      html: page(`Votre accès à ${site}`, ["Bonjour,", `On vous invite à gérer le site ${site}. Pour créer votre accès, cliquez sur le bouton ci-dessous.`], "Créer mon accès", lien, fin),
    };
  }
  m = /^Verify your email for (.+)$/.exec(sujet);
  if (m) {
    const site = m[1]!;
    const fin = ["Ce lien est valable 15 minutes.", "Si vous n'avez rien demandé, ignorez simplement ce courriel."];
    return {
      sujet: `Confirmez votre adresse pour ${site}`,
      texte: [`Bonjour,`, `Pour confirmer votre adresse et créer votre accès à ${site}, ouvrez ce lien :`, lien, ...fin].join("\n\n"),
      html: page(`Confirmez votre adresse`, ["Bonjour,", `Pour confirmer votre adresse et créer votre accès à ${site}, cliquez sur le bouton ci-dessous.`], "Confirmer mon adresse", lien, fin),
    };
  }
  return null;
}
