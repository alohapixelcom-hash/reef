// scripts/verify.lisibilite.mjs - ce qui se lit : contraste, cibles, hierarchie, alternatives.
//
// Ce qui SE LIT : le contraste sur le fond reellement peint, la taille des
// cibles tactiles, la hierarchie des titres et les textes alternatifs.
//
// Seconde moitie du banc. La premiere (verify.probe.mjs) mesure des
// positions ; celle-ci mesure de la lisibilite. Chacune est autonome :
// Playwright serialise la fonction et l'execute dans la page, elle ne peut
// donc rien importer.

export const LISIBILITE = ({ TARGET_MIN }) => {
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

  // Les feuilles de texte, et de quoi les mesurer. Ce bloc est le jumeau de
  // celui de verify.probe.mjs, et la duplication est assumee : les deux sondes
  // sont serialisees separement et executees dans la page, ou aucun import
  // n'existe. Une trentaine de lignes en double contre deux fichiers qui se
  // lisent d'une traite et tiennent sous le plafond de la maison.
  //
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

  /** Les noeuds de texte qu'un element peint LUI-MEME, sans ses descendants. */
  const propres = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());

  const inked = (el, noeuds) => {
    const win = clipWindow(el);
    const rects = [];
    for (const n of noeuds) {
      const r = document.createRange();
      r.selectNodeContents(n);
      rects.push(...r.getClientRects());
    }
    const gardes = rects.filter(
      (b) =>
        b.width > 0 &&
        b.height > 0 &&
        // Une ligne n'est gardee que si sa MOITIE au moins survit a la decoupe.
        Math.min(b.bottom, win.bottom) - Math.max(b.top, win.top) > b.height / 2 &&
        Math.min(b.right, win.right) - Math.max(b.left, win.left) > 0,
    );
    if (!gardes.length) return null;
    return {
      x: Math.min(...gardes.map((b) => b.left)),
      y: Math.min(...gardes.map((b) => b.top)),
      r: Math.max(...gardes.map((b) => b.right)),
      b: Math.max(...gardes.map((b) => b.bottom)),
    };
  };

  // CE QU'ON MESURE : TOUT ELEMENT QUI PEINT SON PROPRE TEXTE.
  //
  // La premiere version partait d'une liste de balises et ne gardait que
  // celles qui n'en contenaient aucune autre. Elle manquait donc exactement la
  // forme la plus courante de la maison : un element qui porte une icone ET
  // du texte. La bande de confiance d'Aloha en est faite, et ses huit
  // wordmarks etaient a 2,51 pour 1 sans que le banc n'en dise rien, pendant
  // que Lighthouse les signalait. Le critere est maintenant le bon : un
  // element compte s'il a lui-meme un noeud de texte non vide, et on ne mesure
  // que CE texte, pas celui de ses enfants, qui seront comptes chez eux.
  const leaves = [...document.querySelectorAll("body *")]
    .filter((el) => {
      if (!propres(el).length) return false;
      // CACHE DE L'ARBRE D'ACCESSIBILITE : pas de contraste a exiger. Le grand
      // nombre "404" de Koa est pose en encre a quinze pour cent, aria-hidden,
      // et son commentaire dit pourquoi : c'est le titre qui porte, le nombre
      // ne fait que dater la scene. Aucun lecteur d'ecran ne l'annonce, aucun
      // oeil n'a besoin de le lire, et axe l'ignore aussi. Exiger 3 pour 1
      // dessus reviendrait a punir un decor declare comme tel.
      if (el.closest('[aria-hidden="true"]')) return false;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return false;
      if (replie(el)) return false;
      // Un element positionne hors flux se superpose par construction.
      return s.position === "static" || s.position === "relative";
    })
    .map((el) => ({
      el,
      box: inked(el, propres(el)),
      text: propres(el).map((n) => n.textContent).join(" ").trim().slice(0, 30),
      size: parseFloat(getComputedStyle(el).fontSize),
    }))
    .filter((x) => x.box && x.box.r - x.box.x > 0);

  /* --- 3. Contraste, calcule sur le fond REEL ---------------------- */
  // Chromium ne convertit PAS oklab(), oklch() ni color-mix() en rgb() : le
  // panneau de verre de la barre rend "oklab(1 0 0 / 0.1)", qu'une lecture par
  // expression reguliere prenait pour une absence de fond. La boucle remontait
  // alors jusqu'au fond du document et annoncait 1,03 pour 1 sur du texte blanc
  // pose sur une photographie sombre, parfaitement lisible. Un canevas d'un
  // pixel resout n'importe quelle syntaxe de couleur, alpha compris, parce que
  // c'est le moteur lui-meme qui peint.
  const pixel = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  pixel.globalCompositeOperation = "copy";
  const rgb = (value) => {
    if (!value || value === "transparent" || value === "none") return null;
    // Une valeur que le moteur refuse laisse fillStyle inchange : c'est le seul
    // signal disponible pour distinguer "illisible" de "noir".
    pixel.fillStyle = "#ff00ff";
    pixel.fillStyle = value;
    if (pixel.fillStyle === "#ff00ff" && !/^#f{0,1}f0{2}f{2}$|magenta/i.test(value)) return null;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  /* Deux couleurs superposees n'en font qu'une : c'est ce que peint le moteur. */
  const melange = (dessus, dessous) => ({
    r: dessus.r * dessus.a + dessous.r * (1 - dessus.a),
    g: dessus.g * dessus.a + dessous.g * (1 - dessus.a),
    b: dessus.b * dessus.a + dessous.b * (1 - dessus.a),
    a: 1,
  });

  // Les surfaces que cette sonde ne sait PAS lire : une image, une video, une
  // toile. Leur rectangle est releve une fois pour la page ; un texte qui
  // tombe dessus est declare non mesurable, quoi qu'en disent ses ancetres.
  // C'est ce cas, et lui seul, qui justifiait l'ancienne regle "un fond
  // translucide n'est pas un fond" : le nom de la marque, blanc, pose sur le
  // panneau de verre de la barre, lui-meme pose sur une photographie en <img>
  // que la remontee des ancetres ne voit jamais.
  const medias = [...document.querySelectorAll("img, video, canvas, svg[data-photo]")]
    .map((m) => m.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);

  /** Melange une pile de couches translucides, du bas vers le haut, sur un socle opaque. */
  const composer = (couches, socle) => {
    let fond = socle;
    for (let i = couches.length - 1; i >= 0; i--) fond = melange(couches[i], fond);
    return fond;
  };
  // LE FOND REEL, PAR COMPOSITION.
  //
  // La premiere version s'arretait des qu'un fond avait moins de 95 pour cent
  // d'opacite et declarait le contraste non mesurable. Elle se taisait donc
  // sur toute une famille de surfaces parfaitement calculables : une teinte
  // posee a dix pour cent sur une carte opaque. Lighthouse, lui, compose et
  // mesure. Le 7 septembre 2026 il a trouve ainsi, sur les sept themes, une
  // etiquette de rubrique a 3,98 pour 1 la ou il en faut 4,5, que ce banc
  // avait laissee passer depuis le premier jour.
  //
  // On empile donc les couches translucides et on les melange sur la premiere
  // couleur opaque rencontree. On ne se tait plus que devant ce qu'on ne peut
  // vraiment pas lire : une image de fond, ou un media qui passe dessous.
  const backdrop = (el, boite) => {
    if (boite && medias.some((m) => m.left < boite.r && m.right > boite.x && m.top < boite.b && m.bottom > boite.y)) {
      return { image: true };
    }
    const couches = [];
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== "none") return { image: true };
      const c = rgb(s.backgroundColor);
      if (!c || c.a === 0) continue;
      if (c.a >= 0.95) return { color: composer(couches, c) };
      couches.push(c);
    }
    const fond = rgb(getComputedStyle(document.body).backgroundColor);
    return fond && fond.a >= 0.95 ? { color: composer(couches, fond) } : { image: true };
  };
  for (const { el, text, box } of leaves) {
    const s = getComputedStyle(el);
    const encre = rgb(s.color);
    if (!encre || encre.a < 0.02) continue;
    const back = backdrop(el, box);
    // Non mesurable : on se tait plutot que d'inventer un chiffre.
    if (back.image) continue;
    // UNE ENCRE TRANSLUCIDE EST UNE ENCRE MELANGEE A SON FOND. La premiere
    // version sautait tout texte sous 95 pour cent d'opacite, et se taisait
    // donc sur une ecriture courante de la maison : text-muted-foreground/70.
    // Lighthouse relevait 3,7 pour 1 sur les intitules de colonnes d'un pied
    // de page que ce banc declarait sains.
    const fg = encre.a >= 0.995 ? encre : melange(encre, back.color);
    const size = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, back.color);
    if (got < need) {
      add("contraste", `${got.toFixed(2)}:1 sur "${text}", il en faut ${need}`, name(el));
    }
  }

  /* --- 4. Cibles tactiles ------------------------------------------
     Sur la boite, et c'est le bon endroit : c'est le doigt qui vise. Un lien
     dans un paragraphe est exclu, sa cible est la ligne de texte. */
  const targets = [...document.querySelectorAll("a[href], button, input, select, textarea, [role=button]")];
  for (const el of targets) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") continue;
    if (replie(el)) continue;
    // Un lien EN LIGNE est un morceau de texte, pas une pastille : sa hauteur
    // est celle de sa ligne, et l'agrandir casserait le paragraphe qui le
    // contient. La norme le dit aussi (WCAG 2.5.8 exempte les cibles en
    // ligne). Le critere est le display CALCULE, pas la balise du parent : la
    // premiere version regardait P, LI, TD et SPAN, et manquait donc tous les
    // liens de titre de carte, qui vivent dans un H2 ou un H3.
    if (s.display === "inline") continue;
    // Un lien peut etre en ligne SANS que son display le dise : un <a> pose
    // dans un paragraphe herite parfois d'un display de bloc par un utilitaire
    // voisin. Le signe qui ne trompe pas, c'est que son parent porte beaucoup
    // plus de texte que lui : le lien est alors un morceau de phrase, et sa
    // hauteur est celle de sa ligne.
    const parentText = (el.parentElement?.textContent ?? "").trim().length;
    const ownText = el.textContent.trim().length;
    if (ownText > 0 && parentText > ownText * 1.5) continue;
    // Le lien d'evitement se prend au clavier et jamais au doigt : il n'est
    // rendu qu'au focus, et sa taille au repos ne veut rien dire. L'exclure
    // ici est une decision ecrite, pas un oubli.
    if ((el.className + "").includes("sr-only")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Une commande masquee visuellement (radio d'un groupe pilote au :has(),
    // case d'un interrupteur) mesure un pixel par construction : ce n'est pas
    // elle qu'on touche, c'est son etiquette. La signaler sur chaque page
    // aurait produit le meme defaut partout, et un controle qui rend toujours
    // le meme defaut ne signale pas un defaut du site.
    if (r.width <= 2 && r.height <= 2) {
      const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : el.closest("label");
      const lb = label?.getBoundingClientRect();
      if (lb && lb.height >= TARGET_MIN - 0.5 && lb.width >= TARGET_MIN - 0.5) continue;
      add("cible", `commande masquee de ${Math.round(r.width)}x${Math.round(r.height)}px sans etiquette assez grande`, name(el));
      continue;
    }
    // Un lien PORTANT UN TEXTE se juge sur sa HAUTEUR seule. Sa largeur est
    // celle de son mot : on ne peut pas etaler "FAQ" sur 44 px sans lui coller
    // un rembourrage qui casse la rangee qui le contient, et la norme prevoit
    // exactement ce cas (WCAG 2.5.8, exception d'espacement). Ce qui compte
    // pour le doigt, dans une colonne de liens, c'est le pas vertical.
    // Une commande SANS texte, elle, est une pastille : sa surface entiere est
    // la cible, et les deux mesures comptent.
    const hasText = el.textContent.trim().length > 0;
    if (r.height >= TARGET_MIN - 0.5 && (hasText || r.width >= TARGET_MIN - 0.5)) continue;

    // L'EXCEPTION D'ESPACEMENT, ecrite plutot que supposee.
    //
    // Une commande plus basse que 44 px reste atteignable si personne ne se
    // presse contre elle : c'est ce que dit la norme, et c'est ce qui rend
    // acceptable un bouton compact dans une barre aeree. On mesure donc la
    // place LIBRE au-dessus et en dessous, jusqu'a la commande voisine la plus
    // proche qui partage sa colonne. Si la hauteur du bouton plus cette place
    // atteint 44 px, le doigt a de quoi viser.
    //
    // Sans ce calcul, le banc reclamait 44 px pour le bouton de la barre de
    // deux themes. Le passer en taille md le remontait a 47 px et faisait
    // grandir la barre de ONZE pixels sur toutes les pages : une regle mal
    // calibree fait payer une vraie mise en page pour un defaut qui n'existe
    // pas.
    let above = Infinity;
    let below = Infinity;
    for (const other of targets) {
      if (other === el || el.contains(other) || other.contains(el)) continue;
      const o = other.getBoundingClientRect();
      if (o.width === 0 || o.height === 0) continue;
      if (o.right <= r.left || o.left >= r.right) continue;
      if (o.bottom <= r.top) above = Math.min(above, r.top - o.bottom);
      else if (o.top >= r.bottom) below = Math.min(below, o.top - r.bottom);
    }
    // L'espace libre compte pour moitie de chaque cote, comme une zone morte
    // partagee avec le voisin : deux commandes separees de 20 px ne peuvent
    // pas revendiquer ces 20 px chacune.
    const free = r.height + Math.min(above / 2, 24) + Math.min(below / 2, 24);
    if (free < TARGET_MIN - 0.5) {
      add("cible", `${Math.round(r.width)}x${Math.round(r.height)}px et ${Math.round(free - r.height)}px libres autour, il faut ${TARGET_MIN}`, name(el));
    }
  }

  /* --- 5. Hierarchie des titres ------------------------------------ */
  // Quels titres sont concernes. Un h2 de pied de page ("Produit", "Legal")
  // est une etiquette de colonne : il est petit par choix, et le compter ici
  // aurait produit le meme faux defaut sur chaque page du site. On ne juge
  // donc que les titres qui NOMMENT une section du contenu.
  const isSectionTitle = (el) =>
    el.tagName === "H1" ||
    (!el.closest("footer, nav, aside, dialog") && !!el.closest("section, article, main"));

  // Un titre vit-il a l'ecran ? Le tiroir mobile est un <dialog> ferme : son
  // h2 existe dans le document, ne s'affiche pas, et faisait accuser toutes
  // les pages d'avoir un h2 plus grand que leur h1. Un controle qui rend le
  // meme defaut sur chaque page ne signale pas un defaut du site.
  const visible = (el) => {
    if (el.closest("dialog:not([open])")) return false;
    if (el.closest("[hidden]")) return false;
    if (replie(el)) return false;
    // Un titre reserve aux lecteurs d'ecran n'a pas de taille A L'ECRAN : le
    // comparer a la taille du corps de texte revient a punir une bonne
    // pratique d'accessibilite.
    if ((el.className + "").includes("sr-only")) return false;
    if (getComputedStyle(el).clipPath === "inset(50%)") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const h1 = [...document.querySelectorAll("h1")].filter(visible);
  if (h1.length === 0) add("titre", "aucun h1 sur la page");
  if (h1.length > 1) add("titre", `${h1.length} h1 sur la page, il en faut un`);
  if (h1.length === 1) {
    const size = parseFloat(getComputedStyle(h1[0]).fontSize);
    for (const h2 of [...document.querySelectorAll("h2")].filter(visible).filter(isSectionTitle)) {
      const s2 = parseFloat(getComputedStyle(h2).fontSize);
      // Strictement PLUS GRAND, et non "au moins aussi grand". Un h1 et un h2
      // au meme cran sont un choix de composition defendable : la page pose
      // son titre et ses sections sur le meme registre, et d'autres signes
      // font la hierarchie (position, surtitre, fond). Ce qui n'est jamais un
      // choix, c'est un titre de page rendu PLUS PETIT que les titres de ses
      // propres sections.
      if (s2 > size + 0.5) {
        add("titre", `un h2 est rendu a ${s2}px, plus grand que le h1 a ${size}px`, name(h2));
        break;
      }
    }
  }

  /* --- 5 bis. Un titre a la taille d'un paragraphe ------------------
     Mesure de verite, posee apres le defaut du 31 aout : sur quatre themes,
     tailwind-merge supprimait la taille de base des titres passes par tv(),
     parce qu'il range "text-display-sm" et "text-foreground" dans le meme
     groupe et ne garde que le dernier. Le titre de page retombait a la taille
     heritee, soit 16 px sur telephone. La classe etait bien dans le source :
     seul le HTML produit disait la verite.
     Ce controle ne cherche donc pas une classe, il compare deux nombres. Il
     attrape cette cause-la et toutes les autres. */
  const bodySize = parseFloat(getComputedStyle(document.body).fontSize);
  for (const heading of [...document.querySelectorAll("h1, h2")].filter(visible).filter(isSectionTitle)) {
    const size = parseFloat(getComputedStyle(heading).fontSize);
    // EGAL, et non "au plus egal". Ce controle cherche une signature precise :
    // un titre qui a HERITE la taille du corps parce que sa classe de taille a
    // ete supprimee en chemin. Un intitule volontairement plus petit que le
    // corps (une etiquette de section en petites capitales, 12 px) est un
    // choix editorial courant et n'a rien a voir avec ce defaut. Punir les
    // deux aurait rendu le controle inutilisable sur deux themes.
    if (Math.abs(size - bodySize) < 0.5) {
      add("titre", `${heading.tagName.toLowerCase()} rendu a ${size}px, soit exactement la taille du corps de texte : sa classe de taille a disparu`,
        `${name(heading)} "${heading.textContent.trim().slice(0, 30)}"`);
    }
  }

  /* --- 6. Textes alternatifs --------------------------------------- */
  for (const img of document.querySelectorAll("img")) {
    if (!img.hasAttribute("alt")) add("alt", "image sans attribut alt", img.getAttribute("src")?.slice(-40) ?? "");
  }

  return findings;
};
