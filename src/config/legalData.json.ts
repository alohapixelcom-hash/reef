// src/config/legalData.json.ts - contenu des pages privacy et terms, une version par langue : copie generique, prete a personnaliser.

import type { Locale } from "@i18n";
import type { LegalDocument } from "./types/configDataTypes";

// Deux documents rendus par le meme template de page. La copie decrit ce que le
// theme fait vraiment : un blog que l'on lit sans compte, une lettre
// d'information, un formulaire de contact, la preference de theme et le cookie
// de langue dans le navigateur ; ni compte, ni abonnement, ni facturation.
// L'utilisateur l'adapte a son site et la fait valider par son conseil. Aucun passage entre crochets ici : les champs a completer vivent
// dans les mentions legales, sous src/i18n/ui/en/pages.ts et son equivalent
// francais. Ceci n'est pas un avis juridique, et la version francaise n'en est
// pas davantage une : les deux textes disent la meme chose, aucun ne fait foi
// sur l'autre.

type LegalPages = { privacy: LegalDocument; terms: LegalDocument };

const en: LegalPages = {
  privacy: {
    title: "Privacy policy",
    description: "What we collect, why we collect it, and the choices you have over your data.",
    lastUpdated: "2026-09-24",
    sections: [
      {
        title: "Who we are",
        body: "This policy describes what this site collects when you read it, subscribe to its newsletter or write to us. If you have any question about it, you can reach us at any time through the contact page.",
      },
      {
        title: "Information we collect",
        body: "Reading a page collects nothing about you. If you subscribe to the newsletter, we keep your email address; if you write to us, we keep your message and your address to answer it.",
      },
      {
        title: "How we use your information",
        body: "Your email address is used to send you the newsletter you asked for, and nothing else; every issue includes a way to unsubscribe. Your message is used to answer you.",
      },
      {
        title: "Legal bases for processing",
        body: "Where data protection law requires a legal basis, we rely on your consent for the newsletter, on our legitimate interest in answering the messages you send us, and on our legal obligations.",
      },
      {
        title: "Cookies and analytics",
        body: "This site sets no advertising cookie and runs no analytics. Your browser keeps your light or dark theme preference and, if you switch language, a cookie that remembers that choice.",
      },
      {
        title: "How we share information",
        body: "We never sell personal information. We share it only with the processors that help us run the site, such as the host and the email provider that sends the newsletter, each bound by a data processing agreement, and with authorities where the law requires it.",
      },
      {
        title: "Data retention and deletion",
        body: "A newsletter address is deleted when you unsubscribe; a message is deleted once the conversation is over.",
      },
      {
        title: "Your rights",
        body: "Depending on where you live, you may have the right to access, correct, export, restrict or delete the personal information we hold about you, and to object to certain processing. To exercise any of these rights, contact us through the contact page and we will respond within the legal deadline.",
      },
      {
        title: "Changes to this policy",
        body: "We may update this policy as the site or the law evolves. The date at the top of this page always gives the latest version.",
      },
    ],
  },

  terms: {
    title: "Terms of use",
    description: "The terms that govern your use of this site, in plain language.",
    lastUpdated: "2026-09-24",
    sections: [
      {
        title: "Agreement to these terms",
        body: "By reading this site you accept these terms. If you do not accept them, please do not use it.",
      },
      {
        title: "Acceptable use",
        body: "You agree to use the site lawfully and respectfully. You will not attempt to breach its security, disrupt its operation, access data that is not yours, or use its forms to send unlawful or harmful content.",
      },
      {
        title: "Disclaimers and limitation of liability",
        body: "The site and its posts are provided as is, without warranties beyond those that cannot be excluded by law. A post reflects what its author knew on the date it carries; check anything you rely on. To the maximum extent permitted, we are not liable for decisions you make on the basis of what you read here.",
      },
      {
        title: "Changes to the site and these terms",
        body: "Posts are added, corrected and sometimes retired. These terms may also be updated; the date at the top of this page always gives the latest version.",
      },
      {
        title: "Contact",
        body: "Questions about these terms, or about anything else in this document, are welcome through the contact page. For legal notices, use the postal or email address listed there, and we will confirm receipt as soon as possible.",
      },
    ],
  },
};

