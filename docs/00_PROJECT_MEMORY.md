# 00 — Mémoire persistante du projet

## Sources documentaires et priorité

Le présent document est la mémoire d'entrée du projet. Le contenu complémentaire de la PR #2 est conservé intégralement dans [`docs/PROJECT_MEMORY.md`](PROJECT_MEMORY.md) comme **annexe historique détaillée**, et non comme second état courant. Pour le statut opérationnel, utiliser `docs/06_CURRENT_STATUS_AND_GAPS.md`, `docs/09_CHANGELOG_WORKLOG.md` et les preuves GitHub, en vérifiant leurs dates et SHAs.

## Identité

- Projet : **AfricaFunds Market Data Pipeline / SadiaAF**
- Dépôt : `Patricked-code/africafunds-market-data-pipeline`
- Production prévue, non encore autorisée :
  - `sadiaaf.wealthtechinnovations.com`
  - `api.sadiaaf.wealthtechinnovations.com`
- Production S1 : volontairement différée jusqu’à validation complète.

## Finalité

Construire une plateforme autonome, auditable et multi-applications de données financières africaines capable de :

1. collecter les publications officielles ;
2. archiver les originaux sans écrasement ;
3. extraire et normaliser les observations ;
4. reconstituer les historiques ;
5. construire courbes, valorisations, indices et benchmarks ;
6. publier les séries en devise locale, EUR et USD ;
7. alimenter AfricaFunds et d’autres applications ;
8. échanger avec d’autres bases grâce à des mappings versionnés ;
9. offrir un cockpit Super Administrateur sécurisé ;
10. garantir provenance, qualité, reproductibilité et rollback.

## Marchés initiaux

Maroc, Ghana, UEMOA/BRVM, Tunisie, Égypte, Nigeria, Kenya, CEMAC/BVMAC, Botswana, Namibie, Éthiopie.

## Classes d’actifs prioritaires

- Actions
- Monétaire
- Obligations
- Diversifiés

## Hiérarchie métier

```text
N1 Classe d’actifs
└── N2 Afrique EUR / USD
    └── N3 Région EUR / USD
        └── N4 Marché national en devise locale
            └── N5 Catégorie nationale
                └── N6 Segment spécialisé
```

Pour les obligations nationales : Agrégé, CT, MT et LT. Les bornes sont historisées dans une table méthodologique et non codées en dur.

## Principes maîtres

- La valeur locale est la source économique ; EUR et USD sont des vues converties.
- Les fonds utilisés, exclus, sans VL et la couverture sont conservés chaque jour.
- Les appartenances fonds/catégories sont historisées.
- La date économique est distincte de la date de publication et de téléchargement.
- Les calculs historiques n’utilisent aucune information future.
- Un historique de taux seul ne constitue pas automatiquement un véritable indice obligataire Total Return.
- Les prix observés, prix théoriques et proxies restent séparés.
- Toute série publiée doit être reconstructible.

## Documents de référence reçus

- `Mécanisme de calcul journalier AfricaFunds.pdf`
- `AfricaFunds — Registre des indices et séries de taux nationaux.pdf`
- `Méthodologie des indices obligataires AfricaFunds.pdf`

Leur contenu méthodologique est synthétisé dans `docs/04_FINANCIAL_METHODOLOGIES.md` et doit être conservé comme source de conception.

## État global au 31 juillet 2026

Présent : socle Node/TypeScript, PostgreSQL et migrations, collecte générique, archive SHA-256, parseurs HTML/CSV/Excel, file de backfill, scheduler, API de lecture, tableau de supervision, scripts S1.

Non terminé : authentification et Super Admin, interopérabilité multi-bases, adaptateurs spécifiques complets, moteur complet de courbes et Total Return, indices de catégories, benchmarks définitifs, PostHog, tests réels complets, staging et production.
