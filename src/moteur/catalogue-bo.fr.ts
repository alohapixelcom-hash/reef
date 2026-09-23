// src/moteur/catalogue-bo.fr.ts - le dictionnaire francais du theme pour le back office : ce qu'EmDash 0.38 n'a pas encore traduit.
//
// COMMENT LE LIRE. A gauche, le texte anglais tel qu'il sort du catalogue
// source du moteur, au caractere pres : c'est la cle, et elle doit rester
// exacte. A droite, le francais que lit l'editeur. Rien d'autre n'est ecrit
// ici : la mecanique est dans catalogue-bo.regles.ts, le branchement dans
// catalogue-bo.ts, et la preuve dans catalogue-bo.selfcheck.ts.
//
// TROIS LISTES, TROIS ROLES.
//   SIMPLES     les messages sans variable, poses seulement la ou le moteur
//               laisse encore l'anglais.
//   COMPOSES    les messages a variables. Leur forme compilee par Lingui sert
//               de cle (du JSON), parce que c'est elle que le moteur compare.
//   IDENTIQUES  les textes qui s'ecrivent pareil en francais : noms propres,
//               langages de programmation, sigles, gabarits. Ils sont ecrits
//               un par un pour que le self-check puisse exiger une couverture
//               entiere : rien ne peut rester anglais par oubli.
//   MAISON      les mots de la maison, poses meme par-dessus une traduction du
//               moteur. Voir la note qui precede la liste.
//
// LA MISE A JOUR D'EMDASH. Quand le moteur traduit enfin un message, notre
// entree devient inutile : le self-check la signale en "entree morte", et on
// la retire. Quand il reformule une phrase anglaise, la cle ne correspond plus
// et le self-check la signale de la meme facon. Dans les deux cas le back
// office reste correct entre-temps : au pire il affiche ce que le moteur dit.
import type { Dictionnaire } from "./catalogue-bo.regles";

