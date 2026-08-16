// src/js/spring.ts - le moteur de mouvement des gestes : ressort interruptible, projection de momentum, resistance aux bords.
//
// Pourquoi un ressort plutot qu'une transition CSS
// -----------------------------------------------
// Une transition CSS a une duree fixe et part d'une valeur decidee a l'avance.
// Elle ne peut donc pas etre attrapee en vol : si l'utilisateur ressaisit un
// panneau qui se referme, la transition doit d'abord finir, puis repartir. Le
// saut se voit, et l'interface cesse d'etre une chose qu'on manipule pour
// redevenir une chose qu'on regarde.
//
// Un ressort n'a pas de duree. Il a une position, une vitesse et une cible.
// Changer la cible en cours de route ne casse rien : la vitesse actuelle est
// conservee et le mouvement reste continu. C'est la seule facon d'obtenir une
// animation qu'on peut saisir, inverser et relacher a tout moment.
//
// Deux reglages, pas trois
// ------------------------
// On ne parle pas de masse, de raideur et d'amortissement : ces trois nombres
// ne veulent rien dire pour l'oeil. On expose les deux parametres qu'un
// designer peut reellement juger :
//
//   damping   1.0 = aucun depassement, arrivee nette. En dessous, ca rebondit.
//   response  le temps, en secondes, que met la valeur a rejoindre sa cible.
//             Ce n'est PAS une duree : un ressort n'en a pas. C'est un reglage
//             de vivacite.
//
// Regle de gout : damping 1.0 partout par defaut. Le rebond ne se merite que
// si le geste lui-meme portait de l'elan (un lancer, un relachement rapide).
// Un menu qui apparait en rebondissant fait jouet ; une carte qu'on a lancee
// et qui depasse legerement fait juste.

export interface SpringOptions {
  /** 1 = critique (aucun depassement). En dessous de 1, la valeur depasse et oscille. */
  damping?: number;
  /** Vivacite, en secondes. Plus petit = plus vif. */
  response?: number;
  /** Vitesse initiale, dans l'unite de la valeur par seconde. C'est par la que passe l'elan du geste. */
  velocity?: number;
  /** Ecart en dessous duquel on considere le ressort arrive. */
  epsilon?: number;
}

export interface SpringHandle {
  /** Change la cible sans interrompre le mouvement : la vitesse en cours est conservee. */
  setTarget(value: number): void;
  /** La position affichee a cet instant. C'est elle qu'on relit pour repartir d'ou l'on est. */
  get value(): number;
  /** La vitesse a cet instant, pour la passer a un autre ressort lors d'un enchainement. */
  get velocity(): number;
  /** Arrete tout, sans rappel de fin. */
  stop(): void;
}

/**
 * Anime une valeur vers une cible et appelle `onFrame` a chaque image.
 *
 * L'integration se fait a pas fixe (voir SUBSTEP) plutot qu'au pas de l'image :
 * un ressort integre avec un dt variable change de comportement selon la
 * charge de la machine, ce qui donne un mouvement different sur un portable
 * qui rame et sur un ecran a 120 Hz. A pas fixe, il est identique partout.
 */
