# Statut du projet

## Créé dans cette version

- dépôt TypeScript/Node.js autonome ;
- PostgreSQL et six migrations ;
- Dockerfile et Docker Compose ;
- scheduler intégré et exemple de crontab système ;
- registre de 11 marchés, 44 endpoints et institutions officielles ;
- ingestion brute HTML/CSV/Excel et découverte des documents ;
- archive immuable SHA-256 ;
- suivi des exécutions, santé des sources et rattrapage historique ;
- fonctions de calcul des indices, rendement réel, change et obligations ;
- documentation atomique et opérationnelle ;
- sept tests unitaires exécutés avec succès sur les modules de calcul et parsing indépendants.

## Validation dans l’environnement de génération

- JSON du registre : valide ;
- transpilation syntaxique de tous les fichiers TypeScript : valide ;
- tests des fonctions autonomes : 7/7 réussis ;
- installation npm complète : non exécutée, car le registre npm interne de l’environnement ne fournit pas `@types/node` ; les versions déclarées existent sur le registre npm public standard ;
- migrations PostgreSQL : non exécutées localement, car Docker/PostgreSQL ne sont pas disponibles dans l’environnement de génération ;
- déploiement serveur : non réalisé, le connecteur WealthTech a renvoyé une erreur HTTP 502 et ne propose pas d’action de création pour un nouveau projet autonome.