const SIMPLES: Record<string, string> = {
  "2. Go to <0>Tools → Export</0>": "2. Allez dans <0>Outils → Exporter</0>",
  "A media folder with this name already exists": "Un dossier de médias porte déjà ce nom",
  "A publication time has not been selected": "Aucune heure de publication n'a été choisie",
  "A publishing action is already in progress": "Une publication est déjà en cours",
  "A source and target locale are required": "Une langue de départ et une langue d'arrivée sont nécessaires",
  "About focal point": "À propos du point d'intérêt",
  "About inferred bylines": "À propos des collaborateurs déduits",
  "Activation cannot be confirmed. Keep editing paused and refresh the status.":
    "L'activation ne peut pas être confirmée. Laissez l'édition en pause et rafraîchissez l'état.",
  "Add another byline": "Ajouter un autre collaborateur",
  "Add byline": "Ajouter un collaborateur",
  "Add dark mode variant": "Ajouter une variante pour le mode sombre",
  "Add new folder": "Ajouter un dossier",
  "Add row above": "Ajouter une ligne au-dessus",
  "Add row below": "Ajouter une ligne en dessous",
  Admin: "Administration",
  Advanced: "Avancé",
  "All uploads finished": "Tous les envois sont terminés",
  "Alt text is not applicable to folders": "Le texte alternatif ne s'applique pas aux dossiers",
  "An encrypted digital key you unlock using your fingerprint, face, PIN, or device password.":
    "Une clé numérique chiffrée que vous déverrouillez avec votre empreinte, votre visage, votre code ou le mot de passe de votre appareil.",
  "Animated WebP files become still images when cropped.": "Un fichier WebP animé devient une image fixe une fois recadré.",
  "Another editor": "Une autre personne",
  "Approve with that device's face, fingerprint, PIN, or passcode.":
    "Confirmez sur cet appareil par le visage, l'empreinte, le code PIN ou le code d'accès.",
  Archives: "Archives",
  "Ask an administrator to complete this setup.": "Demandez à une personne administratrice de terminer cette installation.",
  "Aspect ratio": "Proportions",
  "Authorized approvers": "Personnes habilitées à approuver",
  Automatic: "Automatique",
  "Available bylines": "Collaborateurs disponibles",
  "Back to Main library": "Retour à la bibliothèque principale",
  "Before you continue:": "Avant de continuer :",
  "Browse files": "Parcourir les fichiers",
  "Browse files to upload": "Parcourir les fichiers à envoyer",
  "Browse the <0>marketplace</0> to install plugins, or add them to your astro.config.mjs.":
    "Parcourez la <0>place de marché</0> pour installer des modules d'extension, ou ajoutez-les à votre astro.config.mjs.",
  Byline: "Collaborateur",
  Calendar: "Calendrier",
  "Cancel remaining": "Annuler le reste",
  "Capture is being prepared. Keep editing paused until setup is complete.":
    "La capture se prépare. Laissez l'édition en pause jusqu'à la fin de l'installation.",
  "Cell split": "Cellule séparée",
  Cells: "Cellules",
  "Cells merged": "Cellules fusionnées",
  "Change publication date": "Changer la date de publication",
  "Change schedule": "Changer la programmation",
  "Changes apply everywhere this byline appears.": "Les modifications s'appliquent partout où ce collaborateur apparaît.",
  "Check experimental.registry in astro.config.mjs, then restart EmDash.":
    "Vérifiez experimental.registry dans astro.config.mjs, puis redémarrez EmDash.",
  "Check experimental.registry.aggregatorUrl in astro.config.mjs, then restart EmDash.":
    "Vérifiez experimental.registry.aggregatorUrl dans astro.config.mjs, puis redémarrez EmDash.",
  "Check experimental.registry.policy.minimumReleaseAge in astro.config.mjs, then restart EmDash.":
    "Vérifiez experimental.registry.policy.minimumReleaseAge dans astro.config.mjs, puis redémarrez EmDash.",
  "Check experimental.registry.policy.minimumReleaseAgeExclude in astro.config.mjs, then restart EmDash.":
    "Vérifiez experimental.registry.policy.minimumReleaseAgeExclude dans astro.config.mjs, puis redémarrez EmDash.",
  "Check the server logs, then use the media usage recovery API for the failed work.":
    "Consultez les journaux du serveur, puis utilisez l'API de reprise du suivi des médias pour le travail en échec.",
  "Checking this device for passkey support...": "Vérification de la prise en charge des clés d'accès sur cet appareil...",
  "Choose Touch ID or another available credential manager, then confirm with your fingerprint or Mac password.":
    "Choisissez Touch ID ou un autre gestionnaire d'identifiants disponible, puis confirmez avec votre empreinte ou le mot de passe de votre Mac.",
  "Choose Windows Hello or another available credential manager, then confirm with your PIN, fingerprint, or face.":
    "Choisissez Windows Hello ou un autre gestionnaire d'identifiants disponible, puis confirmez avec votre code PIN, votre empreinte ou votre visage.",
  "Choose a credential manager on this device, another device, or a security key.":
    "Choisissez un gestionnaire d'identifiants sur cet appareil, un autre appareil, ou une clé de sécurité.",
  "Choose a date range": "Choisissez une période",
  "Choose a file from the library or upload a new one.": "Choisissez un fichier dans la bibliothèque, ou envoyez-en un nouveau.",
  "Choose a new publication time for this draft.": "Choisissez une nouvelle heure de publication pour ce brouillon.",
  "Choose an image from the library or upload a new one.": "Choisissez une image dans la bibliothèque, ou envoyez-en une nouvelle.",
  "Choose another option": "Choisir une autre option",
  "Choose bylines": "Choisir les collaborateurs",
  "Choose files to upload": "Choisissez les fichiers à envoyer",
  "Choose replacement image": "Choisir l'image de remplacement",
  "Choose when these changes replace the live version.": "Choisissez quand ces modifications remplaceront la version en ligne.",
  "Choose when this draft becomes public.": "Choisissez quand ce brouillon devient public.",
  "Choosing a byline replaces this automatic credit.": "Choisir un collaborateur remplace cette signature automatique.",
  "Clear completed": "Effacer les envois terminés",
  "Close byline search": "Fermer la recherche de collaborateurs",
  "Close image settings": "Fermer les réglages de l'image",
  "Code block actions": "Actions du bloc de code",
  "Column added after": "Colonne ajoutée après",
  "Column added before": "Colonne ajoutée avant",
  "Column width decreased": "Colonne rétrécie",
  "Column width increased": "Colonne élargie",
  "Column width resized": "Largeur de colonne modifiée",
  "Column widths reset": "Largeurs de colonnes réinitialisées",
  "Columns distributed evenly": "Colonnes réparties également",
  Complete: "Terminé",
  "Confirm using the secure prompt from your device or credential manager.":
    "Confirmez dans la fenêtre sécurisée de votre appareil ou de votre gestionnaire d'identifiants.",
  "Confirm with Face ID, Touch ID, or your device passcode.": "Confirmez avec Face ID, Touch ID ou le code de votre appareil.",
  "Confirm with your fingerprint, face, or PIN.": "Confirmez avec votre empreinte, votre visage ou votre code PIN.",
  "Content locale": "Langue du contenu",
  "Content types with the same group share a collapsible folder in the sidebar":
    "Les types de contenu qui partagent un groupe se rangent dans un même dossier repliable du rail",
  "Content using this media item may show a broken reference.":
    "Les contenus qui utilisent ce fichier peuvent afficher une référence cassée.",
  "Continue with another device": "Continuer avec un autre appareil",
  "Continue with security key": "Continuer avec une clé de sécurité",
  Copied: "Copié",
  "Copy code": "Copier le code",
  "Copy failed": "La copie a échoué",
  "Could not insert section": "La section n'a pas pu être insérée",
  "Could not load media.": "Les fichiers multimédias n'ont pas pu être chargés.",
  "Could not load this folder.": "Ce dossier n'a pas pu être chargé.",
  "Couldn’t confirm whether the media item or selected folder still exists. Try again.":
    "Impossible de confirmer que le fichier ou le dossier choisi existe encore. Réessayez.",
  "Couldn’t load media usage tracking settings.": "Impossible de charger les réglages du suivi de l'utilisation des médias.",
  "Couldn’t load more usage.": "Impossible de charger d'autres utilisations.",
  "Couldn’t load usage.": "Impossible de charger les utilisations.",
  "Couldn’t move file": "Le fichier n'a pas pu être déplacé",
  "Couldn’t search bylines.": "Impossible de rechercher des collaborateurs.",
  "Create a reusable public profile, then add it to this post.":
    "Créez un profil public réutilisable, puis ajoutez-le à ce billet.",
  "Create and add": "Créer et ajouter",
  "Create cropped copy": "Créer une copie recadrée",
  "Create passkey": "Créer une clé d'accès",
  "Create your first content type": "Créez votre premier type de contenu",
  "Created and updated": "Création et mise à jour",
  "Creating cropped copy...": "Création de la copie recadrée...",
  Crop: "Recadrer",
  "Crop output dimensions": "Dimensions du recadrage",
  "Crop selection. Use the Arrow keys to move it.": "Zone de recadrage. Utilisez les flèches pour la déplacer.",
  "Cropped copy created.": "Copie recadrée créée.",
  "Current cell": "Cellule courante",
  "Dark mode variant": "Variante pour le mode sombre",
  "Date range": "Période",
  "Decrease column width": "Rétrécir la colonne",
  "Delete columns": "Supprimer les colonnes",
  "Delete folder": "Supprimer le dossier",
  "Delete media?": "Supprimer ce fichier ?",
  "Delete rows": "Supprimer les lignes",
  "Describe the image": "Décrivez l'image",
  "Describe the image's purpose and relevant details for people who cannot see it.":
    "Décrivez à quoi sert l'image et ce qu'elle montre, pour les personnes qui ne la voient pas.",
  Destination: "Destination",
  Details: "Détails",
  "Dismiss section error": "Masquer l'erreur de section",
  "Dismiss table paste error": "Masquer l'erreur de collage du tableau",
  "Display size": "Taille d'affichage",
  "Distribute columns evenly": "Répartir les colonnes également",
  "Draft changes": "Modifications en brouillon",
  "Draft version": "Version brouillon",
  "Drag and drop files here": "Glissez-déposez vos fichiers ici",
  "Drop an image here or <0>browse</0>": "Déposez une image ici ou <0>parcourez vos fichiers</0>",
  "Drop files to upload": "Déposez les fichiers à envoyer",
  "Drop one image at a time.": "Déposez une seule image à la fois.",
  "Edit asset": "Modifier le média",
  "Edit dark mode asset": "Modifier le média du mode sombre",
  "Edit folder": "Modifier le dossier",
  "Edit image": "Modifier l'image",
  "Edit locking": "Verrouillage à l'édition",
  "Edit name and slug": "Modifier le nom et le slug",
  "Edit role": "Modifier le rôle",
  "Editors can select a second image that the site shows in dark mode.":
    "Les rédacteurs peuvent choisir une seconde image, que le site affiche en mode sombre.",
  "EmDash does not keep the previous image.": "EmDash ne conserve pas l'image précédente.",
  "EmDash does not keep the uncropped image.": "EmDash ne conserve pas l'image non recadrée.",
  "EmDash is scanning existing content.": "EmDash parcourt le contenu existant.",
  "EmDash never receives your PIN, password, or biometric information.":
    "EmDash ne reçoit jamais votre code PIN, votre mot de passe ni vos données biométriques.",
  "EmDash will continue setup and resume scanning existing content.":
    "EmDash poursuivra l'installation et reprendra le parcours du contenu existant.",
  "EmDash will scan existing content to show where media is used.":
    "EmDash parcourra le contenu existant pour montrer où chaque média est utilisé.",
  "Enable tracking": "Activer le suivi",
  "Enable tracking to index existing content and keep references up to date.":
    "Activez le suivi pour indexer le contenu existant et tenir les références à jour.",
  "English is used because no content locale is configured. Content locale is stored with the entry and is separate from your admin language.":
    "L'anglais est utilisé parce qu'aucune langue de contenu n'est configurée. La langue du contenu est enregistrée avec l'entrée ; elle est indépendante de la langue de votre back office.",
  "Enter a name.": "Saisissez un nom.",
  "Every place using this image will update to the cropped version.":
    "Partout où cette image est utilisée, c'est la version recadrée qui apparaîtra.",
  "Every place using this image will update to the selected version.":
    "Partout où cette image est utilisée, c'est la version choisie qui apparaîtra.",
  "Existing content is indexed. New changes are tracked automatically.":
    "Le contenu existant est indexé. Les modifications suivantes sont suivies automatiquement.",
  "Failed to create media folder": "Échec lors de la création du dossier de médias",
  "Failed to delete media folder": "Échec lors de la suppression du dossier de médias",
  "Failed to fetch media folder": "Échec lors de la lecture du dossier de médias",
  "Failed to fetch media folders": "Échec lors de la lecture des dossiers de médias",
  "Failed to fetch media usage details": "Échec lors de la lecture du détail d'utilisation des médias",
  "Failed to lock the entry": "Échec lors du verrouillage de l'entrée",
  "Failed to release the entry lock": "Échec lors de la libération du verrou de l'entrée",
  "Failed to rename media folder": "Échec lors du renommage du dossier de médias",
  "Failed to replace media image": "Échec lors du remplacement de l'image",
  "Failed to verify plugin": "Échec lors de la vérification du module d'extension",
  "Files upload as soon as you add them.": "Les fichiers partent dès que vous les ajoutez.",
  "Finish any current edits.": "Terminez les modifications en cours.",
  "First page": "Première page",
  "First publication": "Première publication",
  "Fix invalid fields before changing the publication date":
    "Corrigez les champs invalides avant de changer la date de publication",
  "Fix invalid fields before changing the schedule": "Corrigez les champs invalides avant de changer la programmation",
  "Focal point": "Point d'intérêt",
  "Focal point. Use arrow keys to move it.": "Point d'intérêt. Utilisez les flèches pour le déplacer.",
  Folder: "Dossier",
  "Folder deleted": "Dossier supprimé",
  "Folder name must be between 1 and 200 characters": "Le nom du dossier doit faire entre 1 et 200 caractères",
  "Folder no longer exists": "Le dossier n'existe plus",
  "Folder no longer exists. Returned to the main library.": "Le dossier n'existe plus. Retour à la bibliothèque principale.",
  "Folder successfully created": "Dossier créé",
  "Folder successfully edited": "Dossier modifié",
  "Folder unavailable": "Dossier indisponible",
  Folders: "Dossiers",
  "Folders could not be loaded.": "Les dossiers n'ont pas pu être chargés.",
  "Folders navigation": "Navigation dans les dossiers",
  "For the best import experience, install the <0>EmDash Exporter</0> plugin on your WordPress site.":
    "Pour un import sans accroc, installez l'extension <0>EmDash Exporter</0> sur votre site WordPress.",
  "Format:": "Format :",
  Freeform: "Libre",
  "From URL": "Depuis une adresse",
  "From the post owner": "D'après la personne propriétaire du billet",
  "Generated automatically.": "Généré automatiquement.",
  Genres: "Genres",
  Group: "Groupe",
  "Handle unavailable": "Identifiant indisponible",
  "Header column added": "Colonne d'en-tête ajoutée",
  "Header column removed": "Colonne d'en-tête retirée",
  "Header row": "Ligne d'en-tête",
  "Header row added": "Ligne d'en-tête ajoutée",
  "Header row removed": "Ligne d'en-tête retirée",
  Headers: "En-têtes",
  "Hold an entry while someone is editing it, and refuse other writers":
    "Réserver une entrée pendant qu'une personne la modifie, et refuser les autres",
  Hooks: "Hooks",
  Hour: "Heure",
  "I've set it up \u2014 check again": "C'est configuré, vérifiez à nouveau",
  "INVALID HANDLE": "IDENTIFIANT INVALIDE",
  "Image actions": "Actions sur l'image",
  "Image replaced.": "Image remplacée.",
  "Image upload failed. Try again.": "L'envoi de l'image a échoué. Réessayez.",
  "In Windows Settings, open Accounts, then Sign-in options, and set up a PIN. Fingerprint and face recognition are optional.":
    "Dans les paramètres de Windows, ouvrez Comptes, puis Options de connexion, et créez un code PIN. L'empreinte et la reconnaissance du visage sont facultatives.",
  "In trash": "À la corbeille",
  Incompatible: "Incompatible",
  "Increase column width": "Élargir la colonne",
  "Independent verification": "Vérification indépendante",
  "Index existing content and keep Used in results up to date.":
    "Indexer le contenu existant et tenir à jour les résultats de « Utilisé dans ».",
  Indexing: "Indexation",
  "Indexing existing content": "Indexation du contenu existant",
  "Insert HTML": "Insérer du HTML",
  "Insert Image": "Insérer une image",
  "Insert image": "Insérer une image",
  "Insert or tap your security key when the browser asks.":
    "Insérez ou approchez votre clé de sécurité quand le navigateur le demande.",
  "Insert paragraph after": "Insérer un paragraphe après",
  "Insert paragraph before": "Insérer un paragraphe avant",
  "Insert table": "Insérer un tableau",
  Installation: "Installation",
  "Installation is unavailable.": "L'installation est indisponible.",
  "It is stored by the authenticator or credential manager you selected in the secure system prompt.":
    "Elle est enregistrée par l'authentificateur ou le gestionnaire d'identifiants que vous avez choisi dans la fenêtre sécurisée du système.",
  "Its listing has not been approved for display. Check back later.":
    "Sa fiche n'a pas encore été approuvée pour affichage. Revenez plus tard.",
  "I’ve completed these steps and understand tracking can’t be turned off.":
    "J'ai suivi ces étapes et je comprends que le suivi ne pourra plus être désactivé.",
  "Jane Doe": "Jeanne Dupont",
  "Keep aspect ratio": "Conserver les proportions",
  "Keep editing paused and deploy a compatible EmDash version before continuing.":
    "Laissez l'édition en pause et déployez une version compatible d'EmDash avant de continuer.",
  "Keep editing paused, fix the server issue, then retry setup.":
    "Laissez l'édition en pause, corrigez le problème serveur, puis relancez l'installation.",
  "Keep this page open until setup finishes. If you leave, return to continue where it stopped.":
    "Gardez cette page ouverte jusqu'à la fin de l'installation. Si vous la quittez, revenez pour reprendre où elle s'est arrêtée.",
  "Keep typing to narrow the list.": "Continuez à taper pour affiner la liste.",
  Landscape: "Paysage",
  "Last page": "Dernière page",
  "Live version": "Version en ligne",
  "Load more folders": "Charger plus de dossiers",
  "Loading folders": "Chargement des dossiers",
  "Loading folders...": "Chargement des dossiers...",
  "Loading media": "Chargement des fichiers multimédias",
  "Loading media usage tracking settings…": "Chargement des réglages du suivi de l'utilisation des médias…",
  "Loading usage": "Chargement des utilisations",
  "Local time": "Heure locale",
  Location: "Emplacement",
  "Location unavailable": "Emplacement indisponible",
  "Main library": "Bibliothèque principale",
  "Media details": "Détails du fichier",
  "Media in this folder will return to Main library. No files will be deleted.":
    "Les fichiers de ce dossier retourneront à la bibliothèque principale. Aucun fichier ne sera supprimé.",
  "Media pagination": "Pagination des fichiers multimédias",
  "Media results": "Résultats des fichiers multimédias",
  "Media usage tracking": "Suivi de l'utilisation des médias",
  "Media usage tracking is indexing existing content": "Le suivi de l'utilisation des médias indexe le contenu existant",
  "Media usage tracking is off": "Le suivi de l'utilisation des médias est désactivé",
  "Media usage tracking is ready": "Le suivi de l'utilisation des médias est prêt",
  "Media usage tracking is setting up": "Le suivi de l'utilisation des médias s'installe",
  "Media usage tracking needs attention": "Le suivi de l'utilisation des médias demande votre attention",
  "Merge selected cells": "Fusionner les cellules choisies",
  Mixed: "Mixte",
  "More information about Alt text": "En savoir plus sur le texte alternatif",
  "More information about Display size": "En savoir plus sur la taille d'affichage",
  "More table actions": "Autres actions du tableau",
  "Move media here from Media Details.": "Déplacez un fichier ici depuis les détails du fichier.",
  "Move the focal point to choose what stays visible in cropped images.":
    "Déplacez le point d'intérêt pour choisir ce qui reste visible dans les images recadrées.",
  "Moved to paragraph after table": "Déplacé vers le paragraphe après le tableau",
  "Moved to paragraph before table": "Déplacé vers le paragraphe avant le tableau",
  "Needs attention": "Demande votre attention",
  "New folder": "Nouveau dossier",
  "New reusable profile": "Nouveau profil réutilisable",
  "Next, the browser's passkey window will open": "Ensuite, la fenêtre de clé d'accès du navigateur s'ouvrira",
  "No Windows Hello authenticator found": "Aucun authentificateur Windows Hello trouvé",
  "No built-in passkey authenticator found": "Aucun authentificateur de clé d'accès intégré n'a été trouvé",
  "No bylines available.": "Aucun collaborateur disponible.",
  "No files added": "Aucun fichier ajouté",
  "No folders found": "Aucun dossier trouvé",
  "No provenance was supplied; the signed publisher policy permits this.":
    "Aucune provenance n'a été fournie ; la politique signée de l'éditeur l'autorise.",
  "No usage": "Aucune utilisation",
  "No usage to show yet": "Aucune utilisation à montrer pour l'instant",
  Off: "Désactivé",
  "Only image files can be dropped here.": "Seuls des fichiers image peuvent être déposés ici.",
  Open: "Ouvrir",
  "Open Windows settings": "Ouvrir les paramètres de Windows",
  "Open read-only": "Ouvrir en lecture seule",
  "Open setup": "Ouvrir l'installation",
  "Open the dashboard": "Ouvrir le tableau de bord",
  "Optional hover text": "Texte au survol (facultatif)",
  "Or browse files from your computer": "Ou parcourez les fichiers de votre ordinateur",
  Original: "Original",
  "Original image cropped.": "Image d'origine recadrée.",
  "Output size": "Taille en sortie",
  "Page number": "Numéro de page",
  "Page size": "Nombre par page",
  "Paragraph inserted after table": "Paragraphe inséré après le tableau",
  "Paragraph inserted before table": "Paragraphe inséré avant le tableau",
  Parent: "Parent",
  "Passkey created": "Clé d'accès créée",
  "Passkeys require a <0>secure context</0>: use <1>HTTPS</1>, or open the admin at <2>http://localhost</2> (with your dev port). Plain <3>http://</3> on a custom hostname is not treated as secure, even on loopback.":
    "Les clés d'accès exigent un <0>contexte sécurisé</0> : utilisez <1>HTTPS</1>, ou ouvrez le back office sur <2>http://localhost</2> (avec votre port de développement). Un simple <3>http://</3> sur un nom de domaine personnalisé n'est pas considéré comme sécurisé, même en local.",
  "Pause other tools that update content.": "Mettez en pause les autres outils qui modifient le contenu.",
  "People shown publicly on this post.": "Les personnes affichées publiquement sur ce billet.",
  "Per page": "Par page",
  Period: "Période",
  "Plugin column unavailable": "Colonne du module d'extension indisponible",
  "Plugin not found. The publisher or slug may be incorrect.":
    "Module d'extension introuvable. L'éditeur ou le slug est peut-être incorrect.",
  "Plugin registry configuration error": "Erreur de configuration du registre des modules d'extension",
  "Plugin registry is not configured.": "Le registre des modules d'extension n'est pas configuré.",
  "Press Space to pick up an image. Use the Arrow keys to move it, then press Space to drop it.":
    "Appuyez sur Espace pour saisir une image. Utilisez les flèches pour la déplacer, puis Espace pour la déposer.",
  "Profile CID": "CID du profil",
  "Provenance is verified against the signed release and artifact.":
    "La provenance est vérifiée face à la version signée et à son artefact.",
  "Provenance optional": "Provenance facultative",
  "Provenance required": "Provenance obligatoire",
  "Publication date": "Date de publication",
  "Publish changes": "Publier les modifications",
  "Publish changes now": "Publier les modifications maintenant",
  "Publish now": "Publier maintenant",
  "Published by <0/>": "Publié par <0/>",
  "Publisher approval required for every delegated release":
    "Accord de l'éditeur exigé pour chaque version déléguée",
  "Publisher approval required only for permission escalation":
    "Accord de l'éditeur exigé seulement pour une élévation de permissions",
  "Publisher handle verification failed": "La vérification de l'identifiant de l'éditeur a échoué",
  "Publisher release policy": "Politique de publication de l'éditeur",
  "Publishing summary": "Résumé de la publication",
  Queued: "En file d'attente",
  "Read-only": "Lecture seule",
  "Ready to publish now or schedule for later": "Prêt à publier maintenant ou à programmer pour plus tard",
  "Refresh status": "Rafraîchir l'état",
  "Refresh status before continuing.": "Rafraîchissez l'état avant de continuer.",
  "Release CID": "CID de la version",
  "Reload after updating EmDash before trying again.": "Rechargez la page après avoir mis EmDash à jour, puis réessayez.",
  "Remove assignment": "Retirer l'affectation",
  "Remove dark mode variant": "Retirer la variante pour le mode sombre",
  "Remove from post": "Retirer du billet",
  "Remove image?": "Retirer l'image ?",
  "Remove schedule": "Retirer la programmation",
  "Replace dark mode image": "Remplacer l'image du mode sombre",
  "Replace original": "Remplacer l'original",
  "Replace original image?": "Remplacer l'image d'origine ?",
  "Replace original is available with the Original aspect ratio.":
    "Le remplacement de l'original n'est possible qu'avec les proportions d'origine.",
  "Replacing image...": "Remplacement de l'image...",
  "Replacing original...": "Remplacement de l'original...",
  "Require a slug before content can be published": "Exiger un slug avant qu'un contenu puisse être publié",
  Reset: "Réinitialiser",
  "Reset column widths": "Réinitialiser les largeurs de colonnes",
  "Reset crop": "Réinitialiser le recadrage",
  "Resize crop from bottom edge. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le bord bas. Utilisez les flèches.",
  "Resize crop from bottom-left corner. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le coin bas gauche. Utilisez les flèches.",
  "Resize crop from bottom-right corner. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le coin bas droit. Utilisez les flèches.",
  "Resize crop from left edge. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le bord gauche. Utilisez les flèches.",
  "Resize crop from right edge. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le bord droit. Utilisez les flèches.",
  "Resize crop from top edge. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le bord haut. Utilisez les flèches.",
  "Resize crop from top-left corner. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le coin haut gauche. Utilisez les flèches.",
  "Resize crop from top-right corner. Use the Arrow keys to resize.":
    "Redimensionner le recadrage par le coin haut droit. Utilisez les flèches.",
  "Resize settings panel": "Panneau des réglages de taille",
  "Resolving publisher handle...": "Résolution de l'identifiant de l'éditeur...",
  "Retry copy": "Réessayer la copie",
  "Retry failed": "La nouvelle tentative a échoué",
  "Retry setup": "Relancer l'installation",
  "Retry setup?": "Relancer l'installation ?",
  "Retrying…": "Nouvelle tentative…",
  "Review Verified Plugin": "Examiner le module d'extension vérifié",
  "Review Verified Update": "Examiner la mise à jour vérifiée",
  "Role on this post (optional)": "Rôle sur ce billet (facultatif)",
  Routable: "Adressable",
  "Row added above": "Ligne ajoutée au-dessus",
  "Row added below": "Ligne ajoutée en dessous",
  Rows: "Lignes",
  "Save anyway": "Enregistrer quand même",
  "Save date": "Enregistrer la date",
  "Save or discard the other changes before cropping.":
    "Enregistrez ou abandonnez les autres modifications avant de recadrer.",
  "Save schedule": "Enregistrer la programmation",
  "Scan it with a nearby phone or tablet.": "Scannez-le avec un téléphone ou une tablette à proximité.",
  "Schedule changes": "Programmer les modifications",
  "Schedule date": "Date de programmation",
  "Schedule publication": "Programmer la publication",
  "Scheduled publication": "Publication programmée",
  "Scheduled publishing needs attention": "La publication programmée demande votre attention",
  "Scheduled update": "Mise à jour programmée",
  "Search bylines to add…": "Rechercher des collaborateurs à ajouter…",
  "Search folders": "Rechercher des dossiers",
  "Search reusable public profiles.": "Rechercher des profils publics réutilisables.",
  "Searching…": "Recherche…",
  "See where this file is used.": "Voir où ce fichier est utilisé.",
  "Select a location": "Choisir un emplacement",
  "Select a release before verifying it": "Choisissez une version avant de la vérifier",
  "Select column": "Sélectionner la colonne",
  "Select default social image": "Choisir l'image sociale par défaut",
  "Select favicon": "Choisir la favicone",
  "Select gallery images": "Choisir les images de la galerie",
  "Select logo": "Choisir le logo",
  "Select row": "Sélectionner la ligne",
  "Select table": "Sélectionner le tableau",
  "Selected media": "Fichiers choisis",
  Selection: "Sélection",
  "Set a custom width and height for this image in the document. Reset uses the original media dimensions. The original media file is unchanged.":
    "Fixez une largeur et une hauteur pour cette image dans le document. « Réinitialiser » reprend les dimensions d'origine du fichier. Le fichier lui-même n'est pas modifié.",
  "Set role": "Définir le rôle",
  "Set up Windows Hello": "Configurer Windows Hello",
  "Set up media usage tracking": "Configurer le suivi de l'utilisation des médias",
  "Setting up": "Installation en cours",
  "Setup couldn’t continue. Try again.": "L'installation n'a pas pu continuer. Réessayez.",
  "Shown to readers in this order.": "Affichés aux lecteurs dans cet ordre.",
  "Size is not applicable to folders": "La taille ne s'applique pas aux dossiers",
  Slug: "Slug",
  "Some content may not appear here yet.": "Certains contenus peuvent ne pas encore apparaître ici.",
  "Split merged cell": "Séparer la cellule fusionnée",
  Square: "Carré",
  "Square (1:1)": "Carré (1:1)",
  "Switch to dark": "Passer en mode sombre",
  "Switch to light": "Passer en mode clair",
  "Table cells accept text, links, and formatting only.":
    "Les cellules d'un tableau n'acceptent que du texte, des liens et de la mise en forme.",
  "Table deleted": "Tableau supprimé",
  "Table inserted": "Tableau inséré",
  "Table size": "Taille du tableau",
  "Tables cannot be pasted inside lists or quotes. Paste the table into its own paragraph and try again.":
    "Un tableau ne peut pas être collé dans une liste ou une citation. Collez-le dans son propre paragraphe, puis réessayez.",
  "Take over": "Reprendre la main",
  "Taking over...": "Reprise de la main...",
  Taxonomies: "Taxonomies",
  "The browser controls the exact prompt and may offer another compatible method.":
    "C'est le navigateur qui décide de la fenêtre exacte, et il peut proposer une autre méthode compatible.",
  "The browser will usually show a QR code.": "Le navigateur affichera le plus souvent un QR code.",
  "The credential manager on the phone or tablet you choose saves it. EmDash does not receive the passkey.":
    "C'est le gestionnaire d'identifiants du téléphone ou de la tablette que vous choisissez qui l'enregistre. EmDash ne reçoit pas la clé d'accès.",
  "The cropped image could not be created.": "L'image recadrée n'a pas pu être créée.",
  "The file or folder no longer exists.": "Le fichier ou le dossier n'existe plus.",
  "The latest media request failed. Showing the previous page.":
    "La dernière requête a échoué. La page précédente reste affichée.",
  "The passkey is saved on your physical security key and can be used on compatible devices.":
    "La clé d'accès est enregistrée sur votre clé de sécurité physique et peut servir sur les appareils compatibles.",
  "The publisher identity cannot be verified.": "L'identité de l'éditeur ne peut pas être vérifiée.",
  "The selected folder no longer exists. Choose another location and save again.":
    "Le dossier choisi n'existe plus. Choisissez un autre emplacement et enregistrez à nouveau.",
  "The selected image could not be read.": "L'image choisie n'a pas pu être lue.",
  "This cannot be undone": "Cette action est définitive",
  "This content cannot be edited safely": "Ce contenu ne peut pas être modifié sans risque",
  "This entry changed somewhere else after you opened it.":
    "Cette entrée a changé ailleurs depuis que vous l'avez ouverte.",
  "This entry is open somewhere else": "Cette entrée est ouverte ailleurs",
  "This field contains table content that the editor cannot preserve. Update it through the API before editing or saving this content.":
    "Ce champ contient un tableau que l'éditeur ne sait pas conserver. Modifiez-le par l'API avant de modifier ou d'enregistrer ce contenu.",
  "This file isn’t used in any content.": "Ce fichier n'est utilisé dans aucun contenu.",
  "This folder is empty": "Ce dossier est vide",
  "This folder is empty.": "Ce dossier est vide.",
  "This image could not be loaded for cropping.": "Cette image n'a pas pu être chargée pour le recadrage.",
  "This media item could not be loaded. Try again.": "Ce fichier n'a pas pu être chargé. Réessayez.",
  "This media item no longer exists.": "Ce fichier n'existe plus.",
  "This paste is too large. Paste fewer cells or less text at a time.":
    "Ce collage est trop gros. Collez moins de cellules ou moins de texte à la fois.",
  "This plugin is not available yet": "Ce module d'extension n'est pas encore disponible",
  "This publisher identity no longer resolves.": "Cette identité d'éditeur ne se résout plus.",
  "This publisher's handle does not resolve back to its identity. Installation is disabled until the publisher fixes their handle.":
    "L'identifiant de cet éditeur ne renvoie pas à son identité. L'installation est bloquée tant que l'éditeur ne l'a pas corrigé.",
  "This section contains table content that the editor cannot preserve. Update the section before inserting it.":
    "Cette section contient un tableau que l'éditeur ne sait pas conserver. Modifiez la section avant de l'insérer.",
  "This spreadsheet data has invalid quoted cells. Fix the quotes or remove the tab separators and try again.":
    "Ces données de tableur contiennent des guillemets mal formés. Corrigez-les ou retirez les tabulations, puis réessayez.",
  "This table cannot be edited safely": "Ce tableau ne peut pas être modifié sans risque",
  "This table has unsupported cell formatting, merged cells, or column widths. Paste it as plain text or simplify the table and try again.":
    "Ce tableau contient une mise en forme, des fusions ou des largeurs de colonnes non prises en charge. Collez-le en texte brut ou simplifiez-le, puis réessayez.",
  "This version is not visible on the site": "Cette version n'est pas visible sur le site",
  Time: "Heure",
  "Toggle header column": "Activer ou désactiver la colonne d'en-tête",
  "Tooltip text": "Texte de l'info-bulle",
  "Track where media is used across your content": "Suivre où chaque média est utilisé dans vos contenus",
  "Track where media is used across your content.": "Suivre où chaque média est utilisé dans vos contenus.",
  "Try again.": "Réessayez.",
  "Turn on": "Activer",
  "Turn on media usage tracking?": "Activer le suivi de l'utilisation des médias ?",
  "Turning on…": "Activation…",
  "Type: Folder": "Type : dossier",
  "URL slug": "Slug de l'adresse",
  Unique: "Unique",
  "Unresolved assignment": "Affectation non résolue",
  "Updating usage": "Mise à jour des utilisations",
  "Upload failed": "L'envoi a échoué",
  "Upload files": "Envoyer des fichiers",
  "Uploading image…": "Envoi de l'image…",
  "Usage completeness couldn’t be verified.": "L'exhaustivité des utilisations n'a pas pu être vérifiée.",
  "Usage details aren’t available for your account.": "Le détail des utilisations n'est pas accessible à votre compte.",
  "Usage details unavailable": "Détail des utilisations indisponible",
  "Usage indexing couldn’t finish.": "L'indexation des utilisations n'a pas pu se terminer.",
  "Usage indexing hasn’t started.": "L'indexation des utilisations n'a pas commencé.",
  "Usage is updating. Some content may not appear here yet.":
    "Les utilisations se mettent à jour. Certains contenus peuvent ne pas encore apparaître ici.",
  "Usage loaded": "Utilisations chargées",
  "Usage may be out of date.": "Les utilisations peuvent ne pas être à jour.",
  "Use URL": "Utiliser l'adresse",
  "Use a URL ending in a recognized image extension, such as .jpg or .png.":
    "Utilisez une adresse qui se termine par une extension d'image reconnue, comme .jpg ou .png.",
  "Use a security key": "Utiliser une clé de sécurité",
  "Use another device": "Utiliser un autre appareil",
  "Use as end date": "Utiliser comme date de fin",
  "Use lowercase letters, numbers, and hyphens, starting with a letter.":
    "Utilisez des minuscules, des chiffres et des traits d'union, en commençant par une lettre.",
  "Used in": "Utilisé dans",
  "Verified publisher": "Éditeur vérifié",
  "Verify the plugin before installing it": "Vérifiez le module d'extension avant de l'installer",
  "View setup": "Voir l'installation",
  "Visitors see the published version until the scheduled update":
    "Les visiteurs voient la version publiée jusqu'à la mise à jour programmée",
  "Visitors see this published version": "Les visiteurs voient cette version publiée",
  "Visitors still see the published version": "Les visiteurs voient toujours la version publiée",
  "Wait for updates already in progress to finish.": "Attendez la fin des mises à jour déjà en cours.",
  "We checked before opening the browser's passkey prompt so you can choose what happens next.":
    "Nous avons vérifié avant d'ouvrir la fenêtre de clé d'accès du navigateur, pour que vous puissiez choisir la suite.",
  "What happens next?": "Que se passe-t-il ensuite ?",
  "What is a passkey?": "Qu'est-ce qu'une clé d'accès ?",
  "What you typed is still here. Saving replaces the newer version.":
    "Ce que vous avez saisi est toujours là. Enregistrer remplacera la version plus récente.",
  "Where is it saved?": "Où est-elle enregistrée ?",
  "Why English is used": "Pourquoi l'anglais est utilisé",
  "Why are bylines shown in this order?": "Pourquoi les collaborateurs sont-ils affichés dans cet ordre ?",
  Widths: "Largeurs",
  "Windows Hello still isn't available to this browser. You can try another device or a security key instead.":
    "Windows Hello n'est toujours pas disponible pour ce navigateur. Essayez plutôt un autre appareil ou une clé de sécurité.",
  "Windows will show which credential manager will save it before creating it.":
    "Windows indiquera quel gestionnaire d'identifiants l'enregistrera avant de la créer.",
  "With a passkey, you don’t need to remember complex passwords":
    "Avec une clé d'accès, plus besoin de retenir des mots de passe compliqués",
  "You can view, rename, or add more passkeys later in Security settings.":
    "Vous pourrez consulter, renommer ou ajouter des clés d'accès plus tard, dans les réglages de sécurité.",
  "You do not have permission to edit this asset.": "Vous n'avez pas la permission de modifier ce média.",
  "You don’t have permission to move this file.": "Vous n'avez pas la permission de déplacer ce fichier.",
  "You need Admin permissions to manage media usage tracking.":
    "Il faut les permissions d'administration pour gérer le suivi de l'utilisation des médias.",
  "You no longer hold this entry": "Vous ne détenez plus cette entrée",
  "Your credential manager, such as Google Password Manager, saves it and may sync it to your other devices.":
    "Votre gestionnaire d'identifiants, par exemple Google Password Manager, l'enregistre et peut la synchroniser avec vos autres appareils.",
  "Your credential manager, such as iCloud Keychain, saves it and may sync it to your other devices.":
    "Votre gestionnaire d'identifiants, par exemple le trousseau iCloud, l'enregistre et peut la synchroniser avec vos autres appareils.",
  "Your device's credential manager saves it and will show you where before creating it.":
    "Le gestionnaire d'identifiants de votre appareil l'enregistre, et vous dira où avant de la créer.",
  "the Android passkey prompt": "la fenêtre de clé d'accès d'Android",
  "the Windows passkey prompt": "la fenêtre de clé d'accès de Windows",
  "the macOS passkey prompt": "la fenêtre de clé d'accès de macOS",
  "your device's passkey prompt": "la fenêtre de clé d'accès de votre appareil",
};

