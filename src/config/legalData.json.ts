// src/config/legalData.json.ts - contenu des pages privacy et terms, une version par langue : copie generique, prete a personnaliser.

import type { Locale } from "@i18n";
import type { LegalDocument } from "./types/configDataTypes";

// Deux documents rendus par le meme template de page. La copie est volontairement
// generique ("nous", "le service") : l'utilisateur l'adapte et la fait valider par
// son conseil. Aucun passage entre crochets ici : les champs a completer vivent
// dans les mentions legales, sous src/i18n/ui/en/pages.ts et son equivalent
// francais. Ceci n'est pas un avis juridique, et la version francaise n'en est
// pas davantage une : les deux textes disent la meme chose, aucun ne fait foi
// sur l'autre.

type LegalPages = { privacy: LegalDocument; terms: LegalDocument };

const en: LegalPages = {
  privacy: {
    title: "Privacy policy",
    description: "What we collect, why we collect it, and the choices you have over your data.",
    lastUpdated: "2026-01-15",
    sections: [
      {
        title: "Who we are",
        body: "This policy describes how we collect, use and protect personal information when you visit our website or use our service. It applies to visitors, trial users and paying customers alike. If you have any question about it, you can reach us at any time through the contact page.",
      },
      {
        title: "Information we collect",
        body: "We collect the information you give us directly, such as your name, email address and company details when you create an account or contact us. We also collect usage information generated as you use the service, such as pages visited, features used and device data, along with any content you choose to store in your workspace.",
      },
      {
        title: "How we use your information",
        body: "We use your information to provide and improve the service, to secure accounts, to respond to your requests, and to send service messages such as billing notices and important changes. With your consent, we may also send product news, and every such message includes a way to opt out.",
      },
      {
        title: "Legal bases for processing",
        body: "Where data protection law requires a legal basis, we rely on the performance of our contract with you, on our legitimate interest in operating and improving the service, on your consent where we ask for it, and on our legal obligations, for example in accounting matters.",
      },
      {
        title: "Cookies and analytics",
        body: "We use a small number of cookies to keep you signed in and to remember your preferences. Our analytics measure aggregate usage of the site and never build advertising profiles. You can block cookies in your browser; the parts of the site that do not require an account will keep working.",
      },
      {
        title: "How we share information",
        body: "We never sell personal information. We share it only with the processors that help us run the service, such as hosting, payment and email providers, each bound by a data processing agreement, and with authorities where the law requires it. A current list of processors is available on request.",
      },
      {
        title: "Data retention and deletion",
        body: "We keep personal information for as long as your account is active and for a limited period afterwards to comply with legal obligations. When you delete your account, or ask us to, we delete or anonymize your data within 30 days, except where a longer retention is required by law.",
      },
      {
        title: "Your rights",
        body: "Depending on where you live, you may have the right to access, correct, export, restrict or delete the personal information we hold about you, and to object to certain processing. To exercise any of these rights, contact us through the contact page and we will respond within the legal deadline.",
      },
      {
        title: "Changes to this policy",
        body: "We may update this policy as the service or the law evolves. When we make a material change, we will notify account holders by email or through the service before the change takes effect, and the date at the top of this page will always reflect the latest version.",
      },
    ],
  },

  terms: {
    title: "Terms of service",
    description: "The agreement that governs your use of the service, in plain language.",
    lastUpdated: "2026-01-15",
    sections: [
      {
        title: "Agreement to these terms",
        body: "By creating an account or using the service, you agree to these terms on your own behalf or on behalf of the organization you represent. If you do not agree with them, please do not use the service. If you accept for an organization, you confirm that you have authority to bind it.",
      },
      {
        title: "Your account",
        body: "You are responsible for your account credentials and for the activity that happens under your account. Keep your password secure, use accurate registration information, and tell us promptly if you suspect unauthorized access. Accounts are for organizations and their members, not for resale.",
      },
      {
        title: "Acceptable use",
        body: "You agree to use the service lawfully and respectfully. You will not attempt to breach its security, disrupt its operation, access data that is not yours, or use it to store or distribute unlawful, infringing or harmful content. We may suspend accounts that put the service or its users at risk.",
      },
      {
        title: "Your content and data",
        body: "You retain all rights to the content and data you bring into the service. You grant us the limited license needed to host, process and display that content in order to provide the service to you, and nothing more. You can export your data at any time in standard formats.",
      },
      {
        title: "Subscriptions and billing",
        body: "Paid plans are billed in advance, monthly or yearly, and renew automatically until cancelled. You can cancel at any time from the billing page, effective at the end of the current period. Prices may change with at least 30 days notice, and changes never apply retroactively to a period you have already paid.",
      },
      {
        title: "Termination",
        body: "You may stop using the service and delete your account at any time. We may suspend or terminate accounts that materially breach these terms, after notice where practical. After termination we make your data available for export for 30 days, then delete it in line with our privacy policy.",
      },
      {
        title: "Disclaimers and limitation of liability",
        body: "The service is provided as is, without warranties beyond those that cannot be excluded by law. To the maximum extent permitted, our total liability for any claim related to the service is limited to the amounts you paid us in the twelve months before the event giving rise to the claim.",
      },
      {
        title: "Changes to the service and these terms",
        body: "We improve the service continuously and may add, change or retire features. We may also update these terms; when a change is material, we will give account holders reasonable advance notice. Continued use of the service after a change takes effect constitutes acceptance of the new terms.",
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
    lastUpdated: "2026-01-15",
    sections: [
      {
        title: "Qui nous sommes",
        body: "Cette politique décrit la façon dont nous collectons, utilisons et protégeons les données personnelles lorsque vous consultez notre site ou utilisez le service. Elle vaut pour les visiteurs, les comptes d'essai et les clients payants, sans distinction. Toute question à son sujet peut nous être adressée à tout moment depuis la page de contact.",
      },
      {
        title: "Les données que nous collectons",
        body: "Nous collectons les données que vous nous confiez directement : nom, adresse email et informations sur votre entreprise lors de la création d'un compte ou d'une prise de contact. Nous collectons également les données d'usage produites au fil de votre utilisation du service, comme les pages consultées, les fonctions employées et les caractéristiques de votre appareil, ainsi que les contenus que vous choisissez de conserver dans votre espace de travail.",
      },
      {
        title: "L'usage que nous en faisons",
        body: "Vos données nous servent à fournir et à améliorer le service, à sécuriser les comptes, à répondre à vos demandes et à vous adresser les messages liés au service, tels que les avis de facturation et les changements importants. Avec votre accord, nous pouvons également vous envoyer des nouvelles du produit : chacun de ces messages comporte un moyen de s'y soustraire.",
      },
      {
        title: "Les bases légales du traitement",
        body: "Lorsque la réglementation sur la protection des données exige une base légale, nous nous appuyons sur l'exécution du contrat qui nous lie à vous, sur notre intérêt légitime à exploiter et à améliorer le service, sur votre consentement lorsque nous le sollicitons, et sur nos obligations légales, en matière comptable notamment.",
      },
      {
        title: "Cookies et mesure d'audience",
        body: "Nous utilisons un petit nombre de cookies, destinés à vous maintenir connecté et à mémoriser vos préférences. Notre mesure d'audience porte sur l'usage global du site et ne constitue jamais de profil publicitaire. Vous pouvez bloquer les cookies depuis votre navigateur : les parties du site qui ne demandent pas de compte continueront de fonctionner.",
      },
      {
        title: "Le partage de vos données",
        body: "Nous ne vendons jamais de données personnelles. Nous les partageons uniquement avec les sous-traitants qui nous aident à faire tourner le service, hébergement, paiement et envoi d'emails par exemple, chacun étant lié par un accord de traitement des données, ainsi qu'avec les autorités lorsque la loi l'impose. La liste à jour de ces sous-traitants est communiquée sur demande.",
      },
      {
        title: "Conservation et suppression",
        body: "Nous conservons les données personnelles tant que votre compte est actif, puis pendant une durée limitée afin de respecter nos obligations légales. Lorsque vous supprimez votre compte, ou que vous nous demandez de le faire, vos données sont supprimées ou anonymisées sous 30 jours, sauf lorsqu'une conservation plus longue nous est imposée par la loi.",
      },
      {
        title: "Vos droits",
        body: "Selon votre lieu de résidence, vous disposez du droit d'accéder aux données personnelles que nous détenons sur vous, de les rectifier, de les exporter, d'en limiter le traitement ou de les faire supprimer, ainsi que de vous opposer à certains traitements. Pour exercer l'un de ces droits, écrivez-nous depuis la page de contact : nous répondons dans le délai prévu par la loi.",
      },
      {
        title: "Modifications de cette politique",
        body: "Cette politique peut évoluer avec le service ou avec la réglementation. En cas de changement substantiel, les titulaires de compte en sont informés par email ou depuis le service avant son entrée en vigueur, et la date affichée en haut de cette page correspond toujours à la version en cours.",
      },
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    description: "L'accord qui encadre votre utilisation du service, écrit en langage clair.",
    lastUpdated: "2026-01-15",
    sections: [
      {
        title: "Acceptation des présentes conditions",
        body: "En créant un compte ou en utilisant le service, vous acceptez les présentes conditions, en votre nom propre ou au nom de l'organisation que vous représentez. Si vous ne les acceptez pas, n'utilisez pas le service. Si vous les acceptez pour une organisation, vous confirmez disposer du pouvoir de l'engager.",
      },
      {
        title: "Votre compte",
        body: "Vous répondez de vos identifiants et de tout ce qui se produit depuis votre compte. Gardez votre mot de passe en lieu sûr, renseignez des informations exactes à l'inscription et prévenez-nous sans tarder si vous soupçonnez un accès non autorisé. Les comptes sont destinés aux organisations et à leurs membres, jamais à la revente.",
      },
      {
        title: "Usage acceptable",
        body: "Vous vous engagez à utiliser le service dans le respect de la loi et d'autrui. Vous ne chercherez pas à contourner sa sécurité, à perturber son fonctionnement, à accéder à des données qui ne vous appartiennent pas, ni à vous en servir pour stocker ou diffuser des contenus illicites, contrefaisants ou nuisibles. Nous pouvons suspendre les comptes qui font courir un risque au service ou à ses utilisateurs.",
      },
      {
        title: "Vos contenus et vos données",
        body: "Vous conservez l'intégralité de vos droits sur les contenus et les données que vous apportez dans le service. Vous nous accordez la licence limitée nécessaire pour les héberger, les traiter et les afficher afin de vous fournir le service, et rien de plus. Vous pouvez exporter vos données à tout moment dans des formats standards.",
      },
      {
        title: "Abonnements et facturation",
        body: "Les offres payantes sont facturées d'avance, au mois ou à l'année, et se renouvellent automatiquement jusqu'à résiliation. Vous pouvez résilier à tout moment depuis la page de facturation, avec effet à la fin de la période en cours. Les tarifs peuvent évoluer moyennant un préavis d'au moins 30 jours, et aucune évolution ne s'applique rétroactivement à une période déjà réglée.",
      },
      {
        title: "Résiliation",
        body: "Vous pouvez cesser d'utiliser le service et supprimer votre compte quand vous le souhaitez. Nous pouvons suspendre ou fermer les comptes qui manquent gravement aux présentes conditions, après vous en avoir averti lorsque cela reste possible. Après la fermeture, vos données restent exportables pendant 30 jours, puis sont supprimées conformément à notre politique de confidentialité.",
      },
      {
        title: "Garanties et limitation de responsabilité",
        body: "Le service est fourni en l'état, sans autre garantie que celles que la loi ne permet pas d'écarter. Dans la limite autorisée par le droit applicable, notre responsabilité totale au titre de toute réclamation liée au service est plafonnée aux sommes que vous nous avez versées au cours des douze mois précédant le fait générateur.",
      },
      {
        title: "Évolutions du service et des conditions",
        body: "Nous améliorons le service en continu et pouvons ajouter, modifier ou retirer des fonctions. Les présentes conditions peuvent également être mises à jour : en cas de changement substantiel, les titulaires de compte en sont prévenus dans un délai raisonnable. Continuer d'utiliser le service après l'entrée en vigueur d'un changement vaut acceptation des nouvelles conditions.",
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
