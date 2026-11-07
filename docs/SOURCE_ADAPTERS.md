# Registre initial des marchés

| Code | Marché | Devise | Indice actions large | Référence monétaire prioritaire |
|---|---|---|---|---|
| MAR | Maroc | MAD | MASI | MONIA |
| GHA | Ghana | GHS | GSE Composite Index | Interbancaire / BoG Bills |
| UEMOA | BRVM/UEMOA | XOF | BRVM Composite | Interbancaire BCEAO |
| TUN | Tunisie | TND | TUNINDEX | TMM |
| EGY | Égypte | EGP | EGX100 EWI | CONIA Index |
| NGA | Nigeria | NGN | NGX All-Share Index | NOFRI |
| KEN | Kenya | KES | NSE All Share Index | KESONIA |
| CEMAC | BVMAC/CEMAC | XAF | BVMAC All Share Index | Interbancaire BEAC |
| BWA | Botswana | BWP | Domestic Company Index | BoBC |
| NAM | Namibie | NAD | NSX Overall Index | T-Bills / benchmark yields |
| ETH | Éthiopie | ETB | Aucun indice officiel configuré | T-Bills 28/91/182/364 jours |

Le détail des organismes et endpoints est dans `config/sources.json`. Le registre est versionné ; toute modification d’URL doit passer par une revue et un audit de disponibilité.

## Types de collecteurs

| Type | Fonction |
|---|---|
| `HTML_TABLE` | Extrait les tableaux visibles de la page |
| `HTML_TABLE_CSV` | Extrait le tableau et découvre le CSV associé |
| `DOCUMENT_LINK_INDEX` | Archive la page et les documents liés |
| `PDF_LINK_INDEX` | Recherche prioritairement les PDF |
| `XLSX_LINK_INDEX` | Recherche prioritairement les classeurs Excel |
| `MANUAL_API_DISCOVERY` | Bloque la certification jusqu’à compréhension de l’API dynamique |


## Qualification vérifiable des endpoints (évolution additive 2026-11-07)

Le catalogue de 11 marchés et 44 endpoints reste dans `config/sources.json` et `config/sources/*.json`, sans duplication ni remplacement. L'inventaire initial exhaustif et les critères de certification se trouvent dans [`SOURCE_QUALIFICATION_BASELINE_20261107.md`](SOURCE_QUALIFICATION_BASELINE_20261107.md).

Le script `scripts/audit-source-registry.mjs` génère un inventaire déterministe, puis, avec `--live`, contrôle en lecture seule le fichier `robots.txt` avant toute requête `HEAD` HTTPS sur un hôte officiel autorisé. Les résultats sont archivés comme preuves de workflow, jamais comme preuve implicite de collecte ou de couverture historique. Chaque source exige ensuite adaptateur, données témoins et recette spécifique. Les travaux complémentaires sont enregistrés dans les issues #13–#17 et l'issue backfill #5.