/**
 * Les messages a variables, ecrits des deux cotes sous leur forme compilee par
 * Lingui : un texte, puis `["nom"]` pour une variable, `"#"` pour le nombre
 * d'un pluriel, `"<0>"` pour une balise du message. La cle du dictionnaire est
 * le JSON de la forme anglaise ; elle se fabrique plus bas, pour que ce qui se
 * lit ici reste la phrase et non son echappement.
 */
const COMPOSES_SOURCE: [unknown, unknown][] = [
  [
    [["0", "plural", { one: ["Add ", "#", " image"], other: ["Add ", "#", " images"] }]],
    [["0", "plural", { one: ["Ajouter ", "#", " image"], other: ["Ajouter ", "#", " images"] }]],
  ],
  [["Move ", ["0"], " later"], ["Déplacer ", ["0"], " vers la fin"]],
  [
    [["rows", "plural", { one: ["Row deleted"], other: ["#", " rows deleted"] }]],
    [["rows", "plural", { one: ["Ligne supprimée"], other: ["#", " lignes supprimées"] }]],
  ],
  [
    [["0", "plural", { one: ["#", " upload failed"], other: ["#", " uploads failed"] }]],
    [["0", "plural", { one: ["#", " envoi a échoué"], other: ["#", " envois ont échoué"] }]],
  ],
  [["Moved to ", ["0"]], ["Déplacé vers ", ["0"]]],
  [["Move ", ["0"], " earlier"], ["Déplacer ", ["0"], " vers le début"]],
  [[["completedCount"], " of ", ["0"], " complete"], [["completedCount"], " sur ", ["0"], " terminés"]],
  [["Picked up ", ["label"], "."], [["label"], " saisi."]],
  [[["0"], " updated everywhere it appears."], [["0"], " a été mis à jour partout où il apparaît."]],
  [
    ["<0>", ["name"], "</0> is editing this entry. Nothing you change here will be saved."],
    ["<0>", ["name"], "</0> modifie cette entrée. Rien de ce que vous changez ici ne sera enregistré."],
  ],
  [
    ["Showing ", ["pageShowingRange"], " of ", ["0"]],
    ["Affichage de ", ["pageShowingRange"], " sur ", ["0"]],
  ],
  [
    [
      [
        "overdueCount",
        "plural",
        {
          one: [
            "One scheduled item is overdue and the scheduler heartbeat is stale. Run `npx emdash doctor` and verify the deployed Cron Trigger.",
          ],
          other: [
            "#",
            " scheduled items are overdue and the scheduler heartbeat is stale. Run `npx emdash doctor` and verify the deployed Cron Trigger.",
          ],
        },
      ],
    ],
    [
      [
        "overdueCount",
        "plural",
        {
          one: [
            "Une publication programmée est en retard, et le battement du planificateur ne répond plus. Lancez `npx emdash doctor` et vérifiez le Cron Trigger déployé.",
          ],
          other: [
            "#",
            " publications programmées sont en retard, et le battement du planificateur ne répond plus. Lancez `npx emdash doctor` et vérifiez le Cron Trigger déployé.",
          ],
        },
      ],
    ],
  ],
  [
    [["failedCount", "plural", { one: ["#", " upload failed"], other: ["#", " uploads failed"] }]],
    [["failedCount", "plural", { one: ["#", " envoi a échoué"], other: ["#", " envois ont échoué"] }]],
  ],
  [
    ["Plugin ", ["pluginId"], " rejected the save: ", ["reason"]],
    ["Le module d'extension ", ["pluginId"], " a refusé l'enregistrement : ", ["reason"]],
  ],
  [
    [
      ["0", "plural", { one: ["#", " row"], other: ["#", " rows"] }],
      " × ",
      ["1", "plural", { one: ["#", " column"], other: ["#", " columns"] }],
      " selected",
    ],
    [
      ["0", "plural", { one: ["#", " ligne"], other: ["#", " lignes"] }],
      " × ",
      ["1", "plural", { one: ["#", " colonne"], other: ["#", " colonnes"] }],
      " sélectionnées",
    ],
  ],
  [["Replace ", ["label"]], ["Remplacer ", ["label"]]],
  [["More actions for ", ["0"]], ["Autres actions pour ", ["0"]]],
  [
    [["completedCount"], " of ", ["0"], " uploads complete"],
    [["completedCount"], " envois sur ", ["0"], " terminés"],
  ],
  [["Taxonomy not found: ", ["taxonomyName"]], ["Taxonomie introuvable : ", ["taxonomyName"]]],
  [["Delete “", ["0"], "”?"], ["Supprimer « ", ["0"], " » ?"]],
  [[["0"], " fallback"], ["Repli sur ", ["0"]]],
  [[["position"], " of ", ["total"]], [["position"], " sur ", ["total"]]],
  [["Moving ", ["label"], " was cancelled."], ["Le déplacement de ", ["label"], " a été annulé."]],
  [["Create ", ["0"], " translation"], ["Créer la traduction ", ["0"]]],
  [["Remove ", ["0"], " from selection"], ["Retirer ", ["0"], " de la sélection"]],
  [
    [["0", "plural", { one: ["Add ", "#", " file"], other: ["Add ", "#", " files"] }]],
    [["0", "plural", { one: ["Ajouter ", "#", " fichier"], other: ["Ajouter ", "#", " fichiers"] }]],
  ],
  [
    ["This field does not accept ", ["mimeType"], " files."],
    ["Ce champ n'accepte pas les fichiers ", ["mimeType"], "."],
  ],
  [
    ["Replace dark mode variant for ", ["label"]],
    ["Remplacer la variante pour le mode sombre de ", ["label"]],
  ],
  [
    [["0", "plural", { one: ["#", " collection"], other: ["#", " collections"] }]],
    [["0", "plural", { one: ["#", " collection"], other: ["#", " collections"] }]],
  ],
  [["Create “", ["0"], "”"], ["Créer « ", ["0"], " »"]],
  [
    [["0", "plural", { one: ["Row deleted"], other: ["#", " rows deleted"] }]],
    [["0", "plural", { one: ["Ligne supprimée"], other: ["#", " lignes supprimées"] }]],
  ],
  [
    ["Moved ", ["filename"], " to position ", ["0"], "."],
    [["filename"], " a été déplacé en position ", ["0"], "."],
  ],
  [["Available in ", ["0"]], ["Disponible en ", ["0"]]],
  [
    [
      "This field contains unsupported Portable Text marks: <0>",
      ["markList"],
      "</0>. Remove them through the API before editing or saving this content.",
    ],
    [
      "Ce champ contient des marques Portable Text non prises en charge : <0>",
      ["markList"],
      "</0>. Retirez-les par l'API avant de modifier ou d'enregistrer ce contenu.",
    ],
  ],
  [['"', ["0"], '" will be permanently deleted.'], ["« ", ["0"], " » sera supprimé définitivement."]],
  [["Removed ", ["0"], " from selection."], [["0"], " a été retiré de la sélection."]],
  [["Edit folder ", ["0"]], ["Modifier le dossier ", ["0"]]],
  [
    [
      "This section contains unsupported Portable Text marks: <0>",
      ["0"],
      "</0>. Update the section before inserting it.",
    ],
    [
      "Cette section contient des marques Portable Text non prises en charge : <0>",
      ["0"],
      "</0>. Modifiez la section avant de l'insérer.",
    ],
  ],
  [["Role updated for ", ["0"], "."], ["Rôle mis à jour pour ", ["0"], "."]],
  [["Menus (", ["0"], ")"], ["Menus (", ["0"], ")"]],
  [
    ['"', ["0"], '" will be deleted from its media provider.'],
    ["« ", ["0"], " » sera supprimé de son fournisseur de médias."],
  ],
  [[["label"], " moved to position ", ["0"], "."], [["label"], " a été déplacé en position ", ["0"], "."]],
  [["Until ", ["0"]], ["Jusqu'au ", ["0"]]],
  [["Upload to ", ["providerName"]], ["Envoyer vers ", ["providerName"]]],
  [
    ["You'll be signing up as <0>", ["roleName"], "</0>"],
    ["Vous allez créer un compte en tant que <0>", ["roleName"], "</0>"],
  ],
  [
    ["Horizontal ", ["0"], "%, vertical ", ["1"], "%"],
    ["Horizontal ", ["0"], " %, vertical ", ["1"], " %"],
  ],
  [["Open folder ", ["0"]], ["Ouvrir le dossier ", ["0"]]],
  [
    [["previewRows"], " × ", ["previewColumns"], " table"],
    ["Tableau ", ["previewRows"], " × ", ["previewColumns"]],
  ],
  [
    [
      [
        "overdueCount",
        "plural",
        {
          one: [
            "One scheduled item is overdue, but no scheduler run has completed. Run `npx emdash doctor` and verify the deployed Cron Trigger.",
          ],
          other: [
            "#",
            " scheduled items are overdue, but no scheduler run has completed. Run `npx emdash doctor` and verify the deployed Cron Trigger.",
          ],
        },
      ],
    ],
    [
      [
        "overdueCount",
        "plural",
        {
          one: [
            "Une publication programmée est en retard, et aucun passage du planificateur n'est allé au bout. Lancez `npx emdash doctor` et vérifiez le Cron Trigger déployé.",
          ],
          other: [
            "#",
            " publications programmées sont en retard, et aucun passage du planificateur n'est allé au bout. Lancez `npx emdash doctor` et vérifiez le Cron Trigger déployé.",
          ],
        },
      ],
    ],
  ],
  [["Choose a non-empty ", ["0"], " image."], ["Choisissez une image ", ["0"], " non vide."]],
  [[["0"], " added to this post."], [["0"], " a été ajouté à ce billet."]],
  [["Dismiss completed ", ["0"]], ["Masquer ", ["0"], ", terminé"]],
  [["Filter by date range: ", ["rangeLabel"]], ["Filtrer par période : ", ["rangeLabel"]]],
  [
    [
      [
        "overflowCount",
        "plural",
        {
          one: ["#", " file was not added because the upload list is full."],
          other: ["#", " files were not added because the upload list is full."],
        },
      ],
    ],
    [
      [
        "overflowCount",
        "plural",
        {
          one: ["#", " fichier n'a pas été ajouté : la liste d'envoi est pleine."],
          other: ["#", " fichiers n'ont pas été ajoutés : la liste d'envoi est pleine."],
        },
      ],
    ],
  ],
  [
    [["0", "plural", { one: ["#", " file uploading"], other: ["#", " files uploading"] }]],
    [["0", "plural", { one: ["#", " fichier en cours d'envoi"], other: ["#", " fichiers en cours d'envoi"] }]],
  ],
  [
    [
      "Users from <0>",
      ["domain"],
      "</0> will no longer be able to sign up without an invite. Existing users are not affected.",
    ],
    [
      "Les personnes du domaine <0>",
      ["domain"],
      "</0> ne pourront plus créer de compte sans invitation. Les comptes existants ne changent pas.",
    ],
  ],
  [["Retry ", ["0"]], ["Réessayer ", ["0"]]],
  [
    [
      [
        "0",
        "plural",
        {
          one: ["#", " file was not added because the upload list is full."],
          other: ["#", " files were not added because the upload list is full."],
        },
      ],
    ],
    [
      [
        "0",
        "plural",
        {
          one: ["#", " fichier n'a pas été ajouté : la liste d'envoi est pleine."],
          other: ["#", " fichiers n'ont pas été ajoutés : la liste d'envoi est pleine."],
        },
      ],
    ],
  ],
  [[["0"], " removed from this post."], [["0"], " a été retiré de ce billet."]],
  [
    [["rejectedCount", "plural", { one: ["#", " file was not added."], other: ["#", " files were not added."] }]],
    [
      [
        "rejectedCount",
        "plural",
        { one: ["#", " fichier n'a pas été ajouté."], other: ["#", " fichiers n'ont pas été ajoutés."] },
      ],
    ],
  ],
  [
    [
      "<0>",
      ["name"],
      "</0> is editing this entry. Open it read-only, or take over; they will be told the entry moved on.",
    ],
    [
      "<0>",
      ["name"],
      "</0> modifie cette entrée. Ouvrez-la en lecture seule, ou reprenez la main : la personne sera prévenue que l'entrée lui a échappé.",
    ],
  ],
  [[["0"], " updated to v", ["installedVersion"]], [["0"], " mis à jour en v", ["installedVersion"]]],
  [
    [
      [
        "importedFiles",
        "plural",
        { one: ["<count>", "#", "</count> file imported"], other: ["<count>", "#", "</count> files imported"] },
      ],
    ],
    [
      [
        "importedFiles",
        "plural",
        { one: ["<count>", "#", "</count> fichier importé"], other: ["<count>", "#", "</count> fichiers importés"] },
      ],
    ],
  ],
  [["Create ", ["0"]], ["Créer ", ["0"]]],
  [["Scheduled for ", ["formattedSchedule"]], ["Programmé pour le ", ["formattedSchedule"]]],
  [
    ["We've sent a verification link to <0>", ["email"], "</0>"],
    ["Nous avons envoyé un lien de vérification à <0>", ["email"], "</0>"],
  ],
  [
    [["columns", "plural", { one: ["Column deleted"], other: ["#", " columns deleted"] }]],
    [["columns", "plural", { one: ["Colonne supprimée"], other: ["#", " colonnes supprimées"] }]],
  ],
  [
    ["Change publication date: ", ["formattedValue"]],
    ["Changer la date de publication : ", ["formattedValue"]],
  ],
  [["From ", ["0"]], ["À partir du ", ["0"]]],
  [
    ["Select dark mode variant for ", ["label"]],
    ["Choisir la variante pour le mode sombre de ", ["label"]],
  ],
  [
    ["Drop an image here or browse for ", ["label"]],
    ["Déposez une image ici, ou parcourez vos fichiers pour ", ["label"]],
  ],
  [["Next, ", ["0"], " will open"], ["Ensuite, ", ["0"], " s'ouvrira"]],
  [[["rows"], " × ", ["columns"], " table pasted"], ["Tableau ", ["rows"], " × ", ["columns"], " collé"]],
  [
    [["label"], " moved to position ", ["0"], " of ", ["1"], "."],
    [["label"], " a été déplacé en position ", ["0"], " sur ", ["1"], "."],
  ],
  [
    ['"', ["0"], '" will be deleted from ', ["providerName"], "."],
    ["« ", ["0"], " » sera supprimé de ", ["providerName"], "."],
  ],
  [
    [
      "Pattern for generating URLs, e.g. /blog/",
      ["0"],
      ". Tokens: ",
      ["1"],
      ", ",
      ["2"],
      ", and date tokens ",
      ["3"],
      "/",
      ["4"],
      "/",
      ["5"],
      " (also ",
      ["6"],
      "/",
      ["7"],
      "/",
      ["8"],
      ") from the publish date \u2014 e.g. ",
      ["9"],
      " for WordPress-style permalinks.",
    ],
    [
      "Motif de fabrication des adresses, par exemple /blog/",
      ["0"],
      ". Jetons : ",
      ["1"],
      ", ",
      ["2"],
      ", et les jetons de date ",
      ["3"],
      "/",
      ["4"],
      "/",
      ["5"],
      " (aussi ",
      ["6"],
      "/",
      ["7"],
      "/",
      ["8"],
      ") pris sur la date de publication, par exemple ",
      ["9"],
      " pour des permaliens à la WordPress.",
    ],
  ],
  [
    [
      "Review the independently verified release evidence and permissions for ",
      ["pluginName"],
      " before continuing.",
    ],
    [
      "Examinez les preuves de publication vérifiées de façon indépendante et les permissions de ",
      ["pluginName"],
      " avant de continuer.",
    ],
  ],
  [["This field does not accept ", ["0"], " files."], ["Ce champ n'accepte pas les fichiers ", ["0"], "."]],
  [
    [
      "<0>",
      ["name"],
      "</0> now holds this entry, so your changes are no longer being saved. Take it back to carry on.",
    ],
    [
      "<0>",
      ["name"],
      "</0> détient maintenant cette entrée : vos modifications ne sont plus enregistrées. Reprenez la main pour continuer.",
    ],
  ],
  [
    ["Crop area ", ["0"], " by ", ["1"], " pixels."],
    ["Zone de recadrage de ", ["0"], " sur ", ["1"], " pixels."],
  ],
  [[["row"], " × ", ["column"], " table"], ["Tableau ", ["row"], " × ", ["column"]]],
  [["Cancel ", ["0"]], ["Annuler ", ["0"]]],
  [
    ["Moving ", ["label"], " to position ", ["0"], " of ", ["1"], "."],
    ["Déplacement de ", ["label"], " en position ", ["0"], " sur ", ["1"], "."],
  ],
  [
    [
      [
        "rewrittenUrls",
        "plural",
        {
          one: [
            "<rewrittenCount>",
            "#",
            "</rewrittenCount> image URL updated in ",
            [
              "updatedContentItems",
              "plural",
              {
                one: ["<contentCount>", "#", "</contentCount> content item"],
                other: ["<contentCount>", "#", "</contentCount> content items"],
              },
            ],
          ],
          other: [
            "<rewrittenCount>",
            "#",
            "</rewrittenCount> image URLs updated in ",
            [
              "updatedContentItems",
              "plural",
              {
                one: ["<contentCount>", "#", "</contentCount> content item"],
                other: ["<contentCount>", "#", "</contentCount> content items"],
              },
            ],
          ],
        },
      ],
    ],
    [
      [
        "rewrittenUrls",
        "plural",
        {
          one: [
            "<rewrittenCount>",
            "#",
            "</rewrittenCount> adresse d'image mise à jour dans ",
            [
              "updatedContentItems",
              "plural",
              {
                one: ["<contentCount>", "#", "</contentCount> contenu"],
                other: ["<contentCount>", "#", "</contentCount> contenus"],
              },
            ],
          ],
          other: [
            "<rewrittenCount>",
            "#",
            "</rewrittenCount> adresses d'images mises à jour dans ",
            [
              "updatedContentItems",
              "plural",
              {
                one: ["<contentCount>", "#", "</contentCount> contenu"],
                other: ["<contentCount>", "#", "</contentCount> contenus"],
              },
            ],
          ],
        },
      ],
    ],
  ],
  [
    [["0", "plural", { one: ["Column deleted"], other: ["#", " columns deleted"] }]],
    [["0", "plural", { one: ["Colonne supprimée"], other: ["#", " colonnes supprimées"] }]],
  ],
  [
    [["0", "plural", { one: ["#", " folder loaded"], other: ["#", " folders loaded"] }]],
    [["0", "plural", { one: ["#", " dossier chargé"], other: ["#", " dossiers chargés"] }]],
  ],
];

