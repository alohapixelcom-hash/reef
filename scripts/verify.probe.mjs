// scripts/verify.probe.mjs - ce qui deborde, se coupe ou se superpose dans la page.
//
// Ce qui DEBORDE : le defilement horizontal, le contenu ampute par un
// ancetre qui clippe, un element declare masque et rendu quand meme, et
// deux textes dont l'encre se superpose.
//
// Separee de la seconde sonde parce que ces quatre controles partagent une
// meme question, la GEOMETRIE, et parce que les deux reunies passaient le
// plafond de 400 lignes que ce depot s'impose. L'outil de verification est
// tenu a la regle qu'il fait respecter.

export const PROBE = ({ asked }) => {
  // ATTENTION : on ne demande PAS sa largeur a la fenetre.
  //
  // Sur un contexte mobile, quand le document deborde, Chromium ELARGIT la
  // fenetre de mise en page : a 390 px demandes sur une page qui defile de
  // 142, window.innerWidth vaut 532. Un controle qui compare a innerWidth
  // conclut donc que rien ne deborde EXACTEMENT sur les pages cassees,
  // c'est-a-dire la ou il sert. La largeur demandee est passee depuis le banc,
  // et clientWidth sert de secours : lui reste juste.
  const VW = asked || document.documentElement.clientWidth;
  const findings = [];
  const add = (rule, detail, node) => findings.push({ rule, detail, node: node ?? "" });

  // Un contenu replie existe dans le document et n'est jamais peint. Chromium
  // pose content-visibility:hidden sur le contenu d'un <details> ferme : la
  // boite rend zero, mais un Range pose sur le texte rend quand meme des
  // rectangles, poses au meme endroit que l'article. Le banc voyait ainsi le
  // sommaire d'un theme de blog se superposer a chaque paragraphe, sur chaque
  // billet, aux trois largeurs.
  const replie = (el) => {
    const details = el.closest("details:not([open])");
    return !!details && !el.closest("summary");
  };
  const name = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  /* --- 1. Debordement horizontal ----------------------------------
     On ne demande pas au document sa largeur de defilement : on ESSAIE DE
     DEFILER. scrollWidth compte des boites, y compris celles d'un decor pose
     en absolu que le navigateur ne rend jamais atteignable ; sur la page de
     contact d'un theme il annoncait 797 px pour 768, et la page ne bougeait
     pas d'un pixel. Le seul fait qui interesse un visiteur, c'est de savoir si
     sa page part de travers quand il la pousse. */
  // Mesure DEUX FOIS. Un decor anime peut deborder a un instant de sa course
  // et rentrer a l'instant suivant : un seul essai transforme une frame en
  // verdict, et le banc rend alors un chiffre qui ne se reproduit pas. On ne
  // signale que ce qui deborde encore au second essai.
  const scrollBefore = window.scrollX;
  const essai = () => {
    window.scrollTo(VW, window.scrollY);
    const x = Math.round(window.scrollX);
    window.scrollTo(scrollBefore, window.scrollY);
    return x;
  };
  const defilementReel = Math.min(essai(), essai());

  if (defilementReel > 1) {
    const wide = [...document.querySelectorAll("body *")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > VW + 1;
    });
    add("debordement", `la page defile de ${defilementReel}px a l'horizontale`,
      wide.slice(0, 3).map(name).join(", "));
  }

  /* --- 1 bis. Coupe par un ancetre qui clippe ----------------------
     Le controle ci-dessus ne suffit pas, et la nuit du 31 aout l'a montre : la
     barre de la page d'apercu portait un bouton d'achat dont le bord droit
     tombait 19 px au-dela de la fenetre, sur un conteneur en overflow:hidden.
     scrollWidth etait donc EGAL a innerWidth, la page ne defilait pas, et le
     controle de debordement annoncait vert. Le bouton n'etait pas repousse
     hors ecran : il etait coupe, et personne ne pouvait acheter depuis un
     telephone.
     On regarde donc ce qui est PEINT au-dela du bord, pas ce que le document
     declare. Restreint au texte et a l'interactif : un halo ou une photo qui
     depasse est une intention de mise en page, un bouton qui depasse est une
     vente perdue. */
  for (const el of document.querySelectorAll("a[href], button, input, select, h1, h2, h3, p, li, [role=button]")) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
    if (s.position === "fixed" || s.position === "absolute") continue;
    if (replie(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const past = Math.round(r.right - VW);
    if (past <= 1) continue;
    // Un ancetre qui clippe transforme le depassement en amputation, SAUF
    // quand le contenu reste JOIGNABLE.
    //
    // Deux facons de rester joignable, et la premiere est la seule qui ne se
    // devine pas. Un ancetre qui DEFILE vraiment (overflow-x auto ou scroll,
    // et une largeur de contenu superieure a sa boite) ramene le contenu d'un
    // geste : la recherche s'arrete la, meme si un ancetre plus haut clippe.
    // Sans cette sortie, une barre de rubriques qui se fait glisser au doigt
    // sur telephone puis se replie en pastilles sur ecran large etait comptee
    // comme amputee autant de fois qu'elle portait de rubriques, et une
    // page en produisait cent cinquante a elle seule.
    //
    // La seconde est un RAPPORT. Une piste porte un contenu bien plus large
    // que sa boite (1748 px dans 350 sur le carrousel d'avis d'Aloha, soit
    // cinq fois) ; une barre cassee deborde de quelques pour cent (19 px sur
    // 390, la nuit du 31 aout). Au-dela d'une fois et demie, on est sur une
    // piste, meme quand elle clippe sans defiler.
    let clipped = false;
    for (let n = el.parentElement; n && !clipped; n = n.parentElement) {
      const o = getComputedStyle(n);
      const defile = o.overflowX === "auto" || o.overflowX === "scroll";
      if (defile && n.scrollWidth > n.clientWidth + 1) break;
      if (o.overflowX !== "hidden" && o.overflowX !== "clip") continue;
      if (n.scrollWidth > n.clientWidth * 1.5) break;
      clipped = true;
    }
    if (clipped) {
      add("coupe", `deborde de ${past}px et un ancetre clippe : la partie hors cadre est perdue`,
        `${name(el)} "${el.textContent.trim().slice(0, 24)}"`);
    }
  }

  /* --- 1 ter. Collision d'utilitaires d'affichage -------------------
     Tailwind emet .inline-flex APRES .hidden, et les deux pesent le meme
     poids de specificite : une chaine de classes partagee qui porte deja un
     affichage fait perdre le "hidden" pose par l'appelant, et l'element reste
     visible sur telephone. Le piege est ecrit dans AGENTS.md, et il vivait
     quand meme dans la barre d'Aloha, ou il poussait le bouton du menu hors
     de sa pastille. Une regle documentee n'est pas une regle tenue. */
  const BREAKPOINT = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
  const DISPLAY = /^(block|flex|inline-flex|grid|inline|inline-block|inline-grid|table|contents|flow-root)$/;
  const sombre = document.documentElement.classList.contains("dark");
  for (const el of document.querySelectorAll(".hidden")) {
    if (getComputedStyle(el).display === "none") continue;
    // Un "hidden sm:flex" DOIT s'afficher a 640 et au-dela : ce n'est pas un
    // defaut, c'est la declaration. On cherche donc la plus petite bascule
    // d'affichage declaree sur l'element, et on ne signale que si le rendu
    // contredit l'auteur : visible en dessous de sa propre bascule, ou visible
    // alors qu'aucune bascule n'a ete demandee.
    // L'attribut, et non la propriete className : sur un <svg>, className est
    // un SVGAnimatedString, pas une chaine, et l'ancienne lecture rendait une
    // liste vide. L'icone de l'interrupteur de theme n'avait donc jamais de
    // bascule aux yeux du banc.
    const classes = (el.getAttribute("class") ?? "").split(/\s+/);
    let from = Infinity;
    for (const cls of classes) {
      const [prefix, value] = cls.split(":");
      if (value && DISPLAY.test(value) && BREAKPOINT[prefix]) from = Math.min(from, BREAKPOINT[prefix]);
      // Le mode sombre est une bascule comme les autres. La lune de
      // l'interrupteur de theme s'ecrit "hidden dark:block" : masquee en clair,
      // affichee en sombre, et c'est l'auteur qui l'a demande. Depuis que le
      // banc mesure les deux modes (5 septembre 2026), un element qui porte une
      // variante dark: d'affichage sur une page dont <html> porte .dark est
      // affiche a dessein. Sans cette clause, la premiere passe sombre a
      // signale cette icone sur chacune des cinquante-quatre pages de Reef.
      if (value && DISPLAY.test(value) && prefix === "dark" && sombre) from = 0;
    }
    if (VW >= from) continue;
    const declared = from === Infinity ? "aucune bascule declaree" : `sa bascule est a ${from}px`;
    add("affichage", `porte .hidden et s'affiche quand meme en ${getComputedStyle(el).display} (${declared})`,
      `${name(el)} "${el.textContent.trim().slice(0, 24)}"`);
  }

  /* --- 2. Encre superposee ----------------------------------------
     On mesure la boite du TEXTE via un Range, pas celle de l'element :
     c'est ce que le navigateur a reellement peint. */
  // La fenetre de decoupe de tous les ancetres qui rognent. Sans elle, les
  // lignes effacees par un -webkit-line-clamp sont TOUJOURS rendues par
  // getClientRects() : elles restent dans le document, invisibles a l'oeil et
  // bien presentes a la mesure. Un controle qui les compte punit la
  // reparation, puisque agrandir la boite y fait entrer une ligne coupee de
  // plus.
  const clipWindow = (el) => {
    let top = -Infinity, bottom = Infinity, left = -Infinity, right = Infinity;
    // On part de l'ELEMENT, pas de son parent. Un -webkit-line-clamp pose son
    // overflow:hidden sur le paragraphe lui-meme : commencer au parent laissait
    // passer exactement le cas pour lequel cette fenetre a ete ecrite, et le
    // banc annoncait 1237 chevauchements sur un theme de blog, tous entre un
    // extrait tronque et la ligne d'auteur posee dessous.
    for (let n = el; n; n = n.parentElement) {
      const o = getComputedStyle(n);
      const rogne = o.overflow !== "visible" || o.overflowX !== "visible" || o.overflowY !== "visible";
      if (!rogne) continue;
      const b = n.getBoundingClientRect();
      top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
      left = Math.max(left, b.left); right = Math.min(right, b.right);
    }
    return { top, bottom, left, right };
  };

  const inked = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const win = clipWindow(el);
    const rects = [...r.getClientRects()].filter(
      (b) =>
        b.width > 0 &&
        b.height > 0 &&
        // Une ligne n'est gardee que si sa MOITIE au moins survit a la decoupe.
        Math.min(b.bottom, win.bottom) - Math.max(b.top, win.top) > b.height / 2 &&
        Math.min(b.right, win.right) - Math.max(b.left, win.left) > 0,
    );
    if (!rects.length) return null;
    return {
      x: Math.min(...rects.map((b) => b.left)),
      y: Math.min(...rects.map((b) => b.top)),
      r: Math.max(...rects.map((b) => b.right)),
      b: Math.max(...rects.map((b) => b.bottom)),
    };
  };
  const leaves = [...document.querySelectorAll("p, h1, h2, h3, h4, span, a, li, td, th, button, label")]
    .filter((el) => {
      if (!el.textContent.trim()) return false;
      if (el.querySelector("p, h1, h2, h3, h4, span, a, li, td, th, button, label")) return false;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return false;
      if (replie(el)) return false;
      // Un element positionne hors flux se superpose par construction.
      return s.position === "static" || s.position === "relative";
    })
    .map((el) => ({
      el,
      box: inked(el),
      text: el.textContent.trim().slice(0, 30),
      size: parseFloat(getComputedStyle(el).fontSize),
    }))
    .filter((x) => x.box && x.box.r - x.box.x > 0);

  // Le bloc qui gouverne la mise en ligne. Deux mots du MEME bloc sont poses
  // par le moteur de rendu, qui ne les fait jamais se percuter : leurs boites
  // d'encre se recouvrent verticalement des que l'interligne descend sous 1,
  // ce qui est le cas de tous nos grands titres. Les comparer reviendrait a
  // signaler la typographie serree comme un defaut. Le vrai chevauchement,
  // celui du 31 aout sur la boutique, est ENTRE deux blocs voisins : une
  // colonne flex comprimee sous la largeur de son mot deborde sur sa voisine.
  const blockOf = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      if (!getComputedStyle(n).display.startsWith("inline")) return n;
    }
    return document.body;
  };
  leaves.forEach((leaf) => { leaf.block = blockOf(leaf.el); });

  for (let a = 0; a < leaves.length; a++) {
    for (let c = a + 1; c < leaves.length; c++) {
      const A = leaves[a], B = leaves[c];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (A.block === B.block) continue;
      const ox = Math.min(A.box.r, B.box.r) - Math.max(A.box.x, B.box.x);
      const oy = Math.min(A.box.b, B.box.b) - Math.max(A.box.y, B.box.y);
      // Une boite de ligne est plus haute que ses glyphes : elle porte de quoi
      // loger une jambe de "p" et un accent de capitale, meme quand le mot
      // n'en a pas. Sur un titre de 120 px cela fait une trentaine de pixels
      // qui mordent sur le bloc du dessous sans qu'un seul trait ne se touche.
      // Le seuil suit donc la taille du texte au lieu d'etre un chiffre fixe.
      // Le vrai defaut du 31 aout, un prix pose SUR un nom de theme, mordait
      // de dix-sept pixels sur du texte de vingt-quatre : trois fois ce seuil.
      const marge = 0.28 * Math.max(A.size, B.size);
      if (ox > 1 && oy > Math.max(1, marge)) {
        add("encre", `"${A.text}" et "${B.text}" se superposent sur ${Math.round(ox)}x${Math.round(oy)}px`,
          `${name(A.el)} / ${name(B.el)}`);
      }
    }
  }

  return findings;
};
