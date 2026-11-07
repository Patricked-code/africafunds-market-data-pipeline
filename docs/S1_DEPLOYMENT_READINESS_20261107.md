# SadiaAF — S1 : audit d'hébergement et voie de déploiement non destructive

## Vérification complémentaire — runtime Docker complet et scheduler opt-in (2026-11-07)

**Cible inchangée** : domaines `sadiaaf.wealthtechinnovations.com`, `api.sadiaaf.wealthtechinnovations.com` ; aucun conteneur MCP, volume MCP, vhost Plesk ou base existante ne doit être modifié.

### Défaut P0 dans la configuration existante

`src/config/env.ts` utilisait `ENABLE_SCHEDULER: z.coerce.boolean().default(true)`. La coercition JavaScript transforme la chaîne `"false"` en `true` : le template `.env.production.example` indiquait `ENABLE_SCHEDULER=false`, sans garantir que le scheduler resterait arrêté si le conteneur était démarré.

**Correction additive sur branche** : `src/config/schedulerEnabled.ts` implémente la conversion stricte : `true/1/yes/on` explicites activent, `false/0/no/off` désactivent, absence de valeur désactive, valeurs non reconnues déclenchent une erreur. Tests `test/scheduler-enabled-env.test.ts` couvrent les cas normaux et la protection contre la collecte involontaire. **Ne pas confondre sécurité du switch avec licence des sources**, qui exige une validation indépendante.

### Recette du vrai runtime Docker en CI éphémère

La branche `feat/sadiaaf-isolated-compose-runtime-smoke-20261107` ajoute le workflow `.github/workflows/staging-runtime-smoke.yml`, limité aux runners GitHub hébergés (`ubuntu-latest`), jamais à S1. Identité Compose unique `sadiaaf-smoke-<run_id>`, identifiants PostgreSQL temporaires et données CI non financières.

Contrôles attendus : construction des images Node 22 indépendantes du MCP, démarrage de PostgreSQL 16, migrations et seed dans la base CI, lancement API+Nginx sur 127.0.0.1:18991/18992, `/health` et `/api/v1/status` valides, absence de conteneur collector automatique, recréation complète des conteneurs **sans supprimer le volume** et maintien du nombre de migrations dans la même base. Nettoyage final **du seul projet éphémère GitHub**, sans action serveur.

Le workflow ajoute une preuve que le modèle Docker peut réellement démarrer et conserver ses données entre deux cycles de conteneurs, au-delà du simple `docker compose config`. **Il n'atteste toujours ni les ressources S1, ni la création de PostgreSQL sur S1, ni les collectes réelles, ni les sauvegardes et restaurations de production.**

### Garde de validation

Statut tant que la CI n'est pas achevée : **PARTIAL**. En cas de défaut dans le Dockerfile/Compose, corriger dans le dépôt initial avec tests et nouvelle CI. Aucun `deploy_sadiaaf_s1(allow_write=true)` tant que les précontrôles S1 et les gates de production ne sont pas attestés.

Prochaine étape après CI : faire exposer un exécuteur **borné** de staging PostgreSQL sur S1, distinct de l'ancien déploiement public, puis vérifier mémoire, ports, volumes, backup/restore et santé de l'API avant collecte pilote autorisée.

---


## Audit complémentaire de prérequis S1 — contrôle du 7 novembre 2026

**Décision propriétaire confirmée : conserver sans changement** les deux domaines historiques `sadiaaf.wealthtechinnovations.com` et `api.sadiaaf.wealthtechinnovations.com`. L'installation du pipeline ne doit ni créer un domaine alternatif ni écraser le contenu du vhost.

### Contrôles réellement répétés sur S1, sans écriture