/**
 * Les textes qui s'ecrivent pareil en francais. Ils sont ecrits un par un,
 * et non devines : le self-check exige que chaque message laisse en anglais
 * par le moteur soit ici ou dans une des listes ci-dessus. Sans cette liste,
 * un oubli de traduction et un mot francais par hasard identique auraient
 * exactement la meme apparence.
 */
const IDENTIQUES: string[] = [
  // Proportions et codes de redirection.
  "16:9",
  "3:2",
  "4:3",
  "301 Permanent",
  "308 Permanent (Strict)",
  // Langages, formats et outils, dans la liste des blocs de code.
  "Astro",
  "Bash",
  "C",
  "C#",
  "C++",
  "CSS",
  "Diff",
  "Dockerfile",
  "Go",
  "GraphQL",
  "HTML",
  "JSON",
  "JSX",
  "Java",
  "JavaScript",
  "Kotlin",
  "Lua",
  "MDX",
  "Markdown",
  "PDF",
  "PHP",
  "Python",
  "Ruby",
  "Rust",
  "SCSS",
  "SQL",
  "Svelte",
  "Swift",
  "TOML",
  "TSX",
  "TypeScript",
  "Vue",
  "XML",
  "YAML",
  "Zig",
  "Hooks",
  // Noms propres et sigles.
  "Facebook",
  "GitHub",
  "Instagram",
  "LinkedIn",
  "Twitter",
  "YouTube",
  "Yoast/RankMath",
  "FAQ",
  "SEO",
  "ID",
  "URL",
  "robots.txt",
  // Mots dont le francais est le meme, a la lettre pres.
  "Actions",
  "Archives",
  "Audio",
  "Avatar",
  "Code",
  "Collection",
  "Collections",
  "Date",
  "Description",
  "Destination",
  "Document",
  "Documents",
  "Favicon",
  "Genres",
  "Image",
  "Images",
  "Incompatible",
  "Installation",
  "Logo",
  "Menu",
  "Menus",
  "Minute",
  "Navigation",
  "Original",
  "Pages",
  "Parent",
  "Portrait",
  "Section",
  "Sections",
  "Site",
  "Slug",
  "Source",
  "Structure",
  "Taxonomies",
  "Type",
  "Unique",
  "Validation",
  "Version",
  // Gabarits et exemples : ce sont des valeurs a recopier, pas des phrases.
  "Option 1\nOption 2\nOption 3",
  "admin",
  "auto",
  "em1.…",
  "example.com",
  "https://...",
  "https://example.com/image.jpg",
  "xxxx xxxx xxxx xxxx xxxx xxxx",
  // Messages a variables sans un seul mot a traduire : leur cle est le JSON de
  // la forme compilee, comme pour COMPOSES.
  JSON.stringify([["0"], " • ", ["1"]]),
  JSON.stringify(["Image ", ["0"]]),
  JSON.stringify(["Version ", ["0"]]),
];

