// src/moteur/service-image.ts - moteur allume : le service d'image des pages rendues a la demande, celui de l'adapter Cloudflare plus la qualite du build dans chaque adresse /_image.
//
// POSE PAR ALIAS, PAS PAR image.service. moteur.config.mjs redirige vers ce
// fichier le module "@astrojs/cloudflare/image-service-workerd", que l'adapter
// choisit lui-meme pour le mode d'images { build: "compile", runtime:
// "cloudflare-binding" }. Declarer ici un service utilisateur (image.service)
// aurait change deux choses de plus : l'adapter l'aurait charge sous Node pour
// encoder les images des pages figees, a la place de sharp, et son nom entre
// dans l'empreinte de chaque fichier d'image. Par alias, le nom reste celui
// de l'adapter : les pages figees du moteur gardent les memes fichiers, et
// le build statique ne lit jamais ce fichier.
//
// SEULE getURL CHANGE, ET ELLE NE SERT QU'A LA DEMANDE. Une page figee recoit
// l'adresse de ses images d'Astro (addStaticImage, les fichiers de /_astro/),
// sans passer par getURL ; une page rendue a la demande recoit celle-ci, qui
// porte desormais q=. Le reste est la copie du service de l'adapter (14.3) :
// le service de base d'Astro, et une transformation qui rend l'image telle
// quelle, puisque c'est le liant IMAGES qui encode (/_image).
import { baseService } from "astro/assets";
import type { LocalImageService } from "astro";
import { avecQualiteDuBuild } from "./qualite-image";

const service: LocalImageService = {
  ...baseService,
  getURL(options, imageConfig, logger) {
    return baseService.getURL(avecQualiteDuBuild(options), imageConfig, logger);
  },
  async transform(inputBuffer, transform) {
    return { data: inputBuffer, format: transform.format };
  },
};

export default service;