| Vérification | Preuve live | Statut |
|---|---|---|
| MCP SSH Bridge | `ping` = `wealthtech_ssh_bridge_ok` ; `docker ps` bridge healthy au second sondage | DONE (connexion) |
| Frontend HTTPS | `curl -I https://sadiaaf.wealthtechinnovations.com` = HTTP 500 | BLOCKED |
| API HTTPS | `curl -I https://api.sadiaaf.wealthtechinnovations.com` = HTTP 500 | BLOCKED |
| Dossiers SadiaAF/Plesk | Deux vhosts présents, `index.html` anciens et fichiers historiques à conserver | DONE (existence) |
| Dépôt Git sur vhosts | `sadiaaf_git_status_s1` : aucun `.git` à la racine, aucun dépôt imbriqué à profondeur 2 | NOT_STARTED pour checkout |
| Docker runtime SadiaAF | Seul `wealthtech_mcp_ssh_bridge` dans `docker ps` ; aucun postgres/collector/api SadiaAF **actif** | NOT_STARTED (runtime observé) |
| PM2 SadiaAF | Aucun service SadiaAF dans `pm2 list` observé | NOT_STARTED (runtime observé) |
| Stockage | `df -h` : 77 Go, 54 Go utilisés, environ 20 Go libres | NEEDS_REVIEW (rétention/backups) |
| Sauvegardes | Fichiers Plesk/MySQL et archives diverses ; **aucun backup PostgreSQL SadiaAF restaurable attesté** | BLOCKED |
| Docker Compose v2, ports, mémoire disponible, certificats Plesk | Non attestés par outils read-only exposés | NEEDS_REVIEW |
| Audit avancé | `sadiaaf_status_s1` / `inspect_sadiaaf_s1` refusent `echo` via garde read-only du bridge | BLOCKED par outillage |
| Précontrôle de déploiement | `deploy_sadiaaf_s1(allow_write=false)` retourne `Écriture refusée` ; **aucun dry-run autorisé sur S1** | BLOCKED par outillage |

**Limite essentielle :** `docker ps` n'énumère que les conteneurs en cours ; il ne prouve pas l'absence de volumes Docker arrêtés, ni d'un PostgreSQL installé en dehors de Docker. Les sondes de domaine indiquent un dysfonctionnement HTTP, sans établir sa cause.

### Nouvelle préparation GitHub en lecture seule (sans modification S1)

La branche de sécurité complémentaire `fix/sadiaaf-s1-staging-preflight-docker-context-20261107` apporte :

- un `.dockerignore` absent jusque-là : exclut `.env`, secrets privés, référentiels Git, données brutes et sauvegardes du contexte `Dockerfile` ; **conserve** SQL, source TypeScript, configurations, tests et documentation requis par le build ;
- `deploy/s1/staging-preflight.sh --check-only` : contrôle uniquement, par commande déterministe, le SHA Git fourni (`SADIAAF_EXPECTED_GIT_SHA`), l'état propre du dépôt, Docker et Compose, les ressources mémoire/disque, les ports staging loopback 18991/18992, les domaines historiques et les prérequis. **Aucune mutation** des vhosts, bases, conteneurs ou proxy ;
- CI renforcée : contrôle `bash -n`, tests Node des invariants de sécurité et vérification du modèle Docker Compose (volume PostgreSQL non exposé, API/web localhost, collecteur opt-in sans démarrage).

**Ces vérifications sont préparées dans GitHub : elles n'ont pas encore été exécutées sur S1**. La future exécution du script exige un checkout exact du dépôt dans un emplacement distinct des anciens vhosts et une voie d'exécution en lecture seule autorisée par le connecteur.

### Ordre d'admission vers la suite

1. Qualifier en CI la branche complémentaire et l'intégrer sur `main` après contrôle du SHA exact.
2. Remédier à l'absence de l'outil `S1 staging preflight` autorisé et corriger le garde read-only du bridge **sans** ouvrir un shell général incontrôlé.
3. Exécuter le vrai précontrôle S1 et attester `docker compose version`, `docker info`, ports, mémoire, espace et identité du checkout Git.
4. Après attestation CPU/RAM/disque, volumes existants, backups et absence de collisions, habiliter un **provisioning de staging isolé**, avec validation et reprise, sans proxy Plesk.
5. Créer PostgreSQL staging, appliquer migrations/seeds, API loopback, vérifier la persistance lors d'une seconde release et tester la restauration.
6. Qualifier la première source autorisée pour lancer une collecte réelle datée et son archive brute. **Aucun droit source présumé**.

**Statut aujourd'hui : PARTIAL** pour la préparation du dépôt, **BLOCKED** pour le déploiement S1. Les domaines retenus restent inchangés.

---

Date de constat : 2026-11-07. **Périmètre : lots 11 (CI), 12 (staging) et 13 (production S1) du plan existant.**
Statut global : **PARTIAL / NEEDS_REVIEW**. Ce document ne constitue **pas** une attestation de déploiement.

## 1. Objectif confirmé