/**
 * LES MOTS DE LA MAISON. Poses meme par-dessus une traduction du moteur, ce
 * qui est l'exception et doit le rester : chaque entree porte sa raison.
 *
 * "Widgets" : le catalogue francais d'EmDash garde le mot anglais tel quel
 * (31 messages : "Widget sans titre", "Faites glisser les widgets ici"...).
 * La maison ne laisse pas un libelle anglais dans le rail d'un editeur
 * francais : le mot devient "encart", et tout le vocabulaire des ecrans
 * concernes suit, sans quoi le rail et la page ne diraient pas la meme chose.
 * Une seule exception a l'exception : le "widget" d'un champ de module
 * d'extension n'est pas un encart de contenu, c'est un composant d'interface.
 */
const MAISON_SIMPLES: Record<string, string> = {
  Widgets: "Encarts",
  widget: "encart",
  "Untitled Widget": "Encart sans titre",
  "Widget deleted": "Encart supprimé",
  "Widget added": "Encart ajouté",
  "Widget updated": "Encart mis à jour",
  "Widget title": "Titre de l'encart",
  "Available Widgets": "Encarts disponibles",
  "Write widget content...": "Écrire le contenu de l'encart...",
  "Loading widgets...": "Chargement des encarts...",
  "Failed to load widget": "Échec lors du chargement de l'encart",
  "Failed to delete widget": "Échec lors de la suppression de l'encart",
  "Failed to reorder widgets": "Échec lors de la réorganisation des encarts",
  "Error adding widget": "Erreur lors de l'ajout de l'encart",
  "Error updating widget": "Erreur lors de la mise à jour de l'encart",
  "Error reordering widgets": "Erreur lors de la réorganisation des encarts",
  "Drop to add widget": "Déposer pour ajouter un encart",
  "Drag widgets here to add them": "Faites glisser les encarts ici pour les ajouter",
  "Drag widgets into an area to add them": "Faites glisser les encarts dans une zone pour les ajouter",
  "Add Widget Area": "Ajouter une zone d'encarts",
  "Create Widget Area": "Créer une zone d'encarts",
  "Delete Widget Area?": "Supprimer la zone d'encarts ?",
  "Widget area created": "Zone d'encarts créée",
  "Widget area deleted": "Zone d'encarts supprimée",
  "Failed to delete widget area": "Échec lors de la suppression de la zone d'encarts",
  "No widget areas yet. Create one to get started.": "Aucune zone d'encarts pour l'instant. Créez-en une pour commencer.",
  "This will delete the widget area and all its widgets. This action cannot be undone.":
    "Cela supprimera la zone d'encarts et tous ses encarts. Cette action est définitive.",
  "Manage content widgets in your widget areas": "Gérer les encarts de contenu dans vos zones d'encarts",
  "Plugin widget error": "Erreur de composant de module d'extension",
  "The plugin field widget failed to render.": "Le composant de champ du module d'extension n'a pas pu s'afficher.",
};

const MAISON_COMPOSES_SOURCE: [unknown, unknown][] = [
  [["Delete ", ["0"], " widget area"], ["Supprimer la zone d'encarts ", ["0"]]],
  [
    ["Unsupported widget element type: ", ["0"]],
    ["Type d'élément d'encart non pris en charge : ", ["0"]],
  ],
];

/** Les paires ci-dessus, rangees par la cle que le moteur compare : le JSON de la forme anglaise. */
function parLaFormeAnglaise(paires: [unknown, unknown][]): Record<string, unknown> {
  return Object.fromEntries(paires.map(([anglais, francais]) => [JSON.stringify(anglais), francais]));
}

/** Le dictionnaire francais du theme, tel que catalogue-bo.ts le pose sur le catalogue du moteur. */
export const DICTIONNAIRE: Dictionnaire = {
  simples: SIMPLES,
  composes: parLaFormeAnglaise(COMPOSES_SOURCE),
  identiques: IDENTIQUES,
  maison: { simples: MAISON_SIMPLES, composes: parLaFormeAnglaise(MAISON_COMPOSES_SOURCE) },
};
