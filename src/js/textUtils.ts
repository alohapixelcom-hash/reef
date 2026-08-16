// src/js/textUtils.ts - utilitaires texte purs : slug, humanisation, date en-US, temps de lecture.

/** "Reading the Room, at Scale!" -> "reading-the-room-at-scale". Retire les accents, ne garde que [a-z0-9-]. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "customer-stories" ou "pubDate" -> "Customer stories" / "Pub date". L'inverse approximatif de slugify. */
export function humanize(text: string): string {
  const words = text
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Date lisible en-US, "August 14, 2026". Calee sur UTC pour ne pas glisser d'un jour selon le fuseau du build. */
export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export interface ReadingTime {
  words: number;
  minutes: number;
}

/** Temps de lecture a 200 mots par minute, minimum 1 minute. Les balises HTML ne comptent pas. */
export function readingTime(text: string): ReadingTime {
  const words = text
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  // 200 mots par minute et un arrondi au plus proche : c'est la cadence
  // moyenne d'une lecture attentive sur ecran, code compris. Le libelle n'est
  // PAS fabrique ici : il depend de la langue, et cette fonction n'en connait
  // aucune. Les composants formatent eux-memes avec fmt(t.post.minRead).
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}
