<!-- docs/administer.md - the editor's guide: run the whole Reef site from the EmDash back office, with no code. -->

# Running your site from the back office

This guide is written for someone who has never opened the code. Everything your readers see is changed from the back office: posts, topics, authors, page texts, photos, buttons and where they lead, menus, footer, site name and logo, posts per page, search engine settings, redirects, the emails of the contact form. A published change shows on the site at once, with no deployment.

Labels in quotes are the exact screen labels of the back office in English. The back office of the theme opens in French by default: each person can switch it to English in their own settings. Three things stay in French whatever the interface language, because they are the names the theme gives them: the collections (« Textes des pages », « Sujets », « Auteurs », « Pages », « Réglages par langue », « Articles »), their fields, and the names of the menus. The French guide is [administrer.md](administrer.md).

**First thing to do**: the site ships with demo contact details. In « Réglages par langue », replace `hello@example.com` with your address and « Example Studio » with your name, in the « EN » entry and in the « FR » entry (part 10).

## 1. Signing in

1. Open your site address followed by `/_emdash/admin` (or `/secret-spot/`, which leads there too).
2. Sign in with your passkey (fingerprint, face or device code).
3. You land on the "Dashboard". The left rail shows everything that acts on the site: "Content" (the six collections above, then "Media"), "Manage" ("Menus", "Redirects"), for administrators "Content Types", "Users", "Plugins" ("Update the site"), "Settings", and the email screens (« Courriels », « Journal des courriels », « Brancher les courriels », « Réglages des courriels »).

Two roles matter: an **editor** changes content, menus and redirects; an **administrator** also changes the "Settings" (site name, logo, social links, posts per page), the emails and the users.

## 2. The edit bar, on the site itself

Signed in, open any page of the site ("View Site", top right of the back office). A small bar appears at the bottom of the screen.

1. Switch "Edit" on. Editable areas are outlined on hover.
2. Click a short text (a heading, a button, a topic name): it becomes editable in the page. Type, then Enter. The bar shows "Saved": it is a draft, **readers see nothing yet**.
3. Click "Publish" in the bar: it is live, the page reloads.
4. A long text, a list, a date or a checkbox opens the back office at the right field, in a new tab.

On a post page, the title, the standfirst, the cover, the topic name and the author name are clickable the same way: each opens the post, topic or author it shows.

In edit mode, small **tags** appear on blocks for what does not show as text (their words follow the language of the back office):

- "Button address:" and "2nd button address:": click the underlined address, type the new one, Enter. "(the theme's)" marks the original address.
- "Photo: the theme's", "Video:", "Poster: the theme's": click to change the image or the video.
- "Hide this block": opens the back office on the box that hides the block.

Bottom left, the **"Site frame"** panel links straight to what the bar cannot reach: the menus of the page's language, site settings, per-language settings, header and footer texts, free pages, redirects and the media library.

## 3. Changing a text

- **In the page**: bar, "Edit", click the text, type, Enter, then "Publish".
- **In the back office**: « Textes des pages », click the block (the column « Page où se trouve ce bloc » tells which page it is on), change the field: it saves on its own ("Saved" top right), then "Publish changes" and "Publish changes now". The list opens on the English texts: pick "FR" next to the « Textes des pages » title to see the French ones, and "Next page" at the bottom if the block is not on the first page.

Each field carries a sentence that says what it changes. The coloured word of a heading must repeat a word of the heading, spelt the same. The heading of a topic page is a template: `{topic}` becomes the topic name.

**Going back**: in the block, "Discard changes" while it is not published; after, "Revisions" (part 20).

## 4. Changing an image or the video

- **In the page**: bar, "Edit", click the block's "Photo" tag. In the "Image" window, "Upload" sends a photo from your computer, "Replace" picks one in the media library. Then "Publish".
- **In the back office**: in the block, the photo field, "Select Image", "Upload files" for a photo from your computer, then "Select". It saves on its own; "Publish changes", then "Publish changes now".
- **The video of the studio block** (home page): the video address field (an `https://...` video file) and the poster field.
- **A post's cover**: the post's « Couverture » field.

The alternative text (what a screen reader says) is typed in the image window. The focal point is set in "Media": the photo stays framed around it on every screen.

**Back to the theme's photo**: empty the field (in the bar's "Image" window, "Remove"), then publish.

**An empty photo field** says so in plain words: "No photo chosen: the site shows the photo delivered with the theme". It is not an error: choose a photo to replace it.

## 5. Changing a button

