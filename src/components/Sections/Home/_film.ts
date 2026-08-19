// src/components/Sections/Home/_film.ts - le moteur de la sequence filmee : branche la position de lecture de la video sur la position de defilement.
//
// Ce fichier est separe du composant pour deux raisons de maison : la limite de
// 400 lignes par fichier, et le precede de src/components/ui/_dialog.ts, ou un
// comportement partage vit dans un module a part plutot que dans un <script>
// noye au milieu du balisage.
//
// CYCLE DE VIE. Le routeur client est actif sur ce theme : les scripts d'une
// page s'executent une fois, puis le DOM est echange sous eux. Un module qui se
// contente de faire son travail au chargement laisse donc une page d'accueil
// morte des qu'on y revient par un lien. Mesure au navigateur : apres accueil
// -> articles -> accueil, le rail ne bougeait plus et le texte ne se revelait
// plus. D'ou les trois branchements ci-dessous, qui sont la forme imposee par
// .claude/rules/astro.md :
//   - astro:page-load  : (re)installe, garde par data-film-ready
//   - astro:before-swap: demonte tout, sinon la boucle d'animation et les deux
//                        observateurs de la page precedente continuent de tourner
//   - visibilitychange : arrete la boucle quand l'onglet passe en arriere-plan

type Teardown = () => void;

