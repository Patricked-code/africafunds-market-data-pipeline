# SadiaAF — S1 : préparation et première installation de staging isolé

**Statut : DESIGNED / NOT_DEPLOYED sur S1**. Ce document ne vaut ni ordre de basculement des domaines, ni attestation de base PostgreSQL réelle sur S1.

**Autorisation propriétaire complémentaire (7 novembre 2026)** : modification des contenus des deux vhosts SadiaAF autorisée ; suppression d'une archive autorisée **uniquement après identification univoque de l'archive SadiaAF visée** et validation d'un rollback. L'inventaire live des deux vhosts ne montre aucune archive : uniquement `index.html` Plesk et dossiers historiques. Les sauvegardes système Plesk, les archives AMF-UMOA et les archives financières raw hors de ces deux répertoires sont donc **hors périmètre de suppression**. Les gates techniques de mise en production publique restent applicables même si la modification des domaines est autorisée.

**Règle de migration** : aucun remplacement du `index.html` actuel pendant que les deux sites répondent HTTP 500 et que l'API SadiaAF n'est pas déployée. Préparer d'abord la nouvelle application en staging, assurer la récupération des fichiers vhosts, puis effectuer un cutover atomique attesté ; une page statique provisoire ne remplace pas une API fonctionnelle.

## 0. Mandat et séparation

Le code canonique vient de `Patricked-code/africafunds-market-data-pipeline`. Le runtime cible est **SadiaAF** ; AfricaFunds n'est qu'un consommateur aval. Les domaines retenus et inchangés sont `sadiaaf.wealthtechinnovations.com` et `api.sadiaaf.wealthtechinnovations.com`. Le staging ne change ni ces domaines ni le serveur MCP.

| Élément | Staging SadiaAF | Production future SadiaAF | MCP WealthTech |
|---|---|---|---|
| Projet Compose | `sadiaaf-market-data-staging` | `sadiaaf-market-data` | `wealthtech-mcp-ssh-bridge` |
| Racine release | `/opt/apps/sadiaaf-market-data-staging` | `/opt/apps/sadiaaf-market-data` | Préservée, hors périmètre |
| DB PostgreSQL Docker | volume `sadiaaf-market-data-staging_postgres_data` | volume distinct | Aucune réutilisation |
| Archive brute | `/opt/apps/sadiaaf-market-data-staging/shared/raw` | `/opt/apps/sadiaaf-market-data/shared/raw` | Aucun partage |
| Secrets | `/etc/sadiaaf-market-data-staging.env` | `/etc/sadiaaf-market-data.env` | Aucun partage |
| API local | `127.0.0.1:18991` | `127.0.0.1:8891` | `127.0.0.1:8787` observé |
| Web local | `127.0.0.1:18992` | `127.0.0.1:8892` | Aucun partage |
| Domaine public | **AUCUN** | Les deux sous-domaines existants, après recette | Inchangé |
| Collecteur | **INACTIF** par défaut | Autorisation source puis activation progressive | Inchangé |

Les **volumes et archives sont des données**, pas des artefacts de Git. Un rollback de code ne restaure pas magiquement une migration SQL ni un fichier raw.

## 1. Constats établis avant préparation

