# 10 — Critères obligatoires avant production S1

**Gate d'autorisation préalable :** aucun premier déploiement sur S1 n'est autorisé tant que les sections **Cadrage, Sécurité, Données, Calculs financiers, API et cockpit, Tests et observabilité, Staging et S1** ne sont pas explicitement validées avec preuves et approbation humaine. Les vérifications de la section **Après déploiement** ne sont pas des prérequis au premier déploiement : elles sont obligatoires **après son exécution** et **avant de déclarer le déploiement réussi ou la mise en production achevée**. Toute vérification post-déploiement échouée ou non exécutée interdit la déclaration de succès et impose le traitement de l'incident ou le rollback prévu. Cette séparation ne dispense d'aucun gate préalable et n'autorise aucun déploiement automatique.

## Cadrage

- [ ] Vision et périmètre approuvés
- [ ] Rôles et permissions approuvés
- [ ] Modèle canonique validé
- [ ] Méthodologies financières versionnées et approuvées
- [ ] Contrats d’intégration définis

## Sécurité

- [ ] Authentification active
- [ ] `SUPER_ADMIN` créé par secret à usage unique
- [ ] MFA disponible
- [ ] RBAC et scopes testés
- [ ] Secrets hors Git et chiffrés
- [ ] Audit des actions sensible actif
- [ ] Scan de secrets réussi
- [ ] Revue des dépendances et vulnérabilités

## Données

- [ ] Migrations testées sur base vierge
- [ ] Migrations testées sur base existante
- [ ] Seeds idempotents
- [ ] Provenance et révisions testées
- [ ] Mapping externe validé en dry-run
- [ ] Politique de rétention et sauvegarde définie
- [ ] Contrôles de qualité et quarantaine actifs

## Calculs financiers

- [ ] Jeux de tests de référence approuvés
- [ ] Conversion locale/EUR/USD contrôlée
- [ ] Calculs de catégories contrôlés
- [ ] Courbes contrôlées sur dates réelles
- [ ] CT/MT/LT contrôlés sur maturité résiduelle
- [ ] Total Return contrôlé avec coupons et intérêts courus
- [ ] Absence de look-ahead testée
- [ ] Méthodologie et run liés à chaque résultat

## API et cockpit

- [ ] OpenAPI publié
- [ ] Authentification et quotas testés
- [ ] Permissions du cockpit testées
- [ ] Actions destructives protégées
- [ ] Exports et webhooks testés
- [ ] Journal d’audit consultable

## Tests et observabilité

- [ ] Typecheck et lint réussis
- [ ] Tests unitaires réussis
- [ ] Tests d’intégration PostgreSQL réussis
- [ ] Tests end-to-end réussis
- [ ] Tests de charge acceptables
- [ ] Logs, métriques, traces et alertes opérationnels
- [ ] PostHog configuré sans données sensibles

## Staging

- [ ] Environnement isolé déployé
- [ ] Collecte réelle limitée réussie
- [ ] Backfill pilote réussi
- [ ] Synchronisation entrante/sortante pilote réussie
- [ ] Sauvegarde et restauration testées
- [ ] Rollback testé
- [ ] Rapport de recette approuvé

## S1

- [ ] Bridge ou accès contrôlé opérationnel
- [ ] Inventaire vhosts, ports, volumes et bases terminé
- [ ] Sauvegarde complète datée et vérifiée
- [ ] Certificats et proxy validés
- [ ] Ressources CPU/RAM/disque suffisantes
- [ ] Plan de retour arrière documenté
- [ ] Fenêtre de changement approuvée
- [ ] Validation humaine explicite de mise en production

## Après déploiement

- [ ] `/health` API et web en 200
- [ ] Migrations et seeds confirmés
- [ ] Premier login Super Admin réussi
- [ ] Collecte pilote réussie
- [ ] Calcul pilote reproduit
- [ ] Cron/scheduler confirmé
- [ ] Alertes confirmées
- [ ] Sauvegarde post-déploiement créée
- [ ] Rapport de déploiement ajouté au dépôt