export function spring(
  from: number,
  to: number,
  onFrame: (value: number, velocity: number) => void,
  options: SpringOptions = {},
  onRest?: () => void,
): SpringHandle {
  const { damping = 1, response = 0.4, velocity = 0, epsilon = 0.01 } = options;

  // Conversion des deux reglages lisibles vers les coefficients de l'equation.
  // omega est la pulsation propre : 2 pi / response.
  const omega = (2 * Math.PI) / Math.max(response, 0.0001);
  const zeta = Math.max(damping, 0);

  let x = from;
  let v = velocity;
  let target = to;
  let raf = 0;
  let last = 0;
  let stopped = false;

  // 1/240 s : assez fin pour que le mouvement soit identique a 60 et a 120 Hz,
  // assez gros pour ne jamais couter cher.
  const SUBSTEP = 1 / 240;
  // Plafond de rattrapage : apres un changement d'onglet, le temps ecoule peut
  // valoir plusieurs secondes. Sans plafond on integrerait des centaines de
  // pas d'un coup et le ressort exploserait.
  const MAX_CATCHUP = 0.064;

  const step = (dt: number): void => {
    // Ressort amorti classique : a = -omega^2 (x - cible) - 2 zeta omega v
    const a = -(omega * omega) * (x - target) - 2 * zeta * omega * v;
    v += a * dt;
    x += v * dt;
  };

  const tick = (now: number): void => {
    if (stopped) return;
    const elapsed = last === 0 ? SUBSTEP : Math.min((now - last) / 1000, MAX_CATCHUP);
    last = now;

    let remaining = elapsed;
    while (remaining > 0) {
      step(Math.min(SUBSTEP, remaining));
      remaining -= SUBSTEP;
    }

    // Arrivee : proche de la cible ET presque arrete. Tester seulement la
    // distance ferait figer un ressort qui traverse sa cible a pleine vitesse.
    if (Math.abs(x - target) < epsilon && Math.abs(v) < epsilon * omega) {
      x = target;
      v = 0;
      onFrame(x, 0);
      stopped = true;
      onRest?.();
      return;
    }

    onFrame(x, v);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return {
    setTarget(value: number): void {
      target = value;
      if (stopped) {
        stopped = false;
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    },
    get value(): number {
      return x;
    },
    get velocity(): number {
      return v;
    },
    stop(): void {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}

/**
 * Ou le geste allait-il s'arreter ?
 *
 * Au relachement, on ne choisit pas la cible depuis le point de lache mais
 * depuis le point ou l'elan aurait porte le doigt. C'est ce qui fait qu'un
 * petit coup sec projette loin, alors qu'un deplacement lent et long ne
 * projette pas du tout : l'interface repond a l'intention, pas seulement a la
 * distance parcourue.
 *
 * C'est la meme decroissance exponentielle que celle du defilement inertiel.
 * La formule de manuel v carre sur deux a n'est PAS celle-la et donne un
 * resultat sensiblement different.
 *
 * @param velocity vitesse au relachement, en pixels par seconde
 * @param deceleration 0.998 pour un toucher de defilement normal, 0.99 pour plus sec
 */
export function project(velocity: number, deceleration = 0.998): number {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/**
 * La resistance des bords.
 *
 * Au-dela d'une limite, l'element continue de suivre le doigt mais de moins en
 * moins. Un arret net se lit comme un blocage, donc comme une panne. Une
 * resistance progressive se lit comme "il n'y a rien de plus par la", ce qui
 * est l'information qu'on veut donner.
 *
 * @param overshoot de combien on a depasse la limite
 * @param dimension la taille de reference de l'element (sa hauteur ou sa largeur)
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  const abs = Math.abs(overshoot);
  const damped = (abs * dimension * constant) / (dimension + constant * abs);
  return overshoot < 0 ? -damped : damped;
}

/**
 * Un petit historique de positions, pour connaitre la vitesse au relachement.
 *
 * On ne peut pas se contenter des deux derniers evenements de pointeur : leur
 * ecart de temps est parfois d'une milliseconde, et la vitesse calculee part
 * alors a l'infini. On regarde une courte fenetre glissante, ce qui lisse le
 * bruit sans introduire de retard perceptible.
 */
export class VelocityTracker {
  private samples: { value: number; time: number }[] = [];
  constructor(private readonly window = 100) {}

  add(value: number, time = performance.now()): void {
    this.samples.push({ value, time });
    while (this.samples.length > 1 && time - this.samples[0]!.time > this.window) {
      this.samples.shift();
    }
  }

  /** Vitesse en unites par seconde. Zero tant qu'il n'y a pas de quoi la calculer. */
  get velocity(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0]!;
    const last = this.samples[this.samples.length - 1]!;
    const dt = (last.time - first.time) / 1000;
    if (dt <= 0) return 0;
    return (last.value - first.value) / dt;
  }

  reset(): void {
    this.samples.length = 0;
  }
}

/** Le mouvement est-il refuse par l'utilisateur ? Interroge a chaque geste, jamais mis en cache. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