- Bridge MCP S1 : `ping` OK ; `docker ps` affiche `wealthtech_mcp_ssh_bridge` healthy, sans conteneurs SadiaAF actifs.
- `df -h` : 77 Go / 54 Go utilisés / ~20 Go disponibles ; la RAM disponible, les ports 18991/18992 et la liste des **volumes Docker arrêtés** demandent encore un préflight S1 réel.
- Deux vhosts Plesk existants, chacun en HTTP 500 ; les `index.html` lus sont des pages de domaine Plesk par défaut.
- Test réellement réussi sur un runner GitHub : build de la pile Docker Node 22/PostgreSQL 16/Nginx, migrations, seed 11 marchés/44 endpoints, API et web healthy, **7 migrations conservées après recréation des conteneurs**, collector non démarré. [CI Docker #42393046694](https://github.com/Patricked-code/africafunds-market-data-pipeline/actions/runs/42393046694).
- **Accès S1** : le connecteur MCP présent ne propose pas de fonction de provisioning staging bornée et n'autorise pas de shell général. Les commandes ci-dessous sont des commandes d'exploitant ou d'une future action gouvernée, **non exécutées** dans cette reprise.

## 2. Admission avant toute écriture

Lecture préalable, dans cet ordre :
1. `AGENTS.md`, `docs/09_CHANGELOG_WORKLOG.md`, `docs/10_DEPLOYMENT_GATES.md`.
2. `docs/S1_DEPLOYMENT_READINESS_20261107.md` et ce runbook.
3. HEAD GitHub **exact et CI SUCCESS** + attestation de la provenance de la release.
4. État des volumes Docker existants, des conteneurs arrêtés, des ports, de la mémoire libre, du CPU, des montages et de l'espace libre.
5. Compatibilité Docker Compose v2, DNS et certificats ; **aucun changement Plesk** durant le staging.
6. Confirmation qu'il s'agit de la **première installation** : le répertoire et volume de staging ne doivent pas exister. S'ils existent, STOP : analyser, sauvegarder et utiliser une voie d'upgrade distincte (non implémentée).

Le script `staging-preflight.sh --check-only` exige >=8 Gio libres et >=1 Gio de `MemAvailable`, des ports non occupés, un checkout propre au SHA attendu. **Ces seuils minimaux sont une admission pilote, pas un dimensionnement pour le backfill historique.**

## 3. Commandes d'exploitation gouvernée — première installation uniquement

Les commandes suivantes **ne doivent être exécutées que sur S1**, par un opérateur autorisé ou via une future action MCP explicitement limitée au staging. Elles ne doivent pas être lancées depuis une conversation avec un shell non attesté.

```bash
# Depuis un checkout Git privé déjà créé dans un répertoire de travail dédié,
# par exemple /opt/build/sadiaaf-market-data (ce chemin n'est PAS un vhost).
cd /opt/build/sadiaaf-market-data

# Remplacer par le SHA COMPLET certifié du main actuel, pas par un SHA approximatif.
export SADIAAF_EXPECTED_GIT_SHA='<SHA_EXACT_CERTIFIE_40_HEX>'

# PLAN SANS ECRITURE — utile avant admission.
bash deploy/s1/staging-secrets-init.sh --plan
bash deploy/s1/staging-provision.sh --plan

# VERIFICATION READ-ONLY — ne crée ni volume ni DB.
sudo env SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA" \
  bash deploy/s1/staging-preflight.sh --check-only

# Après preuve du préflight, premier provisioning des secrets dédiés.
# Aucun secret imprimé, fichier créé sans écraser un existant.
sudo env SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA" \
  SADIAAF_STAGING_SECRETS_APPROVED=YES \
  bash deploy/s1/staging-secrets-init.sh --apply

# Installation initiale UNIQUEMENT. Refuse toute base/volume/app existants.
sudo env SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA" \
  SADIAAF_STAGING_FIRST_INSTALL_APPROVED=YES \
  bash deploy/s1/staging-provision.sh --apply

# Vérification sans écriture.
sudo bash deploy/s1/staging-provision.sh --verify
```

Le token GitHub utilisé pour le checkout doit rester hors des arguments/logs et avoir une permission de lecture du dépôt uniquement. Ne pas renseigner de secrets dans les commandes ou commentaires GitHub. **Ne jamais exécuter `deploy_sadiaaf_s1(allow_write=true)` pour remplacer ce parcours.**

## 4. Comportement exact de l'installateur

`deploy/s1/staging-provision.sh` est volontairement limité au **FIRST INSTALL**. Il refuse toute exécution d'écriture sans deux preuves distinctes : `SADIAAF_EXPECTED_GIT_SHA` strictement égal au checkout propre et `SADIAAF_STAGING_FIRST_INSTALL_APPROVED=YES`.

Avant la première écriture, il impose : racine staging et volume PostgreSQL absents, absence de conteneurs associés au même projet Compose, fichier secrets dédié root:600 et non symbolique, paramètres fixes PostgreSQL (`sadiaaf_market_staging`, `sadiaaf_staging`), mot de passe aléatoire 64 hex et URL de base cohérente, `ENABLE_SCHEDULER=false`, ports 18991/18992, preflight S1 PASS.

L'application est copiée dans une nouvelle release immuable ; `COMPOSE_PROJECT_NAME` fixe conserve le volume `postgres_data` et `SADIAAF_RAW_HOST_DIR` conserve les fichiers bruts dans `shared/raw`. Démarrage ordonné : PostgreSQL → migration → seed → API+web → vérification HTTP. **Le collecteur n'est pas démarré**. Le pointeur `current` n'est publié qu'après une recette locale réussie.

**Aucun** script n'écrit dans `/var/www/vhosts`, n'exécute `plesk`, ne redémarre le bridge MCP, n'arrête un autre projet Compose ni ne supprime de volume.

## 5. Contrôles de recette et preuve à archiver

- Commit SHA complet, résultat CI/main, résultat `staging-preflight.sh` horodaté, état Docker/Compose et ports.
- Projet Compose `sadiaaf-market-data-staging`, conteneurs nommés exclusivement sous ce projet, volume Docker `sadiaaf-market-data-staging_postgres_data`.
- Contrôle `GET http://127.0.0.1:18991/health` : HTTP 200 **avec** `database=up`, pas un simple fichier nginx.
- Contrôle `GET http://127.0.0.1:18992/health` : HTTP 200.
- Nombre des migrations `public.schema_migrations`, sources `source.source_endpoints`, absence du collector actif.
- Vérification de persistance après **recréation contrôlée** des conteneurs, sans `down -v`, sous fenêtre de maintenance staging et après snapshot.
- Sauvegarde `pg_dump` cohérente + archive raw SHA-256 et **restauration réellement testée dans une base isolée**, puis un plan de rétention et sauvegarde **hors serveur** avant le moindre backfill volumineux.
- Première ingestion autorisée : preuve institution → URL → fichier → SHA-256 → date → valeur brute → contrôle → transformation → base. **44 endpoints enregistrés ne signifient pas 44 collectes ni droits validés.**

## 6. Échec, rollback, récupération

Si le provisioning initial échoue, le script **ne supprime rien automatiquement**, afin d'éviter la perte d'une base partiellement initialisée. Il conserve la racine staging, le volume, les logs et les éventuels raw pour analyse. Il ne faut pas relancer aveuglément `--apply`, qui refusera à raison les artefacts existants.

Commande de suspension limitée au staging, après vérification du projet et du fichier secrets :

```bash
# Ne stoppe QUE les services du projet staging SadiaAF, sans supprimer le volume.
sudo docker compose \
  -p sadiaaf-market-data-staging \
  --env-file /etc/sadiaaf-market-data-staging.env \
  -f /opt/apps/sadiaaf-market-data-staging/current/docker-compose.yml \
  stop api web
```

La commande ci-dessus n'est utilisable qu'après création du pointeur `current`. En cas d'installation partielle avant publication de `current`, identifier la release exacte et obtenir un plan de récupération gouverné ; ne pas deviner le chemin. **Aucune suppression globale** (`docker system prune`, `docker compose down -v`, purge des vhosts, `git reset --hard`) n'est admissible.

## 7. Limites actuelles et NEXT_ACTION

- **DONE** : code d'installation staging et tests sur branche GitHub ; statut final conditionné par CI/PR/merge de cette branche.
- **BLOCKED** : S1 ne fournit pas encore de fonction MCP dédiée `sadiaaf_staging_preflight_s1`, `sadiaaf_staging_provision_s1` et `sadiaaf_staging_verify_s1` attestées. Le présent outil MCP ne permet donc **aucune exécution réelle** de ces scripts S1 dans ChatGPT.
- **NEEDS_REVIEW** : RAM/ports/volumes arrêtés, stockage, politiques de backup/restauration, autorisation source, sécurité API/RBAC/tenant. Un script de first-install ne suffit pas à lever les gates de publication.

**NEXT_ACTION** : CI verte, PR intégrée après revue, puis exposition d'une action serveur bornée qui n'exécute que ces scripts au SHA certifié, sans shell général et sans toucher au MCP. Ensuite : vrais préflight et provisioning S1 avec preuves, puis sauvegarde/restauration et collecte pilote légale avant public cutover.