- **Its text**: click the button in edit mode, type, Enter, "Publish".
- **Its address**: click the address in its "Button address:" tag, type the new address (a page of the site such as `/contact/`, an anchor such as `#newsletter`, or a full `https://...` address), Enter, "Publish". An emptied tag gives back the theme's address.
- **Hiding it**: hide the block (part 6), or empty the button's text.

**A mistyped address**: an address typed without `https://` (`www.example.com`) is corrected on its own to `https://www.example.com`, and a sentence under the tag says so; an address with a space is refused, and the button keeps its own.

## 6. Hiding or showing a block

1. In edit mode, click the "Hide this block" tag (or open the block in « Textes des pages »).
2. Switch on « Masquer ce bloc ».
3. "Save", then "Publish changes now".

Readers no longer see the block. You, in edit mode, see it greyed out with its "Hidden block: visitors do not see it" tag, to show it again the same way. The eight blocks of the home page hide this way (opening, topic band, featured post, studio, latest notes, topics, writers, newsletter). Hiding the newsletter also removes it from the footer.

### Changing the order of the home page blocks

1. Open the block in « Textes des pages » (page « Accueil »).
2. At the bottom, « Place du bloc sur l'accueil »: write a number. 1 puts it at the very top, 2 right after the first one, and so on; left empty, the block keeps the place the theme gives it.
3. "Save", then "Publish changes now".

The places of the eight blocks as the theme gives them: 1 opening, 2 topic band, 3 featured post, 4 studio, 5 latest notes, 6 topics, 7 writers, 8 newsletter. A block you give a place to goes before the one that held it. The place applies to both languages. To go back to the theme's order, empty the field. The original order has its reasons (the dark studio block splits two lists of cards): look at the page after a change.

## 7. Changing a menu

"Menus" lists the menus of the site, each in English and French: « Menu principal, en haut de chaque page » (the navigation bar), « Liens ajoutés au menu sur téléphone » (added to the phone menu: Authors, Search), « Boutons en haut à droite de chaque page » (the "Subscribe" button; a link with the class `bouton` is drawn as a solid button), and « Lire », « Le studio », « Légal » (the three footer columns; the menu name is the column title).

- **Rename a link or change its address**: "Edit" on the row, "Label" and "URL" fields, "Save".
- **Add a link**: "Add Custom Link", "Label", "URL", "Add". "Add Content" offers a page, post, topic or author of the back office. In the French menu, a page address typed without `/fr/` (`/contact/`) still leads to the French page: the site adds `/fr/` on its own.
- **Reorder**: "Move up" and "Move down".
- **Remove**: "Delete" (bin). **Warning: deletion is immediate, with no confirmation.**
- **Submenu**: "Edit", then "Parent".
- **The other language**: at the top of the menu screen, "Translations", row "FR" or "EN", "Edit".

The change shows on the site at once, with nothing to publish. If a menu is empty or missing in a language, the site shows the theme's original links.

## 8. Changing a footer link or column

- **Column links**: the « Lire », « Le studio » and « Légal » menus (part 7). **Column title**: the menu name.
- **Footer texts** (line under the logo, "Built with", notices, "Theme by", "Back to top"): « Textes des pages », block `pied-de-page` (page « Tout le site »). The direct link is in the "Site frame" panel, "Footer texts".
- **Email and theme credit**: « Réglages par langue » (part 10).

## 9. Site settings

"Settings" (administrators), then "General": "Site Title" (the brand name everywhere: bar, footer, tab titles, social sharing, RSS feed, back office), "Select Logo" (the bar logo; empty, the theme's mark), "Select Favicon" (the tab icon; empty, the theme's), "Posts Per Page" (the number of posts on each page of the post list, of a topic and of an author; 9 originally). Then "Save". "Social Links": the footer's social links. "SEO": the title separator, the default share image, the Google and Bing verification codes.

**No effect on this site** (the theme ignores them on purpose; "Tagline", "Site URL", "Date Format" and "Timezone" no longer show in "Settings", "Posts Per Page" stays: it pages the post lists): "Tagline" (it depends on the language: it lives in « Réglages par langue »), "Site URL", "Date Format", "Timezone" (dates follow the language of the page), and the SEO robots.txt (it protects the back office and points to the sitemap: a mistake would deindex the site).

**After changing the logo, the site name or the colour**: "Update the site", in the left menu, rebuilds the few pages that do not update on their own (one to three minutes). For everything else, what is published is already online: that button is of no use.

## 10. Contact details, email, colour and shared texts