const fr: LegalPages = {
  privacy: {
    title: "Politique de confidentialité",
    description: "Ce que nous collectons, pourquoi nous le collectons, et les choix qui vous reviennent.",
    lastUpdated: "2026-09-24",
    sections: [
      {
        title: "Qui nous sommes",
        body: "Cette politique décrit ce que ce site recueille lorsque vous le lisez, vous abonnez à son infolettre ou nous écrivez. Toute question à son sujet peut nous être adressée à tout moment depuis la page de contact.",
      },
      {
        title: "Les données que nous collectons",
        body: "Lire une page ne recueille rien sur vous. Si vous vous abonnez à l'infolettre, nous conservons votre adresse e-mail ; si vous nous écrivez, nous conservons votre message et votre adresse pour vous répondre.",
      },
      {
        title: "L'usage que nous en faisons",
        body: "Votre adresse e-mail sert à vous envoyer l'infolettre que vous avez demandée, et à rien d'autre ; chaque envoi comporte un moyen de vous désabonner. Votre message sert à vous répondre.",
      },
      {
        title: "Les bases légales du traitement",
        body: "Lorsque la réglementation sur la protection des données exige une base légale, nous nous appuyons sur votre consentement pour l'infolettre, sur notre intérêt légitime à répondre aux messages que vous nous adressez, et sur nos obligations légales.",
      },
      {
        title: "Cookies et mesure d'audience",
        body: "Ce site ne dépose aucun cookie publicitaire et ne mesure pas l'audience. Votre navigateur conserve votre préférence de thème clair ou sombre et, si vous changez de langue, un cookie qui retient ce choix.",
      },
      {
        title: "Le partage de vos données",
        body: "Nous ne vendons jamais de données personnelles. Nous les partageons uniquement avec les sous-traitants qui nous aident à faire tourner le site, l'hébergeur et le service d'envoi de l'infolettre par exemple, chacun étant lié par un accord de traitement des données, ainsi qu'avec les autorités lorsque la loi l'impose.",
      },
      {
        title: "Conservation et suppression",
        body: "Une adresse d'infolettre est supprimée à la désinscription ; un message l'est une fois l'échange terminé.",
      },
      {
        title: "Vos droits",
        body: "Selon votre lieu de résidence, vous disposez du droit d'accéder aux données personnelles que nous détenons sur vous, de les rectifier, de les exporter, d'en limiter le traitement ou de les faire supprimer, ainsi que de vous opposer à certains traitements. Pour exercer l'un de ces droits, écrivez-nous depuis la page de contact : nous répondons dans le délai prévu par la loi.",
      },
      {
        title: "Modifications de cette politique",
        body: "Cette politique peut évoluer avec le site ou avec la réglementation. La date en haut de cette page donne toujours la dernière version.",
      },
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    description: "Les conditions qui encadrent votre utilisation de ce site, écrites en langage clair.",
    lastUpdated: "2026-09-24",
    sections: [
      {
        title: "Acceptation des présentes conditions",
        body: "En lisant ce site, vous acceptez les présentes conditions. Si vous ne les acceptez pas, ne l'utilisez pas.",
      },
      {
        title: "Usage acceptable",
        body: "Vous vous engagez à utiliser le site dans le respect de la loi et d'autrui. Vous ne chercherez pas à contourner sa sécurité, à perturber son fonctionnement, à accéder à des données qui ne vous appartiennent pas, ni à vous servir de ses formulaires pour envoyer des contenus illicites ou nuisibles.",
      },
      {
        title: "Garanties et limitation de responsabilité",
        body: "Le site et ses articles sont fournis en l'état, sans autre garantie que celles que la loi ne permet pas d'écarter. Un article reflète ce que son auteur savait à la date qu'il porte : vérifiez ce sur quoi vous vous appuyez. Dans la limite autorisée par le droit applicable, nous ne répondons pas des décisions prises sur la foi de ce que vous lisez ici.",
      },
      {
        title: "Évolutions du site et des conditions",
        body: "Des articles s'ajoutent, se corrigent et parfois se retirent. Les présentes conditions peuvent également être mises à jour ; la date en haut de cette page donne toujours la dernière version.",
      },
      {
        title: "Nous contacter",
        body: "Toute question sur ces conditions, ou sur un autre point de ce document, est la bienvenue via la page de contact. Pour les notifications à caractère juridique, utilisez l'adresse postale ou électronique qui y figure : nous en accusons réception dans les meilleurs délais.",
      },
    ],
  },
};

const byLocale: Record<Locale, LegalPages> = { en, fr };

/** Les deux documents legaux dans la langue demandee. */
export function getLegalData(locale: Locale): { privacy: LegalDocument; terms: LegalDocument } {
  return byLocale[locale];
}
