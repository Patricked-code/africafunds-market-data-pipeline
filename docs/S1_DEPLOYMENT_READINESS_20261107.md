# SadiaAF — S1 : audit d'hébergement et voie de déploiement non destructive
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
