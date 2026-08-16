# Icones - le set Aloha

60 icones dessinees a la main pour le theme : grille `0 0 24 24`, trait de 2 a
bouts ronds, `stroke="currentColor"`, aucun `fill`. Aucune bibliotheque
importee : les traces vivent dans `icons.ts` et nulle part ailleurs.

## Usage

```astro
---
import Icon from "@components/svg/icons/Icon.astro";
---

<Icon name="wave" />
<Icon name="arrow-right" size={16} />
<Icon name="check" size={24} class="text-accent" />
<Icon name="search" aria-label="Search" />
```

- `name` est type (`IconName`, derive des cles de `icons.ts`) : un nom inconnu
  casse le build, jamais la page.
- `size` (defaut 20) pilote `width` et `height`. Le trait reste a 2 : il
  s'epaissit optiquement aux petites tailles, c'est voulu.
- La couleur vient du texte parent (`text-primary`, `text-muted-foreground`,
  etc.). Jamais de couleur en dur sur une icone.
- Decorative par defaut (`aria-hidden="true"`). Une icone porteuse de sens
  recoit un `aria-label`, qui la passe en `role="img"`.

## Ajouter une icone

Une entree dans `icons.ts` : une liste de chemins `d` traces dans la grille
24x24, contenu entre 2 et 22, cercles dessines en deux arcs. Pas de `fill`,
pas de `transform`, pas de copier-coller d'une bibliotheque externe.

`wave` est la signature du theme : deux courbes sinusoidales paralleles, a
poser pres du logo et dans les separateurs de section.
