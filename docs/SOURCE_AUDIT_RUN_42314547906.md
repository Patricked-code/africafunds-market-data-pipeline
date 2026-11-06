# Source qualification — première preuve de contrôle réseau (44 endpoints)

**Preuve GitHub Actions** : [workflow #42314547906](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42314547906) — `SUCCESS`, HEAD exact `da1e669531ba7533df412b4f2d889374a66128e7`.

**Horodatage UTC de l'artefact** : début `2026-11-06T23:51:16.483Z`, fin `2026-11-06T23:52:40.575Z`. Date France : 2026-11-07. Pièce native : `source-qualification-evidence-42314547906` (artifact GitHub ID `13549179118`, ZIP digest `sha256:fe0478df2bc5d332db354d8391e50fe7c8a1bf5847a9f5bbc9a238aa9bce13cd`, expiration annoncée 2026-12-06). Le présent document est le résultat agrégé durable, distinct des logs bruts.

## Interprétation obligatoire

Ces sondages sont des requêtes `HEAD` HTTPS, sans téléchargement, sans redirection suivie, après contrôle `robots.txt` conservateur, à débit limité. **Ils ne valident pas les séries, le format réel, l'historique, le droit de réutilisation, la normalisation ou une production opérationnelle.** Les statuts sont propres à ce runner, à cet instant et à sa méthode.

- **14 `HTTP_OK_UNVERIFIED_CONTENT`** : réponses `HEAD 200`, accessibilité HEAD seulement.
- **7 `RESTRICTED`** : réponses `HEAD 403`, possibilité de blocage anti-bot ou de méthode HEAD ; ne pas contourner et ne pas désactiver la source.
- **1 `NOT_FOUND`** : réponse `HEAD 404` GSE Ghana, à contrôler par canal autorisé et URL officielle actualisée ; aucune suppression automatique.
- **22 `NOT_PROBED`** : robots non accessible (réseau/403) ou règle complexe non évaluée ; volontairement aucune requête HEAD, non équivalent à source en panne.
- **0 source déclarée `HISTORY_COMPLETE`**, aucune date extrême, aucune pagination ou extraction métier attestée.

## Statuts observés pour chacun des 44 endpoints

| Marché | Endpoint | Vérification | Motif / Réponse |
|---|---|---|---|
| MAR | `mar-bvc-indices` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| MAR | `mar-bam-monia` | `NOT_PROBED` | ROBOTS_HTTP_403 |
| MAR | `mar-bam-interbank` | `NOT_PROBED` | ROBOTS_HTTP_403 |
| MAR | `mar-bam-interbank-reference` | `NOT_PROBED` | ROBOTS_HTTP_403 |
| MAR | `mar-bam-fx` | `NOT_PROBED` | ROBOTS_HTTP_403 |
| GHA | `gha-gse-market` | `NOT_FOUND` | HEAD 404 |
| GHA | `gha-bog-tbill` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| GHA | `gha-bog-bills` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| GHA | `gha-bog-interest` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| UEMOA | `uemoa-brvm-indices` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| UEMOA | `uemoa-bceao-interbank` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| UEMOA | `uemoa-bceao-operations` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| UEMOA | `uemoa-ut-curves` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| TUN | `tun-bvmt-market` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| TUN | `tun-bct-gosdmx` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| TUN | `tun-fin-auctions` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| TUN | `tun-cmf-curves` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| EGY | `egy-egx-indices` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| EGY | `egy-cbe-conia` | `RESTRICTED` | HEAD 403 |
| EGY | `egy-cbe-conia-index` | `RESTRICTED` | HEAD 403 |
| EGY | `egy-cbe-interbank` | `RESTRICTED` | HEAD 403 |
| EGY | `egy-cbe-tbills` | `RESTRICTED` | HEAD 403 |
| EGY | `egy-cbe-tbonds` | `RESTRICTED` | HEAD 403 |
| NGA | `nga-ngx-market` | `RESTRICTED` | HEAD 403 |
| NGA | `nga-cbn-nofr` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| NGA | `nga-cbn-government` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| NGA | `nga-dmo-auctions` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| KEN | `ken-nse-market` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| KEN | `ken-cbk-markets` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| KEN | `ken-pdmo-home` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| KEN | `ken-pdmo-domestic` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| CEMAC | `cemac-bvmac-index` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| CEMAC | `cemac-beac-money` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| CEMAC | `cemac-beac-securities` | `NOT_PROBED` | ROBOTS_NETWORK_UNVERIFIED |
| BWA | `bwa-bse-market` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| BWA | `bwa-bob-news` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| BWA | `bwa-bob-government` | `NOT_PROBED` | ROBOTS_COMPLEX_RULE_UNVERIFIED |
| NAM | `nam-nsx-indices` | `RESTRICTED` | HEAD 403 |
| NAM | `nam-bon-yield` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| NAM | `nam-bon-tbill` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| NAM | `nam-bon-bonds` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| NAM | `nam-bon-historical-tbill` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| ETH | `eth-esx-market` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |
| ETH | `eth-nbe-tbills` | `HTTP_OK_UNVERIFIED_CONTENT` | HEAD 200 |

## Suites gouvernées à exécuter

1. Pour les 22 non sondées : examiner robots avec parser conforme à la politique officielle, ou demander la voie d'accès documentée ; **aucun bypass**.
2. Pour les 7 restrictions : confirmer s'il existe une API officielle autorisée, un export documenté ou un fournisseur sous licence ; aucune supposition d'indisponibilité.
3. Pour le 404 GSE : vérifier le site officiel, les redirections autorisées et l'URL de remplacement, modifier le registre seulement avec contrôle et preuve.
4. Pour les 14 réponses positives : identifier les formats/exports, tester la présence de séries et les dates, puis réaliser un adaptateur et un contrôle métier par source.
5. Étendre la matrice à première/dernière date, trous, versions, preuves de parsing et qualité ; appliquer gates de l'issue #13 avant la qualification opérationnelle.

**Autorité des sources** : `config/sources.json` + 11 fichiers originaux, inchangés. Cette preuve est un snapshot de qualification sur PR #18, pas un nouveau registre primaire.