« Réglages par langue » holds one entry per language: the site description, the share image's text for blind people, the contact email of the footer and contact page (set in each language: change it in the « EN » entry and in the « FR » entry), the name and link of the footer credit, the RSS feed title of the language, the address of an outside service for the newsletter and for the contact form, used only while the email screen is not connected (parts 17 b and 17 c), « Police du site, pour les titres et le texte » (« Police d'origine du thème », like an empty field, « Police du système, la plus légère », « Classique, à empattements » or « Titres classiques, texte sans empattements »: the last three are already installed on the reader's computer or phone, nothing to download, and the choice applies to both languages), « Logo pour le mode sombre » (a light version of your logo, shown when the reader uses the dark display, in the bar and the footer; empty, the logo of the « Paramètres » is used on both; it applies to both languages), and « Couleur de la marque, sur tout le site », « Couleur d'origine du thème » (the theme's coral, like an empty field) or one of the five colours, which paints the buttons, the links and the highlighted word; every colour keeps button text readable (contrast of at least 4.5:1, measured).

## 11. Writing and publishing a post

1. « Articles », "Add New".
2. Title, standfirst (« Chapo », under the title and on the card), cover, text.
3. « Sujet » and « Auteur »: pick them by name in the list ("Typography", "Mara Lindqvist"...). The sentence above each list says where it shows. A topic or an author created in « Sujets » or « Auteurs » appears in the list at once.
   Tags: in the « Classement » panel on the right, « Étiquettes », type a word in « Ajouter des étiquettes... » then Enter (an existing tag is suggested); the cross next to a tag removes it. Each tag has its page, `/tags/<tag>/`, listing its posts, and the post footer leads to it.
4. « Date affichée » (empty: the publication date), « Revu le » when you update it later, « À la une » to show it large on the home page.
5. In "Slug", the post address: `my-post` gives `/blog/my-post/`.
6. "Save" keeps an invisible draft. "Publish" puts it online; "Schedule" picks a date.

The post shows at once at the top of the post list, on its topic page, on its author page, on its tag pages, in the RSS feed and in the sitemap. The post's "SEO" panel (title, description, image, canonical address, no index) wins over the title and standfirst for search engines and social networks; "no index" takes it out of the sitemap.

## 12. Topics and authors

- **A topic**: « Sujets », click the topic. Name, description (top of the topic page and on its card), colour (Corail, Aigue-marine, Encre), rank (1 first), share image. "Save", then publish. The name changes everywhere: cards, scrolling band, topic page, post labels.
- **An author**: « Auteurs », click the author. Name, role, short bio, portrait (empty: the initials), links elsewhere.
- **Adding** a topic or an author: "Add New", fill in, publish. Its slug gives its page: `photo` gives `/topics/photo/`. It is offered at once, by name, in the « Sujet » and « Auteur » lists of posts.
- **Tags**: « Étiquettes » in the left menu lists every tag, in English and French. Click a tag to rename it (its name changes on every post and on its page); its translation is given in the same window. A tag without posts has no page. A tag's address is the same in both languages (`/tags/typography/` and `/fr/tags/typography/`), only its name is translated.

## 13. Adding an element to a list

The elements of a block (the figures of the opening, the rules of the about page, the contact steps, the legal clauses) are in its repeated field: "Add item". A legal clause also has an anchor: the `#...` address used by the table of contents.

## 14. Adding a page, then putting it in a menu

1. « Pages », "Add New". Title, introduction, text, photo if you like.
2. In "Slug", the page address: `colophon` gives `/colophon/`.
3. "Save", then "Publish" and "Publish now". The page is created in English ("Content language: EN").
4. For the French version: "Translations" panel, row "FR", "Translate", change the texts, then "Publish" and "Publish now".
5. "Menus", "FR" at the top of the list, the menu you want, "Add Custom Link", URL `/fr/colophon/`, "Add". Do the same in the English menu with `/colophon/`.

A page named like a theme page (`blog`, `topics`, `authors`, `about`, `contact`, `search`, `legal`) or a language (`fr`) does not show.

## 15. Translating

Every text exists in English and French. In an entry, the "Translations" panel shows both languages: "Edit" opens the other version. The language selector at the top of the lists switches the language shown. Menus translate the same way (part 7). Ranks, photos, addresses, colours and "hide" boxes hold for both languages.

## 16. Search engines

- **A theme page** (home, lists, about, contact, legal pages, not found page): in its first block, the search title, search description and share image fields.
- **A post, an added page, a topic, an author**: the "SEO" panel of its screen (title, description, image, canonical address, no index).
- The sitemap keeps itself up to date; an entry marked no index leaves it.

## 17. A redirect

"Redirects", "New Redirect": "Source path" (the old address, starting with `/`), "Destination path" (an address of the site, starting with `/` too), "Status code" (301 permanent most of the time; 410 to say a page is gone), "Create". Changing a post's or page's slug creates the 301 by itself. The "404 Errors" tab lists addresses asked for that do not exist.

## 18. Emails of the contact form and the newsletter

Messages from the contact page reach you by email as soon as the email screen is connected (administrators): « Brancher les courriels » (sending address and its domain, checked on screen), « Réglages des courriels » (sender, reply address, recipient of the contact form, acknowledgement sent to the reader in their language), « Courriels » (this month's sends and failures) and « Journal des courriels » (each send, its error explained, "Resend"). The newsletter goes out the same way, with no outside service: see part 19.

**Sender address**: a mailbox address (Gmail, Orange, Outlook, Free...) is refused as the sender address, with a sentence that says why: a site cannot send on behalf of those mailboxes. It stays possible as a recipient.

**If an email does not leave**: a red card says so at the top of « Courriels » and on the back office home page, until it is sent again successfully. In « Journal des courriels », the "Why" column gives the reason in plain words, and "Send this email again" sends it again.

## 19. The newsletter

As soon as emails are connected (sending address set), the "Subscribe" form of the home page and the footer signs readers up on your own site, with no outside service:

1. The reader types their address and sends. The page says an email is on its way: they click the link inside to confirm (double opt-in: nobody can sign up someone else's address). Without confirmation, the sign-up is erased after 7 days.
2. « Lettre d'information » (left menu, under « Courriels »): the number of subscribers and pending sign-ups, then the list of addresses, their language and since when.
3. **Sending a post**: pick it in « Article à envoyer », then « Envoyer à N abonnés » and confirm. Each subscriber receives it in their language (title, standfirst, a link to the post). A post already sent says so, with its date, before going out again.
4. **Unsubscribing**: every email carries an "Unsubscribe" link at the bottom. It opens a page that asks for confirmation (« Me désinscrire » or « Garder mon abonnement »), so software that opens the links of an email unsubscribes nobody. The "Unsubscribe" button of mail apps unsubscribes in one click.
5. **Removing an address** at someone's request: « Adresse à retirer », then « Retirer cette adresse » and confirm.
6. « Derniers envois de la lettre »: each post sent, when, and how many emails went out. An email that did not go out is in « Journal des courriels », with "Resend".

Newsletter sends count in the month's allowance (« Courriels » screen): a send that would go over the monthly limit is refused beforehand, with what to do. While emails are not connected, the form posts to the outside service set in « Réglages par langue » if there is one, otherwise it stays a demonstration.

## 20. Revisions, going back, trash

- **Before publishing**: "Discard changes" returns to the live version.
- **After**: "Revisions" lists the versions; restore one, then publish. **Careful: a revision restores the texts, not the photo, the button addresses or the « Masquer ce bloc » box** (they hold for both languages): put them back by hand. The confirmation window says so.
- **Delete**: "Move to Trash", then confirm. The "Trash" tab of the list restores.
- **Duplicate**: in the list, "Duplicate" makes a draft copy whose title ends with "(Copy)"; rename it, change its web address, then publish.
- **Take off the site without deleting**: "Unpublish" at the top of the right panel. For a block of « Textes des pages », the theme's original text comes back; to make a block disappear, hide it (part 6). An unpublished topic or author gives back the theme's original card.

## 21. Site map: where each area is changed

The table of the French guide ([administrer.md](administrer.md), part 21) holds for both languages: brand, logo, favicon and posts per page in "Settings"; the typeface and the brand colour in « Réglages par langue »; the order of the home page blocks in each block's « Place du bloc sur l'accueil »; navigation, the "Subscribe" button and footer columns in "Menus"; footer texts in « Textes des pages » (page « Tout le site ») and « Réglages par langue »; every block of every page in « Textes des pages », filtered by its page; posts, topics and authors in their collections; tags in each post's « Classement » panel and their names in « Étiquettes »; subscribers and sends in « Lettre d'information »; added pages in « Pages »; contact form emails in the email screens.

## 22. What needs a developer

- the order of the blocks of a page other than the home page, a new kind of block, the layout and drawing of the site;
- generic interface texts (accessibility, "change language", "open menu", "min read", counters), the cookie banner;
- the addresses of the theme's pages and the robots.txt file;
- a typeface that is not in the « Police du site » list.

What to know about the engine (EmDash 0.38): a menu link to a draft or trashed page stays visible (remove it from the menu); an image's alternative text is copied into the field when chosen (changing it later in "Media" does not change fields already filled); cropping an image in "Media" creates a new file; the engine's own "Sections" (reusable blocks, hidden from the rail) have nothing to do with « Textes des pages »; the edit bar speaks English.