const mounted = new Set<Teardown>();

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function setup(section: HTMLElement): Teardown | null {
  const video = section.querySelector<HTMLVideoElement>(".film__video");
  const media = section.querySelector<HTMLElement>(".film__media");
  const bloom = section.querySelector<HTMLElement>(".film__bloom");
  const bar = section.querySelector<HTMLElement>(".film__rail i");
  const items = [...section.querySelectorAll<HTMLElement>(".film__item")];
  if (!video || !media) return null;

  // Un seul controleur pour tous les ecouteurs : le demontage en devient une
  // seule ligne, et aucun ecouteur ne peut etre oublie.
  const stopper = new AbortController();
  const { signal } = stopper;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wide = window.matchMedia("(min-width: 1025px)");
  const dense = window.matchMedia("(min-resolution: 1.5dppx)");

  const portrait = () => window.innerWidth <= 1024 && window.innerHeight >= window.innerWidth;

  // Economie de donnees demandee, ou reseau tres lent.
  const thrifty = () => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (!c) return false;
    return Boolean(c.saveData) || /^(slow-)?2g$/.test(c.effectiveType ?? "");
  };

  const animated = () => wide.matches && !reduce.matches && !thrifty();

  const from = Number(section.dataset.from ?? 0);
  const to = Number(section.dataset.to ?? 0);

  let loaded = false;
  let gesture = false;
  let near = false;
  let running = false;
  let raf = 0;
  let cursor = 0;
  let travel = 0;
  let last = "";
  let seekOk = false;
  let tries = 0;
  let firstTry = 0;
  let usePortrait = false;

  function poster() {
    const p = portrait()
      ? (video!.dataset.posterPortrait ?? video!.dataset.poster)
      : video!.dataset.poster;
    if (p && video!.getAttribute("poster") !== p) video!.setAttribute("poster", p);
  }

  function load() {
    if (loaded || !animated()) return;
    loaded = true;
    usePortrait = portrait() && Boolean(video!.dataset.srcPortrait);
    const chosen = usePortrait
      ? video!.dataset.srcPortrait!
      : dense.matches && video!.dataset.srcHd
        ? video!.dataset.srcHd
        : video!.dataset.src!;
    video!.preload = "auto";
    video!.src = chosen;
    video!.load();
    // Une premiere lecture immediatement mise en pause : c'est le seul moyen
    // fiable d'amorcer le decodeur sur les navigateurs mobiles, qui refusent de
    // se deplacer dans une video jamais lue.
    video!.addEventListener(
      "loadedmetadata",
      () => {
        const p = video!.play();
        if (p) {
          p.then(() => {
            video!.pause();
            try {
              video!.currentTime = 0.001;
            } catch {
              /* le decodeur n'est pas pret : le prochain tick reessaiera */
            }
          }).catch(() => {});
        }
      },
      { once: true, signal },
    );
    video!.addEventListener("seeked", () => { seekOk = true; }, { once: true, signal });
    video!.addEventListener(
      "error",
      () => {
        video!.style.display = "none";
        media!.style.backgroundImage = `url(${video!.getAttribute("poster") ?? ""})`;
        media!.style.backgroundSize = "cover";
        media!.style.backgroundPosition = "center";
      },
      { once: true, signal },
    );
  }

  function tryLoad() {
    if (!gesture || !near || loaded || !animated()) return;
    const push = () =>
      "requestIdleCallback" in window
        ? (window as unknown as { requestIdleCallback: (f: () => void, o?: object) => void })
            .requestIdleCallback(load, { timeout: 2500 })
        : setTimeout(load, 200);
    if (document.readyState === "complete") push();
    else window.addEventListener("load", push, { once: true, signal });
  }

  function progress() {
    const r = section.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    if (span > 40) return clamp(-r.top / span);
    return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
  }

  function place(p: number) {
    items.forEach((el, n) => {
      const a = clamp((p - (0.06 + n * 0.055)) * 8);
      el.style.opacity = String(a);
      el.style.transform = `translate3d(0,${((1 - a) * 2.1).toFixed(3)}em,0)`;
    });
  }

  function release() {
    items.forEach((el) => { el.style.opacity = ""; el.style.transform = ""; });
    section.classList.remove("film--live");
  }

  function tick() {
    const p = progress();
    const key = p.toFixed(5);
    if (key !== last) {
      last = key;
      if (bar) bar.style.width = `${(p * 100).toFixed(2)}%`;
      media!.style.transform = `scale(${(1.06 - p * 0.055).toFixed(4)}) translateZ(0)`;
      if (bloom) bloom.style.opacity = (p * p * 0.85).toFixed(3);
      place(p);
    }

    const d = video!.duration;
    if (d && isFinite(d) && video!.readyState > 0 && !section.classList.contains("film--looping")) {
      const begin = usePortrait ? 0 : from < d ? from : 0;
      let end = !usePortrait && to > begin && to <= d ? to : d;
      // Garde-fou de cadence : au moins ~1,2 px de defilement par image.
      const most = travel / 36;
      if (end - begin > most) end = begin + most;

      const target = begin + p * (end - begin - 0.05);
      cursor += (target - cursor) * 0.2;

      if (!video!.seeking && Math.abs(video!.currentTime - cursor) > 0.015) {
        if (!firstTry) firstTry = performance.now();
        tries++;
        try {
          video!.currentTime = cursor;
        } catch {
          /* deplacement refuse : le compteur d'essais decidera du repli */
        }
        // Le deplacement n'aboutit pas : on renonce et on lit en boucle.
        if (!seekOk && tries > 40 && performance.now() - firstTry > 8000 && p > 0.15) {
          section.classList.add("film--looping");
          video!.loop = true;
          video!.muted = true;
          video!.play()?.catch(() => {});
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  const start = () => {
    if (!running && animated() && !document.hidden) {
      running = true;
      raf = requestAnimationFrame(tick);
    }
  };
  const stop = () => {
    if (running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };

  function configure() {
    const live = animated();
    section.classList.toggle("film--flat", !live);
    section.classList.toggle("film--live", live);
    if (!loaded) poster();
    const span = section.offsetHeight - window.innerHeight;
    travel = span > 40 ? span : window.innerHeight + section.offsetHeight;
    last = "";
    if (!live) { stop(); release(); return; }
    place(progress());
    tryLoad();
    start();
  }

  configure();

  (["wheel", "touchstart", "touchmove", "pointerdown", "keydown"] as const).forEach((e) =>
    window.addEventListener(e, () => { gesture = true; tryLoad(); },
      { once: true, passive: true, signal }),
  );

  // Un onglet en arriere-plan ne doit pas garder une boucle d'animation vivante.
  document.addEventListener("visibilitychange",
    () => (document.hidden ? stop() : start()), { signal });

  const seen = new IntersectionObserver((es) => {
    if (es[0]?.isIntersecting) { near = true; tryLoad(); }
  }, { rootMargin: "400px 0px" });
  const active = new IntersectionObserver((es) => (es[0]?.isIntersecting ? start() : stop()),
    { rootMargin: "150px 0px" });

  if ("IntersectionObserver" in window) {
    seen.observe(section);
    active.observe(section);
  } else { near = true; gesture = true; tryLoad(); start(); }

  let timer = 0;
  window.addEventListener("resize",
    () => { clearTimeout(timer); timer = window.setTimeout(configure, 120); },
    { passive: true, signal });

  return () => {
    stop();
    clearTimeout(timer);
    seen.disconnect();
    active.disconnect();
    stopper.abort();
    delete section.dataset.filmReady;
  };
}

function boot() {
  document.querySelectorAll<HTMLElement>("[data-film]").forEach((section) => {
    if (section.dataset.filmReady !== undefined) return;
    section.dataset.filmReady = "";
    const teardown = setup(section);
    if (teardown) mounted.add(teardown);
  });
}

function unmountAll() {
  mounted.forEach((fn) => fn());
  mounted.clear();
}

boot();
document.addEventListener("astro:page-load", boot);
document.addEventListener("astro:before-swap", unmountAll);