Faire tourner la plateforme **SadiaAF**, distincte de l'application AfricaFunds, directement sur le serveur S1 : code canonique issu de `Patricked-code/africafunds-market-data-pipeline`, base PostgreSQL interne, archive brute persistante, API, supervision et collecteur planifié par le serveur. Aucune dépendance à une session ChatGPT pour la collecte une fois l'exécution effectivement déployée.

## 2. État observé via le connecteur MCP SSH Bridge (lecture seule)

- S1 : `docker ps` montre **uniquement** `wealthtech_mcp_ssh_bridge` ; ni `postgres`, ni `collector`, ni `api` SadiaAF ne figurent parmi les conteneurs actifs. Cela ne certifie pas l'absence de tout serveur PostgreSQL installé autrement.
- Les racines `/var/www/vhosts/wealthtechinnovations.com/sadiaaf.wealthtechinnovations.com` et `.../api.sadiaaf.wealthtechinnovations.com` existent ; chacune contient un fichier `index.html` historique et d'autres entrées. Aucun dépôt Git racine ou imbriqué (profondeur 2) n'a été trouvé par `sadiaaf_git_status_s1`. **Ne pas supprimer ni remplacer ces contenus.**
- Tests `curl -I` exécutés depuis S1 : `https://sadiaaf.wealthtechinnovations.com` et `https://api.sadiaaf.wealthtechinnovations.com` ont tous deux répondu **HTTP 500** au contrôle ; cela n'atteste ni le contenu ni l'étiologie de l'erreur.
- `df -h` sur S1 : volume racine 77 Go, environ 54 Go utilisés et 20 Go disponibles (74 %). Insuffisant pour promettre une profondeur historique sans budget de stockage, rétention, sauvegardes et projections de volumétrie.
- `pm2 list` : pas d'application SadiaAF recensée dans la liste PM2 observée ; le serveur comporte d'autres services à préserver.
- `inspect_sadiaaf_s1` et `sadiaaf_status_s1` renvoient actuellement un refus du garde read-only du bridge sur la commande `echo`. **Leur absence de résultat ne vaut pas absence d'installation.**
- `list_backups_s1` inventorie des archives hétérogènes ; **aucune restauration attestée de SadiaAF PostgreSQL/raw** n'en découle.
- Connexion SSH autorisée = lecture/contrôle via fonctions exposées ; **pas** de shell SSH arbitraire, pas de création PostgreSQL autorisée par cette seule inspection.

## 3. Pipeline conservé

```text
GitHub main validé (SHA exact) → release immuable S1
  → Docker Compose : PostgreSQL 16 (volume durable à nom stable)
  → migrations versionnées + registre source
  → API lecture seule sur 127.0.0.1:8891
  → supervision sur 127.0.0.1:8892
  → [uniquement après droit source et recette] collector / scheduler
  → archive brute persistante SHA-256 → source.raw_artifacts / market.raw_records
  → qualité / normalisation / calcul / publication uniquement après validation
  → proxy Plesk des deux domaines, seulement après gates de production
```

**Périmètres séparés :** les versions de code, le volume PostgreSQL et les archives brutes sont trois patrimoines différents. Ne jamais interpréter un merge Git comme création de base ou reprise de données.

## 4. Écarts critiques révélés dans les scripts existants

1. Le `deploy/s1/deploy.sh` initial supprimait le contenu des deux vhosts au moyen de `find ... rm -rf` ; son `rollback.sh` comportait le même risque. La branche de correction retire la suppression et laisse les vhosts intacts.
2. Chaque release dans un dossier horodaté risquait d'entraîner un **nouveau projet Docker Compose**, donc un autre volume `postgres_data`. La branche définit un `COMPOSE_PROJECT_NAME` constant dans deploy et rollback : la base reste identifiée indépendamment de la version du code.
3. Le déploiement initial lançait `collector` immédiatement alors que les droits de 44 sources et les adaptateurs historiques ne sont pas qualifiés. Le collecteur passe sous profil Docker opt-in `collection` et n'est plus démarré par défaut ; le template de production contient `ENABLE_SCHEDULER=false`.
4. L'ancien script configurait immédiatement les proxies Plesk. Désormais il refuse toute exécution sans **deux attestations explicites** `SADIAAF_PRODUCTION_CUTOVER_APPROVED=YES` et `SADIAAF_PRODUCTION_GATES_ATTESTED=YES`. **Ces variables ne doivent pas être activées avant la recette et l'autorisation du propriétaire.**
5. La sauvegarde des deux vhosts est conservée et vérifiée avec `tar -tzf` et SHA-256 avant cutover. L'ancien contenu n'est pas supprimé. Le rollback restaure les configurations de proxy et préserve les fichiers ; restauration du contenu sur demande explicite uniquement.
6. **Limite persistante** : pas encore de snapshot/restauration PostgreSQL et raw validés avant migration `006_raw_records_nullsafe.sql` sur base réelle ; pas d'inventaire complet des DB/ports/certificats S1, ni tests de sécurité API/cockpit. Le script reste donc **inexécutable en production par politique**.

