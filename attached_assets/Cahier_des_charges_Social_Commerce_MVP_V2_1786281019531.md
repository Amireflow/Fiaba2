# CAHIER DES CHARGES — PLATEFORME DE SOCIAL COMMERCE

*MVP V1 · Document produit, fonctionnel et technique · Version 2.0 · 9 août 2026*
*Version 2.0 : intègre les décisions zones de livraison, interfaces par rôle, principes de design Wave, et règle un compte = un profil*

---

## 1. Objet du document

Ce document définit le périmètre, les règles métier, les parcours utilisateurs, les fonctionnalités, les exigences techniques et les critères de validation du MVP d'une plateforme de social commerce. La plateforme permet aux commerçants de distribuer leurs produits via des créateurs et vendeurs sociaux, avec matching par niche et rémunération à la performance.

Le document sert de référence commune entre produit, design, développement, QA et opérations.

## 2. Vision du produit

Créer une infrastructure de distribution commerciale adaptée aux usages sociaux : un commerçant peut trouver des vendeurs pertinents ; un vendeur peut trouver des produits adaptés à sa niche ; chaque vente est attribuée et mesurée ; le vendeur est rémunéré uniquement selon le modèle choisi et lorsque la vente est réellement validée.

Positionnement : ce n'est pas un nouveau réseau social généraliste et ce n'est pas une marketplace logistique. C'est une couche commerciale qui exploite les réseaux sociaux existants.

## 3. Principes de design — philosophie Wave

Contrainte transverse appliquée à tout l'MVP, pas une option esthétique :

- **Une action principale par écran.** Jamais un dashboard qui affiche tout à la fois.
- **Un choix à la fois dans les formulaires.** Onboarding et checkout séquencés étape par étape plutôt qu'un long formulaire unique.
- **Statuts simplifiés à l'affichage.** Les statuts techniques internes (15 statuts de commande, voir §12) sont regroupés en 3-4 états compréhensibles à l'écran (ex : *En cours / Livré / Payé / Annulé*).
- **Scores et recommandations présentés simplement.** Un signal clair (ex : "Fort potentiel pour vous") plutôt qu'un pourcentage brut ; le détail reste accessible en un tap pour qui veut creuser.
- **Texte minimal, structure qui parle d'elle-même.**
- **Palette et composants limités** : une couleur de marque forte, des neutres, pas de dégradés ni de skeuomorphisme.

Principe directeur : simplicité de présentation ≠ réduction du scope fonctionnel. Le système reste complet et rigoureux (voir §14, §25) ; c'est l'interface qui absorbe la complexité pour l'utilisateur.

## 4. Décisions stratégiques validées

| Décision | Choix retenu | Statut |
|---|---|---|
| Pays pilote | Sénégal | VALIDÉ |
| Plateforme | PWA web mobile-first | VALIDÉ |
| Applications natives | Après validation du MVP | REPORTÉ |
| Modèle | Social commerce + affiliation + revente sociale | VALIDÉ |
| Matching | Produit ↔ vendeur par niche et performance | VALIDÉ |
| Rémunération | Commission OU marge vendeur | VALIDÉ |
| COD | Supporté dès le MVP | VALIDÉ |
| Vente | Commande livrée + paiement confirmé | VALIDÉ |
| Client | Commande sans compte obligatoire | VALIDÉ |
| Logistique | Partenaires externes au départ | VALIDÉ |
| Wallet | Registre de commissions/marges, pas wallet financier propriétaire | VALIDÉ |
| Zones de livraison | Référentiel unique partagé (région/département/commune), couverture et frais définis par commerçant | VALIDÉ |
| Interfaces post-connexion | 3 interfaces distinctes : Commerçant, Vendeur, Administrateur | VALIDÉ |
| Comptes et profils | Un compte = un seul rôle/profil, fixé à l'inscription | VALIDÉ |
| Design | Philosophie de simplicité inspirée de Wave (voir §3) | VALIDÉ |
| Réseau social complet | Hors MVP | REPORTÉ |

## 5. Objectifs du MVP

- Permettre à un commerçant de publier un produit/campagne et de définir son modèle de rémunération.
- Permettre à un vendeur de créer son profil, ses niches et de découvrir des opportunités pertinentes.
- Attribuer chaque commande au vendeur à l'origine du trafic.
- Permettre le paiement à la livraison.
- Valider une vente uniquement après livraison et confirmation du paiement.
- Calculer automatiquement la commission ou la marge du vendeur.
- Donner aux commerçants et vendeurs une visibilité sur leurs performances.
- Permettre à chaque commerçant de définir ses propres zones de livraison couvertes et leurs frais.
- Tester la volonté réelle des commerçants de payer et des vendeurs de vendre avant d'investir dans une plateforme plus complexe.

