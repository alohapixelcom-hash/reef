<!-- docs/administrer.md - le guide de l'éditeur : administrer tout le site Reef depuis le back office EmDash, sans code. -->

# Administrer votre site depuis le back office

Ce guide est écrit pour quelqu'un qui n'a jamais ouvert le code. Tout ce que vos lecteurs voient se change depuis le back office : les articles, les sujets, les auteurs, les textes des pages, les photos, les boutons et leurs adresses, les menus, le pied de page, le nom et le logo du site, le nombre d'articles par page, le référencement, les redirections, les courriels du formulaire de contact. Une modification publiée se voit tout de suite sur le site, sans attendre de mise en ligne.

Les libellés cités entre guillemets sont exactement ceux de l'écran. La version anglaise de ce guide est [administer.md](administer.md).

**À faire en premier** : le site est livré avec des coordonnées de démonstration. Dans « Réglages par langue », remplacez `hello@example.com` par votre adresse et « Example Studio » par votre nom, dans l'entrée « EN » puis dans l'entrée « FR » (partie 10).

## 1. Se connecter

1. Ouvrez l'adresse de votre site suivie de `/_emdash/admin` (ou `/secret-spot/`, qui y mène aussi).
2. Connectez-vous avec votre clé d'accès (empreinte, visage ou code de l'appareil).
3. Vous arrivez sur le « Tableau de bord ». La colonne de gauche, le rail, montre tout ce qui agit sur le site :
   - « Contenu » : « Textes des pages », « Sujets », « Auteurs », « Pages », « Réglages par langue », « Articles », « Médias » ;
   - « Gérer » : « Menus », « Redirections » ;
   - « Administration » (administrateurs seulement) : « Types de contenu », « Utilisateurs », « Modules d'extension », « Paramètres » ;
   - « Modules d'extension » : « Mettre le site à jour », « Courriels », « Journal des courriels », « Brancher les courriels », « Réglages des courriels ».

Deux rôles comptent : un **éditeur** change les contenus, les menus et les redirections ; un **administrateur** change en plus les « Paramètres » (nom du site, logo, réseaux, articles par page), les courriels et les utilisateurs.

## 2. La barre d'édition, sur le site lui-même

Connecté, ouvrez n'importe quelle page du site (« Voir le site », en haut à droite du back office). Une petite barre apparaît en bas de l'écran. Ses mots viennent du moteur et restent en anglais.