## 5. Étapes réelles à franchir, sans écraser l'existant

- **S0 — preuve code :** CI GitHub sur HEAD exact de la branche de sécurité, tests `test/s1-deployment-safety.test.mjs` et `bash -n` sur les scripts ; PR et revue. Un test de script ne remplace pas un déploiement.
- **S1 — inventaire infra et dry-run :** certifier ports, mémoire, espace/dimensionnement, Docker Compose, Plesk, DNS/TLS, contenus et paramètres des vhosts. Ne jamais afficher de secrets.
- **S2 — staging isolé :** release dans `/opt/apps/sadiaaf-market-data`, secret hors Git, `COMPOSE_PROJECT_NAME` stable, PostgreSQL et volume persistants, migration/seed dans **une base neuve et non production**, API accessible seulement en loopback ; `collector` non démarré. Exiger preuve de sauvegarde et restauration, monitoring des logs, absence de collision.
- **S3 — pilote de collecte autorisée :** qualifier explicitement les droits, robots, protocole et série de **chaque** source avant autorisation ; sélectionner un adaptateur validé et une petite plage. Vérifier HTTP, archive brute SHA-256, inserts PG, non-duplication, date économique/publication, échec et reprise ; ne pas déclarer `HISTORY_COMPLETE` sans preuves.
- **S4 — exploitation permanente :** service collector isolé sous profil `collection`, planification unique, restart policy, alerting, limite de débit, retries, stockage/archives/retention, backup/restore de PostgreSQL + raw ; supervision des tâches et incidents.
- **S5 — basculement public :** API authentifiée et RBAC, staging approuvé, scan sécurité, contrôle de données et licence, sauvegarde/restauration éprouvées, gate `docs/10_DEPLOYMENT_GATES.md` signé, puis proxy Plesk sous changement gouverné. Ancien vhost conservé ; rollback proxy et application versionnés.

## 6. Critères de recette vérifiables

| ID | Critère | Attestation aujourd'hui |
|---|---|---|
| S1-01 | Base PostgreSQL SadiaAF avec nom de projet stable + données persistantes après nouvelle release | NOT_STARTED sur S1 |
| S1-02 | Registre/migrations rejouables sur DB staging vierge | CI GitHub : DONE ; S1 : NOT_STARTED |
| S1-03 | Archives raw avec volume et sauvegardes restaurables | NOT_STARTED sur S1 |
| S1-04 | API `/health` 200 et vérification DB locale | NOT_STARTED sur S1 |
| S1-05 | Collecteur en service seulement pour sources explicitement autorisées | DESIGNED ; inactive par défaut |
| S1-06 | Une observation réelle tracée source→raw→base→qualité | BLOCKED par qualification |
| S1-07 | Aucun ancien vhost, domaine ou donnée écrasé | Tests de code à confirmer en CI ; non vérifié en runtime |
| S1-08 | Rollback release, DB, raw et proxy effectivement testé | PARTIAL (code proxy), restaurations DB/raw non testées |
| S1-09 | Production S1 et cockpit sécurisé | BLOCKED par `docs/10_DEPLOYMENT_GATES.md` |

## 7. Chemin de travail et rollback

Le correctif est développé dans `fix/sadiaaf-s1-stable-db-safe-rollout-20261107`. Il ne modifie directement ni `main`, ni les domaines, ni PostgreSQL sur S1. Retour arrière : `git revert` ciblé sur les commits de cette PR après contrôle CI. Ne jamais recourir à `git reset --hard` ou à la suppression d'un volume PostgreSQL pour effectuer un rollback.

**NEXT_ACTION** : valider la PR de sécurité et les tests, fournir un exécuteur gouverné de staging S1 avec accès borné à la création de base/volumes (distinct des domaines publics), puis collecter une source légalement autorisée sur un lot témoin. Aucune exécution directe de l'ancien `deploy_sadiaaf_s1` n'est admissible tant que les gates S1 ne sont pas attestés.