## 6. Non-objectifs du MVP

- Créer un réseau social complet avec feed algorithmique.
- Créer une application iOS/Android native.
- Créer une flotte de livraison propriétaire.
- Devenir un établissement financier ou émettre un portefeuille réglementé.
- Construire un système d'IA complexe avant d'avoir des données.
- Déployer plusieurs pays dès le premier lancement.
- Construire un chat social généraliste.
- Gérer l'entreposage ou le stock physique pour les commerçants.
- Permettre à un compte de porter plusieurs profils (commerçant ET vendeur) — un compte = un rôle.

## 7. Comptes, rôles et interfaces

### 7.1 Principe général

Un compte est créé avec un rôle unique, choisi à l'inscription et non modifiable en autonomie (changement possible uniquement via l'administrateur, cas exceptionnel). Après connexion, l'utilisateur accède à **une seule** des trois interfaces suivantes, correspondant à son rôle. Le Client n'a pas de compte au MVP (voir §7.5) et n'entre donc pas dans cette logique d'interfaces.

### 7.2 Interface Commerçant

Pilotée par la question : combien je gagne et qui vend pour moi.

- Dashboard (CA, commandes, ventes, coût de distribution)
- Produits (création, édition, photos, prix, stock)
- Zones de livraison (sélection dans le référentiel, frais par zone)
- Créer campagne (niche, modèle commission/marge, zones, conditions)
- Campagnes (actives, suspendues, terminées)
- Vendeurs (recommandés, actifs, invités, performances)
- Commandes (recherche, filtres, statuts, détails)
- Analytics (clics, commandes, ventes, conversion, livraison)
- Paiements (montants dus, historique, rapprochements)
- Paramètres (profil, notifications, conditions)

### 7.3 Interface Vendeur

Pilotée par la question : combien je peux gagner et comment je partage.

- Onboarding (téléphone/OTP, type de vendeur, niches, localisation)
- Accueil / Pour toi (produits recommandés, campagnes, performances)
- Découvrir (recherche, filtres, catégories, niches)
- Détail produit (prix, commission/marge, compatibilité, conditions, zones couvertes)
- Mes campagnes (campagnes rejointes, statut, lien/code)
- Partager (copier lien, WhatsApp, réseaux sociaux)
- Mes ventes (commandes, statuts, ventes validées)
- Revenus (disponible, en attente, annulé, retraits)
- Profil (niches, réputation, informations, réseaux sociaux)

### 7.4 Interface Administrateur

Pilotée par le contrôle et la confiance de la plateforme.

- Dashboard global
- Utilisateurs et vérifications
- Produits/campagnes
- Commandes et statuts
- Commissions/marges
- Retraits
- Litiges
- Fraude et règles de risque
- Référentiel de zones (création/édition des zones région/département/commune)
- Niches/catégories
- Paramètres pays, frais et intégrations

### 7.5 Client

Le client n'a pas d'interface post-connexion : il n'a pas de compte obligatoire.

- Arrive depuis un lien partagé.
- Consulte l'offre.
- Passe commande sans compte obligatoire.
- Choisit un moyen de paiement disponible, notamment COD.
- Confirme et reçoit sa commande.

## 8. Concept de niche

Chaque vendeur possède une ou plusieurs niches. Chaque produit/campagne possède une catégorie, des sous-catégories et des tags. La structure est hiérarchique.

| Niveau | Exemple |
|---|---|
| Catégorie | Tech |
| Sous-niche | Smartphones |
| Tags | iPhone, Android, Samsung, gaming, accessoires |

Niches initiales candidates : Tech, Mode, Beauté, Maison, Food, Sport, Auto, Gaming, Éducation, Voyage, Luxe, Bébé. La sélection finale du lancement est à confirmer par l'étude de marché et le pilote sénégalais.

## 9. Zones de livraison

### 9.1 Principe : référentiel unique

Les zones de livraison forment un référentiel unique et partagé, géré par l'administrateur, structuré selon le découpage administratif du Sénégal :

- **Région** (ex : Dakar, Thiès, Saint-Louis…)
- **Département** (ex : Dakar, Pikine, Guédiawaye, Rufisque…)
- **Commune** (ex : Almadies, Parcelles Assainies, Grand Yoff…)