1. Basculez « Modifier ». Les zones modifiables s'entourent au survol.
2. Cliquez un texte court (un titre, un bouton, le nom d'un sujet) : il devient modifiable dans la page. Tapez, puis Entrée. La barre affiche « Saved » : c'est enregistré en brouillon, **les lecteurs ne voient encore rien**.
3. Cliquez « Publier » dans la barre : c'est en ligne, la page se recharge.
4. Un texte long, une liste, une date ou une case à cocher ouvre le back office au bon champ, dans un nouvel onglet.

Sur une page d'article, le titre, le chapô, la couverture, le nom du sujet et celui de l'auteur se cliquent de la même façon : chacun ouvre l'article, le sujet ou l'auteur qu'il affiche.

En mode édition, de petites **pastilles** apparaissent sur les blocs pour ce qui ne se voit pas comme un texte :

- « Adresse du bouton : » et « Adresse du 2e bouton : » : cliquez l'adresse soulignée, tapez la nouvelle, Entrée. « (celle du thème) » signale l'adresse prévue d'origine.
- « Photo : celle du thème », « Vidéo : », « Affiche : celle du thème » : cliquez pour changer l'image ou la vidéo.
- « Masquer ce bloc » : ouvre le back office sur la case qui masque le bloc.

En bas à gauche, le panneau **« Cadre du site »** donne les liens directs vers ce que la barre ne touche pas : les menus de la langue de la page, les réglages du site, les réglages par langue, les textes de l'en-tête et du pied de page, les pages libres, les redirections et la médiathèque.

## 3. Changer un texte

- **Dans la page** : barre, « Modifier », cliquez le texte, tapez, Entrée, puis « Publier ».
- **Dans le back office** : « Textes des pages », cliquez le bloc (la colonne « Page où se trouve ce bloc » dit sur quelle page il est), changez le champ : il s'enregistre tout seul (« Enregistré » en haut à droite), puis « Publier les modifications » et « Publier les modifications maintenant ». La liste s'ouvre sur les textes anglais : choisissez « FR » à côté du titre « Textes des pages » pour voir les textes français, et « Page suivante » en bas si le bloc n'est pas sur la première page.

Chaque champ porte une phrase qui dit ce qu'il change. Le « Mot du titre écrit en couleur » doit reprendre un mot du titre, écrit pareil. Le titre de la page d'un sujet est un modèle : `{topic}` y devient le nom du sujet.

**Revenir en arrière** : dans l'écran du bloc, « Ignorer les modifications » tant que ce n'est pas publié ; après, « Révisions » (voir la partie 20).

## 4. Changer une image ou la vidéo

- **Dans la page** : barre, « Modifier », cliquez la pastille « Photo » du bloc. Dans la fenêtre « Photo », « Envoyer une photo » envoie une photo de votre ordinateur, « Choisir une autre photo » en choisit une dans la médiathèque. Puis « Publier ».
- **Dans le back office** : dans le bloc, le champ « Photo du bloc (vide : la photo livrée avec le thème) » : « Sélectionner une image », « Envoyer des fichiers » pour une photo de votre ordinateur, puis « Choisir ». Elle s'enregistre toute seule ; « Publier les modifications », puis « Publier les modifications maintenant ».
- **La vidéo du bloc studio** (accueil) : « Adresse de la vidéo du bloc » (une adresse `https://...` de fichier vidéo) et « Image montrée avant la vidéo ».
- **La couverture d'un article** : champ « Couverture » de l'article.

Le texte alternatif (ce que lit un lecteur d'écran) se saisit dans la fenêtre de l'image. Le point d'intérêt se règle dans « Médias » : la photo reste cadrée autour de lui sur tous les écrans.

**Revenir à la photo du thème** : videz le champ (dans la fenêtre « Photo » de la barre, « Retirer »), puis publiez.

**Un champ photo vide** le dit en toutes lettres : « Aucune photo choisie : le site affiche la photo livrée avec le thème ». Ce n'est pas une erreur : choisissez une photo pour la remplacer.

## 5. Changer un bouton

- **Son texte** : cliquez le bouton en mode édition, tapez, Entrée, « Publier ».
- **Son adresse** : cliquez l'adresse dans sa pastille « Adresse du bouton : », tapez la nouvelle adresse (une page du site comme `/contact/`, une ancre comme `#newsletter`, ou une adresse complète `https://...`), Entrée, « Publier ». Une pastille vidée rend l'adresse prévue par le thème.
- **Le masquer** : masquez le bloc (partie 6), ou videz le texte du bouton.

**Adresse mal tapée** : une adresse tapée sans `https://` (`www.exemple.fr`) est corrigée toute seule en `https://www.exemple.fr`, et une phrase sous la pastille le dit ; une adresse avec une espace est refusée, et le bouton garde la sienne.

## 6. Masquer ou réafficher un bloc

1. En mode édition, cliquez la pastille « Masquer ce bloc » (ou ouvrez le bloc dans « Textes des pages »).
2. Activez « Masquer ce bloc : les visiteurs ne le voient plus ».
3. « Enregistrer », puis « Publier les modifications maintenant ».

Les lecteurs ne voient plus le bloc. Vous, en mode édition, le voyez grisé avec sa pastille « Bloc masqué : les visiteurs ne le voient pas », pour pouvoir le réafficher de la même façon. Les huit blocs de l'accueil se masquent ainsi (l'ouverture, la bande des sujets, l'article à la une, le studio, les dernières notes, les sujets, les signatures, la lettre d'information). Masquer la lettre d'information la retire aussi du pied de page.

### Changer l'ordre des blocs de l'accueil

1. Ouvrez le bloc dans « Textes des pages » (page « Accueil »).
2. Tout en bas, « Place du bloc sur l'accueil » : écrivez un nombre. 1 le met tout en haut, 2 juste après le premier, et ainsi de suite ; laissé vide, le bloc garde la place prévue par le thème.
3. « Enregistrer », puis « Publier les modifications maintenant ».

Les places des huit blocs, telles que le thème les donne : 1 l'ouverture, 2 la bande des sujets, 3 l'article à la une, 4 le studio, 5 les dernières notes, 6 les sujets, 7 les signatures, 8 la lettre d'information. Un bloc à qui vous donnez une place passe devant celui qui l'occupait. La place vaut pour les deux langues. Pour revenir à l'ordre du thème, videz le champ. L'ordre d'origine a ses raisons (le studio, sombre, coupe deux listes de cartes) : regardez la page après un changement.

## 7. Changer un menu

« Menus » liste les menus du site. Chacun existe en anglais et en français.

| Menu | Où il s'affiche |
|---|---|
| « Menu principal, en haut de chaque page » | la barre de navigation |
| « Liens ajoutés au menu sur téléphone » | le menu du téléphone, en plus du menu principal (Auteurs, Recherche) |
| « Boutons en haut à droite de chaque page » | le bouton « S'abonner » ; un lien portant la classe « bouton » est dessiné en bouton plein |
| « Lire », « Le studio », « Légal » | les trois colonnes du pied de page (le nom du menu est le titre de la colonne) |

- **Renommer ou changer l'adresse d'un lien** : « Modifier » sur la ligne, champs « Libellé » et « URL », « Enregistrer ».
- **Ajouter un lien** : « Ajouter un lien personnalisé », « Libellé », « URL », « Ajouter ». « Ajouter du contenu » propose une page, un article, un sujet ou un auteur du back office.
- **Réordonner** : flèches « Monter » et « Descendre ».
- **Retirer** : « Supprimer » (poubelle). **Attention : la suppression est immédiate, sans confirmation.**
- **Sous-menu** : « Modifier », puis « Parent » : choisissez le lien sous lequel il se range.
- **L'autre langue** : en haut de l'écran du menu, « Traductions », ligne « FR » ou « EN », « Modifier ».

Le changement se voit tout de suite sur le site, sans publier. Si un menu est vide ou absent dans une langue, le site montre les liens d'origine du thème.

**Le menu français** : dans le menu français, une adresse de page tapée sans `/fr/` (`/contact/`) mène quand même à la page française : le site ajoute `/fr/` tout seul.

## 8. Changer un lien ou une colonne du pied de page

- **Les liens des colonnes** : ce sont les menus « Lire », « Le studio » et « Légal » (partie 7).
- **Le titre d'une colonne** : le nom du menu, dans « Menus », en haut de l'écran du menu.
- **Les textes du pied** (phrase sous le logo, « Construit avec », mentions, « Thème par », « Retour en haut ») : « Textes des pages », bloc « pied-de-page » (page « Tout le site »). Le lien direct est dans le panneau « Cadre du site », « Textes du pied de page ».
- **L'e-mail et le crédit du thème** : « Réglages par langue » (partie 10).

## 9. Les réglages du site

« Paramètres » (administrateurs), puis « Général » :

| Champ | Ce qu'il change |
|---|---|
| « Titre du site » | le nom de la marque partout : barre, pied, titres des onglets, partage sur les réseaux, flux RSS, back office |
| « Sélectionner le logo » | le logo de la barre ; vide, le pictogramme du thème |
| « Sélectionner la favicon » | l'icône de l'onglet ; vide, celle du thème |
| « Articles par page » | le nombre d'articles de chaque page de « Tous les billets », d'un sujet et d'un auteur (9 d'origine) |

