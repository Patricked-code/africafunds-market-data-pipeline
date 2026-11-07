# Qualification officielle des sources — inventaire initial contrôlable

**Point de départ :** registre de `main` (version 0.2.0, 2026-07-29), 11 marchés/zones et 44 endpoints. **Cette table n'est PAS un résultat de collecte en direct.** Elle enregistre les 44 contrats actuellement configurés, qu'il ne faut pas effacer, écraser ou déclarer conformes sans preuve.

## Portée et ordre d'exécution

1. Vérifier 44/44 endpoints : URL, politique d'accès, disponibilité, protocole de récupération, historiques et couverture (issue #13).
2. Qualifier les cinq adaptateurs CBE et le GOSDMX tunisien + PDF/SDMX/JSON (issue #14).
3. Corriger les fenêtres de backfill, les claims et la reprise après interruption (issue #5 et PR #12), sans faux `SUCCESS`.
4. Raccorder les sorties aux schémas `market`/`fund`/`method`/`quality`/`calc`, selon lots 2–7 (issue #15).
5. Ajouter de façon compatible des sources officielles FX, inflation et fonds/VL, en conservant le catalogue initial (issue #16).
6. Attester les pilotes par marché jusqu'aux séries calculées et publiées, avec gates staging/prod (issue #17).

## Règles de qualification et de non-régression

- Les codes et URL ci-dessous sont des **données du dépôt**, pas des URL testées dans ce document.
- `REGISTERED_ONLY` = source connue. `NOT_VERIFIED` = historique, première/dernière date, pagination, qualité et droits non certifiés.
- Un code `HTTP_OK_UNVERIFIED_CONTENT` issu du workflow d'audit signifie uniquement qu'une requête `HEAD` a reçu un 2xx ; il ne prouve ni téléchargement, ni parse, ni date disponible.
- Une erreur 403/anti-bot, un 5xx, un timeout ou un refus robots peut provenir de l'environnement de vérification. Il n'autorise **aucun** contournement ni suppression automatique d'endpoint.
- Le workflow `.github/workflows/source-audit.yml` exécute un inventaire et un contrôle de robots avant un `HEAD` HTTPS limité aux 27 hôtes officiels configurés ; jamais de redirection suivie, de GET du contenu financier, ni de certificat historique sans données témoins.
- Les résultats d'exécution datés sont des **artifacts GitHub Actions** distincts de cette photographie de configuration. Le registre `config/sources/*.json` demeure la source d'autorité.
- Pour qualifier un historique : retrouver dates extrêmes et révisions réelles, vérifier l'intégralité des pages/fichiers, trous, unités, maturités, tests de parsing et rapprochement avec documents officiels.

## Matrice des 44 endpoints (lecture depuis les 11 JSON originaux)

| Marché | Endpoint | Famille | Collecteur | Périodicité | URL officielle enregistrée | Qualification | Historique |
|---|---|---|---|---|---|---|---|
| MAR | mar-bvc-indices | EQUITY_INDEX | HTML_LINK_INDEX | DAILY | https://www.casablanca-bourse.com/en/marche-du-cache/indices | REGISTERED_ONLY | NOT_VERIFIED |
| MAR | mar-bam-monia | MONEY_MARKET_RATE | HTML_TABLE_CSV | DAILY | https://www.bkam.ma/en/Markets/Key-indicators/Money-market/Monia-index-moroccan-overnight-index-average | REGISTERED_ONLY | NOT_VERIFIED |
| MAR | mar-bam-interbank | MONEY_MARKET_RATE | HTML_TABLE_CSV | DAILY | https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-monetaire/Marche-monetaire-interbancaire | REGISTERED_ONLY | NOT_VERIFIED |
| MAR | mar-bam-interbank-reference | YIELD_CURVE | HTML_TABLE_CSV | DAILY | https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-monetaire/Taux-de-reference-du-marche-interbancaire | REGISTERED_ONLY | NOT_VERIFIED |
| MAR | mar-bam-fx | FX | HTML_TABLE_CSV | DAILY | https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference | REGISTERED_ONLY | NOT_VERIFIED |
| GHA | gha-gse-market | EQUITY_INDEX | HTML_LINK_INDEX | DAILY | https://gse.com.gh/market-data/ | REGISTERED_ONLY | NOT_VERIFIED |
| GHA | gha-bog-tbill | TREASURY_RATE | HTML_TABLE | WEEKLY | https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/ | REGISTERED_ONLY | NOT_VERIFIED |
| GHA | gha-bog-bills | MONEY_MARKET_RATE | HTML_TABLE | WEEKLY | https://www.bog.gov.gh/treasury-and-the-markets/bank-of-ghana-bill-rates/ | REGISTERED_ONLY | NOT_VERIFIED |
| GHA | gha-bog-interest | YIELD_CURVE | HTML_LINK_INDEX | MONTHLY | https://www.bog.gov.gh/economic-data/interest-rates/ | REGISTERED_ONLY | NOT_VERIFIED |
| UEMOA | uemoa-brvm-indices | EQUITY_INDEX | HTML_TABLE | DAILY | https://www.brvm.org/fr/indices | REGISTERED_ONLY | NOT_VERIFIED |
| UEMOA | uemoa-bceao-interbank | MONEY_MARKET_RATE | HTML_LINK_INDEX | WEEKLY | https://www.bceao.int/fr/documents/evolution-du-marche-interbancaire-de-luemoa | REGISTERED_ONLY | NOT_VERIFIED |
| UEMOA | uemoa-bceao-operations | MONEY_MARKET_RATE | HTML_LINK_INDEX | WEEKLY | https://www.bceao.int/fr/documents/operations-effectuees-sur-le-marche-interbancaire-de-lumoa-0 | REGISTERED_ONLY | NOT_VERIFIED |
| UEMOA | uemoa-ut-curves | YIELD_CURVE | PDF_LINK_INDEX | WEEKLY | https://www.umoatitres.org/fr/ressources-2/courbe-des-taux/ | REGISTERED_ONLY | NOT_VERIFIED |
| TUN | tun-bvmt-market | EQUITY_INDEX | HTML_LINK_INDEX | DAILY | https://www.tunis-stockexchange.com/en | REGISTERED_ONLY | NOT_VERIFIED |
| TUN | tun-bct-gosdmx | MONEY_MARKET_RATE | MANUAL_API_DISCOVERY | DAILY | https://gosdmx.bct.gov.tn/gosdmx/pnrd?lang=FR | REGISTERED_ONLY | NOT_VERIFIED |
| TUN | tun-fin-auctions | TREASURY_RATE | DOCUMENT_LINK_INDEX | WEEKLY | https://www.finances.gov.tn/fr/adjudications | REGISTERED_ONLY | NOT_VERIFIED |
| TUN | tun-cmf-curves | YIELD_CURVE | DOCUMENT_LINK_INDEX | DAILY | https://www.cmf.tn/courbes-des-taux | REGISTERED_ONLY | NOT_VERIFIED |
| EGY | egy-egx-indices | EQUITY_INDEX | HTML_LINK_INDEX | DAILY | https://www.egx.com.eg/en/indices.aspx | REGISTERED_ONLY | NOT_VERIFIED |
| EGY | egy-cbe-conia | MONEY_MARKET_RATE | MANUAL_API_DISCOVERY | DAILY | https://www.cbe.org.eg/en/economic-research/statistics/conia/historical-data | REGISTERED_ONLY | NOT_VERIFIED |
| EGY | egy-cbe-conia-index | MONEY_MARKET_INDEX | MANUAL_API_DISCOVERY | DAILY | https://www.cbe.org.eg/ar/economic-research/statistics/conia/index-historical-data | REGISTERED_ONLY | NOT_VERIFIED |
| EGY | egy-cbe-interbank | MONEY_MARKET_RATE | MANUAL_API_DISCOVERY | DAILY | https://www.cbe.org.eg/en/economic-research/statistics/daily-interbank-rates-and-volumes/historical-data | REGISTERED_ONLY | NOT_VERIFIED |
| EGY | egy-cbe-tbills | TREASURY_RATE | MANUAL_API_DISCOVERY | AUCTION | https://www.cbe.org.eg/en/auctions/egp-t-bills/historical-data | REGISTERED_ONLY | NOT_VERIFIED |
| EGY | egy-cbe-tbonds | TREASURY_RATE | MANUAL_API_DISCOVERY | AUCTION | https://www.cbe.org.eg/en/auctions/egp-t-bonds-fixed-coupon/historical-data | REGISTERED_ONLY | NOT_VERIFIED |
| NGA | nga-ngx-market | EQUITY_INDEX | DOCUMENT_LINK_INDEX | DAILY | https://ngxgroup.com/exchange/data/market-data/ | REGISTERED_ONLY | NOT_VERIFIED |
| NGA | nga-cbn-nofr | MONEY_MARKET_INDEX | HTML_TABLE | DAILY | https://www.cbn.gov.ng/rates/NOF_Rates.html | REGISTERED_ONLY | NOT_VERIFIED |
| NGA | nga-cbn-government | TREASURY_RATE | HTML_TABLE | DAILY | https://www.cbn.gov.ng/rates/GovtSecurities.html | REGISTERED_ONLY | NOT_VERIFIED |
| NGA | nga-dmo-auctions | TREASURY_RATE | DOCUMENT_LINK_INDEX | MONTHLY | https://www.dmo.gov.ng/fgn-bonds/bonds-auction-results | REGISTERED_ONLY | NOT_VERIFIED |
| KEN | ken-nse-market | EQUITY_INDEX | DOCUMENT_LINK_INDEX | DAILY | https://www.nse.co.ke/ | REGISTERED_ONLY | NOT_VERIFIED |
| KEN | ken-cbk-markets | MONEY_MARKET_RATE | DOCUMENT_LINK_INDEX | DAILY | https://www.centralbank.go.ke/ | REGISTERED_ONLY | NOT_VERIFIED |
| KEN | ken-pdmo-home | YIELD_CURVE | HTML_TABLE | DAILY | https://pdmo.treasury.go.ke/ | REGISTERED_ONLY | NOT_VERIFIED |
| KEN | ken-pdmo-domestic | TREASURY_RATE | DOCUMENT_LINK_INDEX | MONTHLY | https://pdmo.treasury.go.ke/domestic-debt | REGISTERED_ONLY | NOT_VERIFIED |
| CEMAC | cemac-bvmac-index | EQUITY_INDEX | DOCUMENT_LINK_INDEX | DAILY | https://www.bvm-ac.org/ | REGISTERED_ONLY | NOT_VERIFIED |
| CEMAC | cemac-beac-money | MONEY_MARKET_RATE | DOCUMENT_LINK_INDEX | MONTHLY | https://www.beac.int/economie-stats/statistiques-marche-monetaire/ | REGISTERED_ONLY | NOT_VERIFIED |
| CEMAC | cemac-beac-securities | YIELD_CURVE | DOCUMENT_LINK_INDEX | MONTHLY | https://www.beac.int/economie-stats/statistiques-titres-publics/ | REGISTERED_ONLY | NOT_VERIFIED |
| BWA | bwa-bse-market | EQUITY_INDEX | DOCUMENT_LINK_INDEX | DAILY | https://www.bse.co.bw/ | REGISTERED_ONLY | NOT_VERIFIED |
| BWA | bwa-bob-news | MONEY_MARKET_RATE | DOCUMENT_LINK_INDEX | WEEKLY | https://www.bankofbotswana.bw/news | REGISTERED_ONLY | NOT_VERIFIED |
| BWA | bwa-bob-government | TREASURY_RATE | DOCUMENT_LINK_INDEX | AUCTION | https://www.bankofbotswana.bw/government-securities-auctions | REGISTERED_ONLY | NOT_VERIFIED |
| NAM | nam-nsx-indices | EQUITY_INDEX | DOCUMENT_LINK_INDEX | DAILY | https://nsx.com.na/ | REGISTERED_ONLY | NOT_VERIFIED |
| NAM | nam-bon-yield | YIELD_CURVE | HTML_TABLE | DAILY | https://www.bon.com.na/Bank/Financial-Markets/Investor-Relations/Market-Data-and-Information/Daily-Benchmark-Yield.aspx | REGISTERED_ONLY | NOT_VERIFIED |
| NAM | nam-bon-tbill | TREASURY_RATE | DOCUMENT_LINK_INDEX | AUCTION | https://www.bon.com.na/Bank/Financial-Markets/Investor-Relations/Government-Debt-Instruments/Treasury-Bill-Auctions.aspx | REGISTERED_ONLY | NOT_VERIFIED |
| NAM | nam-bon-bonds | TREASURY_RATE | DOCUMENT_LINK_INDEX | AUCTION | https://www.bon.com.na/Bank/Financial-Markets/Investor-Relations/Government-Debt-Instruments/Bond-Auctions.aspx | REGISTERED_ONLY | NOT_VERIFIED |
| NAM | nam-bon-historical-tbill | TREASURY_RATE | XLSX_LINK_INDEX | MONTHLY | https://www.bon.com.na/Bank/Financial-Markets/Investor-Relations/Domestic-Auctions/Historical-Data/Treasury-Bills-%28Monthly-Excel-Data%29.aspx | REGISTERED_ONLY | NOT_VERIFIED |
| ETH | eth-esx-market | EQUITY_INDEX | DOCUMENT_LINK_INDEX | DAILY | https://esx.et/data/market-data-tools-services/ | REGISTERED_ONLY | NOT_VERIFIED |
| ETH | eth-nbe-tbills | TREASURY_RATE | HTML_TABLE | AUCTION | https://nbe.gov.et/treasury-bills/ | REGISTERED_ONLY | NOT_VERIFIED |

## Couverture initiale des familles et blocages

- Nombre d'endpoints par marché : {"MAR":5,"GHA":4,"UEMOA":4,"TUN":4,"EGY":6,"NGA":4,"KEN":4,"CEMAC":3,"BWA":3,"NAM":5,"ETH":2}.
- Par famille : {"EQUITY_INDEX":11,"MONEY_MARKET_RATE":11,"YIELD_CURVE":7,"FX":1,"TREASURY_RATE":12,"MONEY_MARKET_INDEX":2}.
- Par collecteur : {"HTML_LINK_INDEX":7,"HTML_TABLE_CSV":4,"HTML_TABLE":8,"PDF_LINK_INDEX":1,"MANUAL_API_DISCOVERY":6,"DOCUMENT_LINK_INDEX":17,"XLSX_LINK_INDEX":1}.
- Six adaptateurs dynamiques explicites = `egy-cbe-conia`, `egy-cbe-conia-index`, `egy-cbe-interbank`, `egy-cbe-tbills`, `egy-cbe-tbonds`, `tun-bct-gosdmx`.
- Familles absentes du registre : `INFLATION` et collecte dédiée de fonds/VL ; une seule source `FX` enregistrée (Maroc). Les sources à compléter doivent faire l'objet d'une qualification avant activation.
- Le parseur PDF financier, les requêtes historiques API/SDMX, la normalisation par source et le traitement complet du backfill doivent encore être attestés.

## Prochaine action

Exécuter et analyser le workflow de qualification sur la PR de ce travail, récupérer les preuves source par source et ouvrir les sous-tâches nécessaires *dans les issues existantes*, sans modifier la configuration de 44 endpoints jusqu'à validation. Poursuivre en parallèle les PR de correction de backfill (#12) et de sécurité HTTP (#11), sans les fusionner ni déployer sans gates.

## Règle de publication — SadiaAF et non application AfricaFunds

**Portée du chantier :** SadiaAF est la plateforme centrale indépendante de données financières africaines ; `africafunds-market-data-pipeline` est le nom historique de son dépôt technique. AfricaFunds est une application consommatrice possible, non l'unique finalité de la collecte. Il ne faut pas rétrécir le modèle canonique, les droits d'accès ou la publication à cette application.

Les rapports d'audit JSON contiennent désormais, pour les 44 endpoints, des **gates négatifs par défaut** (`rightsStatus`, `sourceFormatStatus`, `historicalAdapterStatus`, `normalizationStatus`, `historicalCoverage`, `publicationEligible`). Seule une preuve documentée des autorisations de réutilisation, des adaptateurs et des résultats financiers peut lever un gate. Une réponse HTTP 2xx ne modifie jamais automatiquement ces critères. `sourceReadiness()` exige droits, format, adaptateur, historique, normalisation, preuve et validation de publication. Ce calcul de qualification n'est pas un service de publication et ne remplace pas les gates S1.

### Diligence documentaire Ghana GSE (à dater et renouveler)

- Page officielle des rapports par année : https://gse.com.gh/market-reports/ ; cela établit l'existence d'un index public de rapports, **pas** le droit de les intégrer ou redistribuer commercialement.
- Barème officiel GSE d'**avril 2024** (historique, non preuve des tarifs en vigueur) : https://gse.com.gh/wp-content/uploads/2025/01/GSE-Market-Price-List-2024.pdf ; il différencie notamment historique, données de fin de journée, usages non-display, calcul d'indices et distribution sur sites. La qualification des droits actuels et du périmètre d'utilisation doit être obtenue avant automatisation commerciale.
- Endpoint existant `gha-gse-market` : conserver la configuration tant que URL exacte, contrat d'accès, licences, couverture et tests ne sont pas validés. Le HEAD 404 constaté ne prouve ni l'indisponibilité du service ni la permission d'utiliser un autre chemin.

### Égypte et Tunisie — mécanismes officiels à approfondir

- Banque centrale d'Égypte : CONIA O/N https://www.cbe.org.eg/en/economic-research/statistics/conia/historical-data et CONIA Index https://www.cbe.org.eg/en/economic-research/statistics/conia/index-historical-data : les pages exigent la sélection de la période. **L'API et la pagination sont non vérifiées**, aucun bypass des protections d'accès.
- BCT Tunisie GOSDMX https://gosdmx.bct.gov.tn/ : portail référençant notamment taux d'intérêt, indices boursiers et téléchargements SDMX pour des séries ; paramètres d'API, droits d'utilisation et fixtures de résultats à établir.