Ce référentiel est commun à tous les commerçants — il n'y a pas de zones dessinées librement (pas de tracé de polygone au MVP). Chaque commerçant sélectionne, parmi ce référentiel, les zones qu'il couvre.

### 9.2 Couverture initiale recommandée

Pour le pilote, granularité complète (jusqu'à la commune) sur Dakar, la zone de plus forte densité e-commerce/COD attendue. Les autres régions restent au niveau département tant que le volume ne justifie pas plus de détail.

### 9.3 Règles

- Chaque commerçant choisit ses zones couvertes et fixe un frais de livraison propre par zone (ou livraison gratuite au-delà d'un montant).
- Une zone peut être activée ou désactivée par le commerçant à tout moment ; la désactivation ne s'applique pas rétroactivement aux commandes déjà passées.
- Le checkout client doit vérifier la couverture de zone avant paiement et afficher le frais correspondant.
- Le matching vendeur/campagne (§10) intègre la compatibilité entre la zone couverte par le produit et la zone d'activité déclarée du vendeur.
- La zone de la commande est figée au moment de la commande (cohérent avec la règle de snapshot financier, §21).

## 10. Moteur de matching

Le matching est un moteur de recommandation initialement basé sur des règles simples et explicables. Il pourra évoluer avec les données.

- Compatibilité de niche.
- Sous-niche et tags.
- Localisation et zone de livraison couverte.
- Historique de ventes.
- Taux de livraison.
- Taux de confirmation.
- Taux de conversion.
- Type d'audience renseigné.
- Prix et niveau de commission/marge.
- Historique des campagnes et litiges.

Le score est présenté à l'écran de façon simple (ex : "Fort potentiel pour vous"), jamais comme un pourcentage brut mis en avant — conformément au principe de design du §3. Le détail des facteurs reste accessible en un tap.

## 11. Modèles commerciaux

### 11.1 Modèle A — Commission

Le commerçant fixe le prix de vente et une rémunération fixe ou en pourcentage. Le vendeur ne modifie pas le prix public.

Exemple : prix 20 000 FCFA ; commission 2 000 FCFA ; vendeur vend à 20 000 FCFA et reçoit 2 000 FCFA après validation.

### 11.2 Modèle B — Marge vendeur

Le commerçant fixe son prix de base. Le vendeur choisit un prix de vente supérieur ou égal au prix commerçant. La différence constitue sa marge.

Exemple : prix commerçant 20 000 FCFA ; prix vendeur 23 000 FCFA ; marge vendeur 3 000 FCFA.

Règle système : prix vendeur >= prix commerçant. Il n'est pas nécessaire d'introduire un mécanisme séparé de « prix minimum ».

### 11.3 Règles communes

- Le commerçant choisit le modèle pour chaque campagne.
- Le prix applicable à une commande est figé au moment de la commande.
- Une modification ultérieure du produit ne recalcule pas rétroactivement les commandes existantes.
- La plateforme doit toujours pouvoir déterminer le montant dû au commerçant, au vendeur et à la plateforme.

## 12. Parcours de vente de référence

Le parcours principal doit être optimisé avant toute fonctionnalité secondaire.

1. Commerçant crée le produit et sélectionne ses zones de livraison couvertes.
2. Commerçant crée une campagne et choisit le modèle de rémunération.
3. Le système calcule les vendeurs compatibles (niche + zone).
4. Vendeur rejoint la campagne.
5. Le système génère un lien/code unique.
6. Vendeur partage sur WhatsApp, TikTok, Instagram, Facebook ou autre canal.
7. Client ouvre le lien et passe commande.
8. Le système vérifie que la zone du client est couverte et affiche le frais de livraison.
9. Commande associée au vendeur.
10. Client confirme la commande.
11. Commerçant ou partenaire logistique expédie.
12. Livraison effectuée et paiement confirmé.
13. Commande devient une vente validée.
14. Commission ou marge passe en attente.
15. Après la période de sécurité, le montant devient disponible.
16. Vendeur demande son paiement selon les moyens disponibles.

## 13. Statuts de commande

| Statut | Description |
|---|---|
| CREATED | Commande créée. |
| PENDING_CONFIRMATION | Confirmation client attendue. |
| CONFIRMED | Commande confirmée. |
| PROCESSING | Préparation. |
| SHIPPED | Expédiée. |
| OUT_FOR_DELIVERY | En livraison. |
| DELIVERED | Livrée. |
| PAYMENT_CONFIRMED | Paiement confirmé. |
| COMMISSION_PENDING | Vente validée, rémunération en période de sécurité. |
| COMMISSION_AVAILABLE | Rémunération disponible. |
| CANCELLED | Annulée. |
| REFUSED | Refusée à la livraison. |
| RETURNED | Retournée. |
| FRAUD | Bloquée pour suspicion de fraude. |
| DISPUTED | Litige ouvert. |

Rappel §3 : ces 15 statuts sont un modèle technique interne. À l'écran vendeur/commerçant, ils sont regroupés en 3-4 états lisibles (ex : *En cours / Livré / Payé / Annulé*).

## 14. Attribution des ventes

Chaque vendeur reçoit un identifiant d'attribution unique par campagne. Le système enregistre les clics et rattache la commande au vendeur.

Règle MVP : attribution au dernier lien vendeur utilisé avant la commande (« last touch »). Une version future pourra tester d'autres modèles.

- Le tracking doit survivre au passage entre consultation et commande dans la mesure techniquement possible.
- Le système doit empêcher les doublons d'attribution.
- Les changements de prix ou de commission après commande ne doivent pas modifier la rémunération de cette commande.

## 15. Paiement à la livraison

Le COD est une fonctionnalité de premier rang. Une commande COD n'est pas une vente tant que la livraison et le paiement ne sont pas confirmés.

Mécanismes possibles à intégrer selon les partenaires du pays : statut logistique, OTP client, confirmation numérique du livreur, rapprochement de paiement mobile.

Le MVP doit privilégier des partenaires capables de fournir des statuts fiables au Sénégal. La plateforme ne doit pas manipuler directement du cash si cela peut être évité.

## 16. Commission, marge et registre financier

Le système doit maintenir des écritures immuables ou auditables. Chaque commande validée génère un calcul détaillé.

| Élément | Exemple commission | Exemple marge |
|---|---|---|
| Prix client | 20 000 | 23 000 |
| Montant commerçant | 20 000 | 20 000 |
| Rémunération vendeur | 2 000 | 3 000 |
| Base de calcul | Commission | Prix client - prix commerçant |

Les frais de plateforme, de paiement ou de livraison (y compris le frais de zone défini en §9) doivent être modélisés séparément afin de ne pas mélanger chiffre d'affaires, marge, commission et frais.

## 17. Wallet / revenus

Le MVP utilise un registre de revenus, et non nécessairement un portefeuille électronique réglementé.

- Disponible : montants libérés.
- En attente : ventes livrées mais soumises à la période de sécurité.
- Annulé : montants annulés ou repris.
- Historique détaillé par commande.
- Demande de retrait vers un moyen de paiement disponible.
- Journal des paiements et statuts de retrait.

## 18. Notifications

Le système doit prévoir une couche de notifications indépendante du canal.

- Commande créée.
- Confirmation nécessaire.
- Commande confirmée.
- Commande expédiée.
- Commande livrée.
- Paiement confirmé.
- Commission/marge disponible.
- Retrait demandé et traité.
- Invitation à une campagne.
- Campagne ou produit recommandé.

Canaux à intégrer selon disponibilité et réglementation : WhatsApp Business/API, SMS, email, notifications web/push.

## 19. Architecture technique recommandée

Architecture modulaire, API-first et mobile-first afin de permettre une future application native sans refaire le backend.

| Couche | Choix recommandé |
|---|---|
| Frontend | Next.js / React, PWA, responsive mobile-first |
| Backend | Node.js / NestJS ou architecture serveur équivalente |
| Base de données | PostgreSQL |
| Cache / jobs | Redis + système de jobs |
| Stockage | S3-compatible |
| Auth | Téléphone + OTP, sessions sécurisées, un rôle fixe par compte |
| API | REST ou REST + webhooks selon intégrations |
| Observabilité | Logs centralisés, métriques, alertes |
| Déploiement | Cloud avec environnements dev/staging/production |

## 20. Modèle de données principal

Entités principales à prévoir :

- User (porte un rôle unique : commerçant, vendeur ou administrateur)
- MerchantProfile
- SellerProfile
- Customer
- Niche
- Category
- Product
- Campaign
- CampaignSeller
- Zone (référentiel région/département/commune)
- MerchantZoneCoverage (zones couvertes par un commerçant + frais)
- TrackingLink
- Click
- Order (inclut zoneId figé à la commande)
- OrderItem
- Delivery
- Payment
- Commission
- Margin
- LedgerEntry
- Payout
- Review
- TrustScore
- Dispute
- Notification
- AuditLog

Relation critique : Seller → TrackingLink → Order → Payment/Delivery → ValidatedSale → LedgerEntry → Payout.

Note sur les profils : bien que `MerchantProfile` et `SellerProfile` soient des entités distinctes, chaque `User` n'est lié qu'à un seul profil actif à la fois (règle §6 — un compte = un rôle).

## 21. API / intégrations

Le système doit être conçu pour intégrer des partenaires externes plutôt que d'enfermer la plateforme dans un seul fournisseur.

- Paiements : fournisseurs locaux/mobile money au Sénégal (Wave, Orange Money notamment, à confirmer selon accords).
- Livraison/COD : partenaires fournissant statuts de livraison et, idéalement, confirmation d'encaissement, sur les zones définies en §9.
- WhatsApp/SMS : fournisseur/API officiellement supporté.
- Email transactionnel.
- Stockage médias.
- Analytics.

Les fournisseurs exacts ne sont pas figés dans ce cahier des charges : ils doivent être sélectionnés après vérification de leurs API, coûts, SLA et contraintes réglementaires au Sénégal.

## 22. Sécurité

- OTP avec limitation des tentatives.
- Sessions sécurisées et rotation des tokens.
- Chiffrement en transit et au repos selon les services utilisés.
- Contrôle d'accès par rôle (un rôle unique et fixe par compte, voir §7.1).
- Journal d'audit pour les opérations sensibles.
- Protection contre brute force et abus.
- Validation serveur de tous les montants.
- Jamais faire confiance au prix envoyé par le navigateur.
- Idempotence des webhooks paiement/livraison.
- Détection des commandes et comptes suspects.

## 23. Règles financières critiques

- Le navigateur ne peut jamais déterminer le montant final d'une commande.
- Le prix et la rémunération sont recalculés côté serveur.
- Chaque commande conserve un snapshot du prix, de la commission/marge, de la zone et du frais de livraison au moment de la commande.
- Un webhook peut être reçu plusieurs fois sans créer plusieurs paiements.
- Une commission ne peut être libérée qu'une seule fois.
- Toute reprise de commission doit créer une écriture compensatoire traçable.
- Les retraits doivent avoir un statut et un historique.

## 24. Antifraude

Le MVP commence par des règles simples et une revue administrative.

- Multiples comptes sur même téléphone ou signaux techniques.
- Auto-commandes et commandes vers mêmes informations.
- Taux de refus anormal.
- Volumes anormaux.
- Tentatives répétées sur un même produit.
- Manipulation du tracking.
- Comportement suspect des retraits.
- Litiges répétés.

Le Trust/Sales Quality Score doit pouvoir intégrer ces signaux sans bloquer automatiquement un utilisateur sans possibilité de revue.

## 25. Analytics produit

Événements minimum à instrumenter :

- signup_started / signup_completed
- niche_selected
- product_viewed
- campaign_viewed
- campaign_joined
- share_clicked
- tracking_link_clicked
- zone_coverage_checked
- checkout_started
- order_created
- order_confirmed
- order_shipped
- order_delivered
- payment_confirmed
- sale_validated
- commission_created
- margin_created
- payout_requested
- payout_completed
- order_refused
- order_returned

## 26. KPI de validation

| KPI | Pourquoi |
|---|---|
| Commerçants actifs | Mesure adoption côté offre. |
| Vendeurs actifs | Mesure liquidité du réseau. |
| Campagnes actives | Mesure inventaire disponible. |
| Clic → commande | Qualité du trafic. |
| Commande → confirmation | Qualité des commandes. |
| Commande → livraison | Qualité opérationnelle. |
| Livraison → paiement | Qualité COD. |
| Vente validée / clic | Performance réelle. |
| GMV | Volume commercial généré. |
| Commission/marge générée | Valeur pour les vendeurs. |
| Réachat commerçant | Signal clé de product-market fit. |
| Coût d'acquisition | Viabilité économique. |
| Couverture de zones | Part des commandes dans une zone couverte vs non couverte. |

## 27. Critères d'acceptation MVP

- Un commerçant peut publier une campagne complète sans intervention technique.
- Un commerçant peut sélectionner ses zones de livraison et définir un frais par zone.
- Un vendeur peut sélectionner ses niches et rejoindre une campagne.
- Chaque vendeur obtient un lien/code unique.
- Une commande issue du lien est correctement attribuée.
- Le prix vendeur ne peut pas être inférieur au prix commerçant en mode marge.
- Une commande conserve le snapshot financier et de zone applicable.
- Une vente COD n'est validée qu'après les événements requis.
- Une commission ou marge est calculée exactement une fois.
- Les retours/annulations peuvent reprendre une rémunération en attente ou disponible selon les règles.
- Le commerçant peut voir quel vendeur a généré chaque vente.
- Le vendeur peut voir ses revenus par statut.
- Un compte ne peut accéder qu'à une seule interface, correspondant à son rôle unique.
- Les administrateurs peuvent corriger un litige avec un journal d'audit.
- Les données critiques sont protégées côté serveur.

## 28. Phases de réalisation

| Phase | Contenu | Validation |
|---|---|---|
| 0 — Terrain | Entretiens, zones pilotes à Dakar, niches, partenaires paiement/logistique. | Go/No-Go |
| 1 — UX | Wireframes, parcours, design system mobile-first (principes Wave, §3). | Validation produit |
| 2 — Fondation | Auth (rôle unique par compte), profils, niches, catalogue, référentiel de zones. | QA fonctionnelle |
| 3 — Matching | Campagnes, recommandations, recrutement vendeur. | Tests matching |
| 4 — Commerce | Liens, pages produit, checkout avec vérification de zone, commandes. | Commande test |
| 5 — COD & finance | Livraison, paiement, commissions/marges, retraits. | Scénarios financiers |
| 6 — Admin & sécurité | Fraude, litiges, audit, permissions. | Security/QA |
| 7 — Pilote | Petits groupes commerçants/vendeurs à Dakar. | KPIs réels |
| 8 — V1 | Corrections + optimisation. | Go marché |

## 29. Roadmap V2

- Application mobile native.
- Boutiques publiques de créateurs.
- Feed de contenu commercial.
- Messagerie.
- IA de création de contenu.
- Prix recommandé.
- Matching prédictif.
- Programmes de fidélité.
- Campagnes privées avancées.
- Automatisation marketing.
- Intégrations e-commerce plus profondes.
- Extension du référentiel de zones à d'autres régions/pays.
- Zones personnalisées (dessin de polygone) si le besoin est confirmé par les données.

## 30. Vision long terme

La plateforme peut devenir un réseau de distribution social : chaque vendeur possède une identité commerciale, une réputation, des niches, des performances et une capacité de recommandation. Les commerçants disposent d'un réseau distribué de vendeurs, sans devoir embaucher chacun d'eux.

L'avantage défendable potentiel vient progressivement des données de performance : quels produits fonctionnent avec quelles niches, quels vendeurs livrent réellement, quelles audiences convertissent, quelles zones sont les plus rentables et quelles relations génèrent de la confiance.

## 31. Principes produit à ne jamais perdre

- La vente réelle prime sur les likes et les abonnés.
- Le vendeur doit comprendre immédiatement combien il peut gagner.
- Le client doit pouvoir commander avec le moins de friction possible.
- Le COD doit être traité comme un cas normal.
- Les montants financiers doivent être déterminés côté serveur.
- Le commerçant garde le contrôle de son prix de base et de ses zones couvertes.
- Le vendeur peut choisir entre commission et marge lorsque la campagne l'autorise.
- Un compte porte un seul rôle — pas d'ambiguïté d'interface.
- La simplicité d'usage (philosophie Wave) ne doit jamais réduire la rigueur fonctionnelle et financière du système.
- La plateforme doit rester légère et interopérable avec les infrastructures existantes.
- Chaque nouvelle fonctionnalité doit être évaluée selon son impact sur les ventes réelles.

## 32. Décision finale et prochaine étape

Le cahier des charges fonctionnel du MVP est maintenant défini, incluant les décisions de zones de livraison, d'interfaces par rôle et de simplicité de design. La prochaine étape n'est pas encore de coder immédiatement : il faut finaliser les intégrations opérationnelles au Sénégal (paiement, COD, livraison, réglementation, retrait), car elles conditionnent les choix techniques.

Après cette validation, le livrable suivant doit être le dossier UX/UI du MVP : arborescence complète, wireframes écran par écran pour chacune des 3 interfaces, états, composants, parcours et règles d'interaction — en cohérence avec les principes de design du §3. Ensuite seulement vient le backlog technique découpé en tickets de développement.