Puis « Enregistrer ». « Liens sociaux » : les réseaux du pied de page. « SEO » : le séparateur des titres (« Titre | Marque »), l'image de partage par défaut, les codes de vérification Google et Bing.

**Sans effet sur ce site** (le thème les ignore volontairement ; « Slogan », « URL du site », « Format des dates » et « Fuseau horaire » ne s'affichent plus dans « Paramètres », « Articles par page » reste : il pagine les listes de billets) : « Slogan » (le slogan dépend de la langue : il est dans « Réglages par langue »), « URL du site », « Format des dates », « Fuseau horaire » (les dates suivent la langue de la page), et le « robots.txt » du SEO (il protège le back office et annonce le plan du site : une erreur désindexerait le site).

**Après un changement de logo, de nom du site ou de couleur** : « Mettre le site à jour », dans le menu de gauche, refait les quelques pages qui ne se mettent pas à jour seules (une à trois minutes). Pour tout le reste, ce qui est publié est déjà en ligne : ce bouton ne sert à rien.

## 10. Coordonnées, e-mail, couleur et textes communs

« Réglages par langue » : une entrée par langue, qui porte ce qui change avec la langue.

- la description du site (reprise par Google quand une page n'a pas la sienne) ;
- le texte de l'image de partage pour les personnes aveugles ;
- l'adresse e-mail de contact du pied de page et de la page Contact ;
- le nom et le lien du crédit du pied de page ;
- le titre du flux RSS de la langue ;
- l'adresse d'un service externe pour la lettre d'information et pour le formulaire de contact, utilisée seulement tant que l'écran « Courriels » n'est pas branché (parties 17 bis et 17 ter) ;
- « Police du site, pour les titres et le texte » : « Police d'origine du thème » (comme un champ vide), « Police du système, la plus légère », « Classique, à empattements » ou « Titres classiques, texte sans empattements ». Les trois dernières sont déjà installées sur l'ordinateur ou le téléphone du lecteur : rien à télécharger, la page s'affiche plus vite. Le choix vaut pour les deux langues ;
- « Logo pour le mode sombre » : une version claire de votre logo, montrée quand le lecteur a choisi l'affichage sombre (barre et pied de page) ; vide, le logo des « Paramètres » sert aussi sur fond sombre. Le choix vaut pour les deux langues ;
- « Couleur de la marque, sur tout le site » : « Couleur d'origine du thème » (le corail du thème, comme un champ vide) ou l'une des cinq couleurs, qui colore les boutons, les liens et le mot en couleur ; chaque couleur garde le texte des boutons lisible (contraste d'au moins 4,5:1, mesuré).

Les textes de l'en-tête et du pied de page sont des blocs de « Textes des pages » (page « Tout le site »).

## 11. Écrire et publier un article

1. « Articles », « Ajouter ».
2. « Titre », « Chapo » (la phrase sous le titre et sur la carte), « Couverture », « Texte ».
3. « Sujet » et « Auteur » : choisissez-les par leur nom dans la liste (« Typography », « Mara Lindqvist »...). La phrase au-dessus de chaque liste dit où il s'affiche. Un sujet ou un auteur créé dans « Sujets » ou « Auteurs » apparaît aussitôt dans la liste.
   Les étiquettes : dans le panneau « Classement » à droite, « Étiquettes », tapez un mot dans « Ajouter des étiquettes... » puis Entrée (une étiquette qui existe déjà est proposée) ; la croix à côté d'une étiquette la retire. Chaque étiquette a sa page, `/tags/<étiquette>/`, qui liste ses articles, et le pied de l'article y mène.
4. « Date affichée » (vide : la date de publication), « Revu le » si vous le mettez à jour plus tard, « À la une » pour l'afficher en grand sur l'accueil.
5. Dans « Adresse web », l'adresse de l'article : `mon-article` donne `/blog/mon-article/`.
6. « Enregistrer » garde un brouillon, invisible. « Publier » le met en ligne. « Programmer » choisit une date.

L'article paraît aussitôt en tête de « Tous les billets », dans la page de son sujet, dans celle de son auteur, dans celles de ses étiquettes, dans le flux RSS et dans le plan du site. Le panneau « SEO » de l'article (titre, description, image, adresse canonique, ne pas indexer) passe avant le titre et le chapô pour Google et les réseaux ; « ne pas indexer » le retire du plan du site.

## 12. Les sujets et les auteurs

- **Un sujet** : « Sujets », cliquez le sujet. « Nom du sujet », « Description, en tête de la page du sujet et sur sa carte », « Couleur du sujet » (Corail, Aigue-marine, Encre), « Rang dans les listes (1 en premier) », « Image de partage ». « Enregistrer », puis publiez. Le nom change partout : cartes, bande défilante, page du sujet, pastille des articles.
- **Un auteur** : « Auteurs », cliquez l'auteur. « Nom », « Rôle, sous le nom », « Biographie courte », « Portrait (vide : les initiales) », « Liens ailleurs (site, réseaux), sur sa page ».
- **Ajouter** un sujet ou un auteur : « Ajouter », remplissez, publiez. Son « Adresse web » donne sa page : `photo` donne `/topics/photo/`. Il est aussitôt proposé, par son nom, dans les listes « Sujet » et « Auteur » des articles.
- **Les étiquettes** : « Étiquettes » dans le menu de gauche liste toutes les étiquettes, en anglais et en français. Cliquez une étiquette pour la renommer (son nom change sur chaque article et sur sa page) ; sa traduction se donne dans la même fenêtre. Une étiquette sans article n'a pas de page. L'adresse d'une étiquette est la même dans les deux langues (`/tags/typography/` et `/fr/tags/typography/`), seul son nom se traduit.

## 13. Ajouter un élément à une liste

Les éléments d'un bloc (les chiffres de l'ouverture, les règles de la page À propos, les étapes du contact, les clauses légales) sont dans le champ « Éléments du bloc, dans l'ordre de la page » : « Ajouter un élément ». Une clause légale a aussi une « ancre » : l'adresse `#...` du sommaire.

## 14. Ajouter une page, puis la mettre au menu

1. « Pages », « Ajouter ». « Titre de la page », « Texte d'introduction », « Texte de la page », photo si vous voulez.
2. Dans « Adresse web », l'adresse de la page : `colophon` donne `/colophon/`.
3. « Enregistrer », puis « Publier » et « Publier maintenant ». La page est créée en anglais (« Langue du contenu : EN »).
4. Pour la version française : panneau « Traductions », ligne « FR », « Traduire », changez les textes, puis « Publier » et « Publier maintenant ».
5. « Menus », « FR » en haut de la liste, le menu voulu, « Ajouter un lien personnalisé », URL `/fr/colophon/`, « Ajouter ». Faites de même dans le menu anglais avec `/colophon/`.

Une page qui porte le nom d'une page du thème (`blog`, `topics`, `authors`, `about`, `contact`, `search`, `legal`) ou d'une langue (`fr`) ne s'affiche pas.

## 15. Traduire

Chaque texte existe en anglais et en français. Dans l'écran d'une entrée, le panneau « Traductions » montre les deux langues : « Modifier » ouvre l'autre version. Le sélecteur de langue en haut des listes (« EN (par défaut) ») change la langue affichée. Les menus se traduisent de la même façon (partie 7). Les rangs, les photos, les adresses, les couleurs et les cases « masquer » valent pour les deux langues.

## 16. Le référencement

- **Une page du thème** (accueil, listes, À propos, Contact, pages légales, page introuvable) : dans son premier bloc, « Titre de la page dans les résultats de recherche », « Description de la page dans les résultats de recherche » et « Image de partage de la page sur les réseaux ».
- **Un article, une page ajoutée, un sujet, un auteur** : panneau « SEO » de son écran (titre, description, image, adresse canonique, ne pas indexer).
- Le plan du site pour Google se tient à jour tout seul ; une entrée marquée « ne pas indexer » en sort.

## 17. Une redirection

« Redirections », « Nouvelle redirection » : « Chemin source » (l'ancienne adresse, qui commence par `/`), « Chemin d'arrivée » (une adresse du site, qui commence aussi par `/`), « Code d'état » (« 301 Permanent » le plus souvent ; 410 pour dire qu'une page a disparu), « Créer ». Changer le slug d'un article ou d'une page crée seul la redirection 301. L'onglet « Erreurs 404 » liste les adresses demandées qui n'existent pas.

## 18. Les courriels du formulaire de contact et de la lettre

Les messages de la page Contact vous arrivent par courriel dès que l'écran « Courriels » est branché (administrateurs) :

1. « Brancher les courriels » : l'adresse d'envoi et son domaine ; l'écran relit le domaine et dit ce qui manque.
2. « Réglages des courriels » : l'expéditeur, l'adresse de réponse, le destinataire du formulaire de contact, l'accusé de réception envoyé au lecteur dans sa langue.
3. « Courriels » : les envois du mois et les échecs ; « Journal des courriels » : chaque envoi, son erreur expliquée, « Renvoyer ».

La lettre d'information part par le même chemin, sans service externe : voir la partie 19.

**Adresse d'expédition** : une adresse de messagerie (Gmail, Orange, Outlook, Free...) est refusée comme adresse d'expédition, avec une phrase qui dit pourquoi : un site ne peut pas envoyer au nom de ces messageries. Elle reste possible comme destinataire.

**Si un courriel ne part pas** : une carte rouge le dit en haut de « Courriels » et sur la page d'accueil du back office, jusqu'à ce qu'il soit renvoyé avec succès. Dans « Journal des courriels », la colonne « Pourquoi » donne la raison en toutes lettres, et « Renvoyer ce courriel » le fait repartir.

## 19. La lettre d'information

Dès que les courriels sont branchés (adresse d'expédition réglée), le formulaire « S'abonner » de l'accueil et du pied de page inscrit les lecteurs sur votre site, sans service externe :

1. Le lecteur tape son adresse et valide. La page lui dit qu'un courriel est parti : il doit cliquer le lien qu'il contient pour confirmer (double confirmation : personne ne peut inscrire l'adresse d'un autre). Sans confirmation, l'inscription est effacée au bout de 7 jours.
2. « Lettre d'information » (menu de gauche, sous « Courriels ») : le nombre d'abonnés et d'inscriptions en attente, puis la liste des adresses, leur langue et depuis quand.
3. **Envoyer un article** : choisissez-le dans « Article à envoyer », puis « Envoyer à N abonnés » et confirmez. Chaque abonné le reçoit dans sa langue (le titre, le chapo, un lien vers l'article). Un article déjà envoyé le dit, avec sa date, avant de repartir.
4. **Se désinscrire** : chaque courriel porte un lien « Se désinscrire » en bas. Il ouvre une page qui demande de confirmer (« Me désinscrire » ou « Garder mon abonnement ») : un logiciel qui ouvre les liens d'un courriel ne désinscrit donc personne. Le bouton « Se désinscrire » des messageries, lui, désinscrit en un clic.
5. **Retirer une adresse** à la demande d'une personne : « Adresse à retirer », puis « Retirer cette adresse » et confirmez.
6. « Derniers envois de la lettre » : chaque article envoyé, quand, et combien de courriels sont partis. Un courriel qui n'est pas parti est dans « Journal des courriels », avec « Renvoyer ».

Les envois de la lettre comptent dans le forfait du mois (écran « Courriels ») : un envoi qui dépasserait le plafond du mois est refusé d'avance, avec la marche à suivre. Tant que les courriels ne sont pas branchés, le formulaire poste vers le service externe réglé dans « Réglages par langue » s'il y en a un, sinon il reste une démonstration.

## 20. Révisions, retour arrière, corbeille

- **Avant publication** : « Ignorer les modifications » revient à la version en ligne.
- **Après** : « Révisions » liste les versions ; restaurez-en une, puis publiez. **Attention : une révision remet les textes, pas la photo, les adresses des boutons ni la case « Masquer ce bloc »** (elles valent pour les deux langues) : remettez-les à la main. La fenêtre de confirmation le rappelle.
- **Supprimer** : « Déplacer vers la corbeille », puis confirmer. L'onglet « Corbeille » de la liste permet de restaurer.
- **Dupliquer** : dans la liste, « Dupliquer » crée une copie en brouillon, dont le titre finit par « (Copy) » ; renommez-la, changez son adresse web, puis publiez.
- **Retirer du site sans supprimer** : « Retirer du site », en haut du panneau de droite. Pour un bloc de « Textes des pages », le texte d'origine du thème revient ; pour faire disparaître un bloc, masquez-le (partie 6). Un sujet ou un auteur dépublié rend la fiche d'origine du thème.

## 21. Carte du site : où se change chaque zone

| Page | Zone | Où la changer |
|---|---|---|
| Toutes | Nom de la marque, logo, favicon | « Paramètres », « Général » |
| Toutes | Liens de la barre, bouton « S'abonner », menu du téléphone | « Menus » : menu principal, boutons, liens du téléphone |
| Toutes | Colonnes et liens du pied | « Menus » : « Lire », « Le studio », « Légal » |
| Toutes | Phrase du pied, mentions, e-mail, crédit | « Textes des pages » (page « Tout le site ») et « Réglages par langue » |
| Toutes | Lettre d'information | « Textes des pages », bloc « lettre » ; abonnés et envois dans « Lettre d'information » (partie 19) |
| Toutes | Couleur de la marque | « Réglages par langue », « Couleur de la marque » |
| Toutes | Police des titres et du texte | « Réglages par langue », « Police du site » |
| Toutes | Logo sur fond sombre | « Réglages par langue », « Logo pour le mode sombre » |
| Accueil | Photo, titre, boutons et leurs adresses, chiffres | barre (titre, boutons, pastilles) ou « Textes des pages », bloc de l'ouverture |
| Accueil | Bande défilante, sujets, signatures | « Sujets », « Auteurs » ; titres des sections dans « Textes des pages », page « Accueil » |
| Accueil | Article à la une, dernières notes | « Articles » (case « À la une », date) ; titres dans « Textes des pages » |
| Accueil | Studio : vidéo, affiche, boutons | bloc « studio » : pastilles « Vidéo », « Affiche », adresses |
| Accueil | Ordre des blocs | chaque bloc, « Place du bloc sur l'accueil » (partie 6) |
| Tous les billets, sujet, auteur | En-tête, fil d'Ariane, nombre d'articles | « Textes des pages » ; « Articles par page » dans « Paramètres » |
| Article | Tout le contenu, SEO | « Articles » ; « À lire ensuite » dans « Textes des pages », page « Billet » |
| Article, page d'une étiquette | Étiquettes | panneau « Classement » de l'article ; noms dans « Étiquettes » |
| À propos | Texte, histoire, règles, signatures, appel | « Textes des pages », page « À propos » |
| Contact | Formulaire, écrire directement, étapes | « Textes des pages », page « Contact » ; courriels dans « Courriels » |
| Pages légales | Clauses, sommaire, date | « Textes des pages », pages « Mentions légales », « Confidentialité », « Conditions » |
| Page introuvable | Code, titre, texte, trois boutons | « Textes des pages », page « Page introuvable » |
| Pages ajoutées | Tout | « Pages » |

## 22. Ce qui demande un développeur

- l'ordre des blocs d'une autre page que l'accueil, un nouveau type de bloc, la mise en page et le dessin du site ;
- les textes d'interface génériques (accessibilité, « changer de langue », « ouvrir le menu », « min de lecture », compteurs), le bandeau de cookies ;
- les adresses des pages du thème et le fichier robots.txt ;
- une police de caractères qui n'est pas dans la liste « Police du site ».

Ce qu'il faut savoir du moteur (EmDash 0.38) :

- un lien de menu vers une page en brouillon ou à la corbeille reste affiché : retirez-le du menu ;
- le texte alternatif d'une image est copié dans le champ au moment du choix : le changer ensuite dans « Médias » ne change pas les champs déjà remplis ;
- recadrer une image dans « Médias » crée un nouveau fichier ;
- « Sections » (blocs réutilisables du moteur, masquées du rail) n'a rien à voir avec « Textes des pages » ;
- la barre d'édition parle anglais.
