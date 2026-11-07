# Source qualification — attestation du run #42381995032 (2026-11-07)

**Périmètre** : étape 1/6 (issue #13), lot 4 / lot 11, chaîne SadiaAF ; le dépôt conserve son nom historique. Ce document est une preuve **réseau, non financière**, issue d'un artefact GitHub Actions natif ; il ne remplace **jamais** les 11 fichiers `config/sources/*.json` ni le manifeste `config/sources.json`.

## Preuve reproductible et chaîne d'autorité

- PR : [#18](https://github.com/Patricked-code/africafunds-market-data-pipeline/pull/18), branche `audit/official-source-qualification-20261107`.
- HEAD contrôlé pour cet audit : `eff4ca4696585080bdac5b9a3f18e3f061230c51`.
- Workflow qualification : [#42381995032](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42381995032), **SUCCESS**, exécution `qualify-44-endpoints` ; CI générale sur le même HEAD : [#42381995480](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42381995480), **SUCCESS**.
- Artefact : `source-qualification-evidence-42381995032`, GitHub artifact ID **13577514837** ; `inventory.json` et `live-head-checks.json` ; archive ZIP SHA-256 `f9236465743ce493ec08ce4799bcbd890fae212678b7bb9f95214533d06807ec`, calculé après téléchargement.
- Plage d'exécution présente dans `live-head-checks.json` : `2026-11-07T14:31:54.162Z` → `2026-11-07T14:33:17.587Z`. Méthode déclarée : contrôle de `robots.txt` puis `HEAD` HTTPS sans suivi des redirections ni téléchargement de fichiers financiers.
- Registre version `0.2.0` : **11 marchés/zones, 44 identifiants d'endpoints** ; les deux JSON contiennent 44 enregistrements.
- Cette attestation ne reproduit aucun secret, aucune réponse de page protégée et aucune donnée de marché non autorisée.

## Résultat exact du dernier artefact

| Statut de sonde | Nombre | Portée de la preuve |
|---|---:|---|
| `HTTP_OK_UNVERIFIED_CONTENT` | **13** | HEAD HTTP 200 ; pas de preuve de format, dates, série, licence ou téléchargement |
| `NOT_PROBED` | **28** | Aucun HEAD en raison d'un gate robots/réseau conservateur |
| `RESTRICTED` | **2** | HEAD HTTP 403 ; une restriction à cette méthode/ce runner, pas une indisponibilité générale |
| `NOT_FOUND` | **1** | HEAD HTTP 404 ; URL et contrat source à réexaminer |
| **Total** | **44** | 44/44 inventoriés, **0** historique certifié |

Les 28 `NOT_PROBED` se décomposent en **11** `ROBOTS_COMPLEX_RULE_UNVERIFIED`, **8** `ROBOTS_NETWORK_UNVERIFIED`, **5** `ROBOTS_UNEXPECTED_CONTENT_TYPE`, et **4** `ROBOTS_HTTP_403`. Ces valeurs sont les sorties du run, pas des jugements définitifs sur les sites.

| Marché/zone | Sources | HEAD 200 | Non sondées | HEAD 403 | HEAD 404 |
|---|---:|---:|---:|---:|---:|
| MAR | 5 | 0 | 5 | 0 | 0 |
| GHA | 4 | 3 | 0 | 0 | 1 |
| UEMOA | 4 | 1 | 3 | 0 | 0 |
| TUN | 4 | 1 | 3 | 0 | 0 |
| EGY | 6 | 0 | 6 | 0 | 0 |
| NGA | 4 | 0 | 3 | 1 | 0 |
| KEN | 4 | 1 | 3 | 0 | 0 |
| CEMAC | 3 | 1 | 2 | 0 | 0 |
| BWA | 3 | 1 | 2 | 0 | 0 |
| NAM | 5 | 4 | 0 | 1 | 0 |
| ETH | 2 | 1 | 1 | 0 | 0 |
| **TOTAL** | **44** | **13** | **28** | **2** | **1** |

### Cas appelant un examen explicite

- `gha-gse-market` : HEAD **404** sur l'URL enregistrée. Ne pas modifier/supprimer sans vérification de la voie officielle, du format et des droits d'utilisation.
- `nga-ngx-market` et `nam-nsx-indices` : HEAD **403**, contexte à requalifier sans contournement.
- Les 5 endpoints CBE Égypte : `NOT_PROBED / ROBOTS_UNEXPECTED_CONTENT_TYPE` ; les requêtes dynamiques, périodes, licences et fixtures restent inconnues.
- `tun-bct-gosdmx` : HEAD **200** seulement ; **aucun** contrat d'API/DSD SDMX, droits de collecte ou période historique ne sont prouvés par le run.

## Gates qualité et publication

- **44/44** : `rightsStatus=NOT_VERIFIED`.
- **44/44** : `publicationEligible=false`.
- **0/44** : historique `HISTORY_COMPLETE` attesté.
- Aucun `HEAD 200` ni test unitaire ne doit lever les gates sur licence, format, adaptateur, fenêtres, datation économique, qualité métier, révisions, non-anticipation ou publication.
- Une nouvelle sonde n'annule pas les observations datées du [run antérieur #42314547906](SOURCE_AUDIT_RUN_42314547906.md) (14 positifs, 22 non sondés, 7 restreints, 1 non trouvé). Il s'agit de **deux observations**, réalisées avec versions différentes de l'auditeur ; la hausse des non-sondages peut notamment résulter de ses politiques de prudence, sans permettre une attribution causale certaine.

## Statut, risques, plan de reprise

- **DONE** : contrôle de l'intégrité de l'artefact, inventaire 44/44, ventilation des résultats et conservation d'une attestation GitHub datée.
- **PARTIAL** : issue #13, qualification officielle par institution et par famille.
- **BLOCKED / NEEDS_REVIEW** : licences et contrats, six adaptateurs #14, fenêtres et claims backfill #5, mapping/qualité #15, nouvelles sources #16 et recettes de marchés #17.
- **NEXT_ACTION** : qualifier les 13 endpoints accessibles HEAD par des contrats/formats/échantillons **autorisés** ; reprendre les 28 non sondés par examen documenté de la politique robots ; isoler le 404 GSE et les 2 HTTP 403 ; rechercher le contrat officiel pour les six adaptateurs Égypte/Tunisie sans inférer une API ; reprendre les PR P0 sans collision avec d'autres agents.
- **Rollback** : ce fichier est **strictement additif** sur la branche Draft #18 ; son retrait par un commit inverse n'affecte ni le registre, ni les sources brutes, ni les migrations, ni S1. Aucune fusion ni production autorisée au titre de ce rapport.

**Important** : la qualification réseau de ce document est indépendante de la résolution du P0 GitHub [issue #3](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/3) (visibilité publique observée, main non protégée).
