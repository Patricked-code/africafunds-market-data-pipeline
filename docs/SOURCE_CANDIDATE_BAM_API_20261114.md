# Source candidate — Bank Al-Maghrib API (issue #16, 2026-11-14)

Status: **DISCOVERY_ONLY / BLOCKED_LICENSE / NO_INGESTION**. This is an additive research note, not a source registration or authorization.

- Primary institution: Bank Al-Maghrib (Morocco), existing Moroccan FX family already represented in original registry; verify existing source ID before any addition to avoid duplication.
- Official developer portal: https://apihelpdesk.centralbankofmorocco.ma/ — explicitly advertises API discovery/documentation and a **free API key subscription**. This establishes an official developer entry point, **not** a reusable open-data licence or a working FX endpoint.
- Official API contract/FX endpoint: **NOT_VERIFIED** (API catalog endpoint, authentication scopes, pagination, date semantics, quota, format and permitted redistribution need direct documentation review).
- Rights: **NOT_VERIFIED**. A free API key is not a licence to redistribute, bulk archive or republish. No credential requested or stored.
- Frequency: **NOT_VERIFIED against primary API docs**. Do not infer from third-party mirrors.
- Observation witness (primary publisher, exact date/value, retrieval response, checksum): **NOT_OBTAINED**. No financial rate, historical coverage or ingestion claim.
- Third-party redistributors are **not authoritative primary evidence**; their MIT SDK licence does not license the underlying central-bank observations.

Acceptance before adding any endpoint: official FX API specification + publisher's permitted access/retention/redistribution terms + legal/robots review + exact request/response with publication/economic dates + raw SHA-256 + parser/normalizer tests + non-regression of 44 original sources. Existing source must be checked for duplication first.

**BLOCK_REASON:** official API specification and data reuse terms, credentials if needed, and a verified primary observation are absent. **NEXT_ACTION:** inspect official API catalog and licence with authorized access; capture one permitted primary witness; only then add an endpoint/parser to existing modules and test it. Do not bypass access controls.

## Réconciliation du registre existant — 2026-11-14

Inspection directe de `config/sources.json` et `config/sources/MAR.json` sur la branche PR #29 : le marché `MAR` contient déjà **`mar-bam-fx`**, famille `FX`, collecteur `HTML_TABLE_CSV`, fréquence déclarative `DAILY`, URL historique `https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference`. Cette fréquence est **une configuration du dépôt**, non une vérification de cadence officielle. La nouvelle API candidate ne doit donc pas être ajoutée comme deuxième source sans contrat distinct, mapping explicite et politique de déduplication. Test de non-régression ajouté au fichier existant `test/source-family-additive-compat.test.ts` (commit `4bf618ab235e5da8323e04f1091703f3acdd57c9`). Tests locaux NOT_RUN ; CI exact-HEAD à vérifier. Aucun endpoint ni donnée réelle ajoutés.

## Qualification technique exécutable — 2026-11-14 03:34 Europe/Paris

**Périmètre vérifié :** la source existante `mar-bam-fx` est déjà déclarée dans `config/sources/MAR.json`. Une API BAM candidate n'est **pas** une nouvelle série certifiée ; aucun endpoint supplémentaire ne peut être inscrit sur la seule base d'un portail développeurs.

### Contrat d'admission à satisfaire avant code d'ingestion réelle

| Contrôle | Preuve requise | État |
|---|---|---|
| Identité de la série | identifiant officiel, unités, devise cotée/de base, sens du taux et périmètre géographique | BLOCKED — contrat absent |
| Accès et réutilisation | URL contractuelle primaire, authentification autorisée, licence conservation/redistribution et limites de requêtes | BLOCKED — licence absente |
| Temporalité | date économique, date de publication, fuseau et calendrier de révision | BLOCKED — schéma absent |
| Témoin brut | réponse primaire autorisée horodatée, en-têtes pertinents et SHA-256 de l'archive | BLOCKED — témoin absent |
| Compatibilité | comparaison `mar-bam-fx` par série/date/devise/unité ; éviter double ingestion et double publication | NOT_RUN — pas de témoin |
| Validation | tests parser + normalisation + provenance + contrôle financier + CI exact-HEAD | NOT_RUN — contrat manquant |

**Règle d'identité/dédoublonnage à implémenter après preuve :** comparer au minimum éditeur, identifiant de série, devise de base, devise cotée, type de taux, date économique et version/révision. Une différence d'URL de transport ou de protocole ne suffit pas à définir une nouvelle série économique. Préserver l'identifiant historique `mar-bam-fx` et les 44 endpoints initiaux ; ne jamais remplacer silencieusement la source.

**Preuve GitHub technique du précédent HEAD** `f4b50408e4f06ecfb8061b074b330f6f21043b40` : [CI #43541532873](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43541532873) et [Docker/PostgreSQL #43541532983](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/43541532983), `completed/success`. Ces workflows ne prouvent ni droits d'usage ni collecte BAM réelle.

**BLOCK_REASON :** spécification FX API, licence de redistribution et témoin primaire autorisé indisponibles. **NEXT_ACTION :** obtenir ces trois preuves officielles, vérifier l'identité économique contre `mar-bam-fx`, puis implémenter le mapping et les tests dans les modules existants ; en attendant, poursuivre une tâche indépendante non revendiquée de l'issue #17. Aucun secret, S1, merge ou altération des 44 sources.
