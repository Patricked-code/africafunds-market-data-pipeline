# 06 — État réel et écarts

Dernière mise à jour : 2026-07-31.

## Statuts autorisés

- `DONE` : code, tests, documentation et contrôle réel terminés.
- `PARTIAL` : socle présent, couverture incomplète.
- `DESIGNED` : spécifié mais non implémenté.
- `BLOCKED` : dépendance ou accès manquant.
- `NOT_STARTED` : non commencé.

## État actuel

| Domaine | Statut | Preuve / limite |
|---|---|---|
| Dépôt GitHub | DONE | Dépôt privé accessible, branche `main` existante |
| Registre des marchés/sources | PARTIAL | 11 marchés et endpoints initiaux ; audit source par source restant |
| Collecteur HTTP générique | PARTIAL | Téléchargement, retries et découverte ; adaptateurs spécifiques incomplets |
| Archive brute SHA-256 | PARTIAL | Socle présent ; stockage objet/retention production à définir |
| Parseurs HTML/CSV/Excel | PARTIAL | Génériques présents ; PDF et formats dynamiques incomplets |
| PostgreSQL et migrations | PARTIAL | DDL présent ; validation réelle complète à faire |
| Backfill et scheduler | PARTIAL | Mécanisme présent ; historiques non exécutés/contrôlés intégralement |
| API de lecture | PARTIAL | Endpoints de supervision ; API métier complète absente |
| Dashboard | PARTIAL | Supervision en lecture seule ; pas de Super Admin |
| Authentification/RBAC/MFA | NOT_STARTED | À construire |
| Modèle canonique exécutable | DESIGNED | Dictionnaire partiel, pas de registre complet de champs |
| Interopérabilité multi-bases | DESIGNED | Schéma et mappings à implémenter |
| Adaptateurs Égypte | BLOCKED/PARTIAL | APIs dynamiques CBE/EGX à finaliser |
| Adaptateurs Tunisie | BLOCKED/PARTIAL | GOSDMX/SDMX à finaliser |
| Adaptateurs Kenya | PARTIAL | CBK/NSE/PDMO à auditer et tester |
| PDF UMOA-Titres/BEAC | NOT_STARTED/PARTIAL | Normalisation détaillée manquante |
| Courbes de taux | DESIGNED/PARTIAL | Tables/fonctions de base ; moteur complet non validé |
| Classification CT/MT/LT | DESIGNED/PARTIAL | Règles définies ; moteur quotidien complet à tester |
| Total Return obligataire | DESIGNED/PARTIAL | Fonctions de base ; moteur industriel incomplet |
| Indices catégories de fonds | DESIGNED | Non finalisés |
| Benchmarks plateforme | DESIGNED | Méthodologies/pondérations finales à valider |
| PostHog | NOT_STARTED | Projet accessible mais aucun événement AfricaFunds confirmé |
| CI et tests complets | PARTIAL | Tests limités ; PostgreSQL, sécurité, charge et restauration à ajouter |
| Staging | NOT_STARTED | À créer |
| Production S1 | BLOCKED/VOLONTAIRE | Ne pas déployer avant validation des gates |
| Bridge S1 | BLOCKED | Connecteur indisponible dans la conversation au 2026-07-31 |

## Risques principaux

- déclarer un historique complet alors que des pages dynamiques restent inconnues ;
- confondre taux, prix, rendement et niveau d’indice ;
- compter plusieurs classes d’un même portefeuille ;
- utiliser des données futures dans une reconstruction historique ;
- publier une vue EUR/USD avec un FX obsolète ;
- synchroniser vers une base externe avec un mapping non validé ;
- déployer avant la sécurité, les tests et le rollback.

## Prochaine tâche recommandée

Commencer Phase 1 et Phase 2 sur une branche fonctionnelle : identité/RBAC/audit, modèle canonique, tables d’intégration et contrats de données. Aucun déploiement production.
