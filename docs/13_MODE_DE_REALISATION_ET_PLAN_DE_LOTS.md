# 13 — Mode de réalisation et plan de lots

## Rattachement transversal — MISSION 13

MISSION 13 (SADIAAF-CONTINUITY-20261124-01) désigne l'achèvement intégral de **ces mêmes 14 lots 0–13**, non un lot 14 ni un second programme. Le lot 11 / issue #9 porte le chantier prioritaire d'exécution autonome du développement selon docs/15 (ADR-010/012 et PR1/4/37–42), au service de tous les lots. Les six chantiers issues #5 et #13–17 demeurent transversaux ; leurs exigences restent dans docs/14. Les recettes financières respectent notamment ADR-007/008, FR-025, sans déclarer de lot DONE par simple fusion ou CI. L'autonomie d'exploitation (lots 4,10,12–13) reste distincte et soumise à docs/10. Voir [filiation historique](https://github.com/Patricked-code/africafunds-market-data-pipeline/issues/9#issuecomment-7123410131) et état LIVE docs/06/09. Aucun changement de découpage ni de critères de lot.


**But :** transformer le socle actuel en plateforme validée, testée et déployable sans régression.

---

## 1. Méthode générale

Le projet est réalisé par lots verticaux, chacun comprenant :

1. cadrage et critères d’acceptation ;
2. modèle de données et migrations ;
3. code ;
4. tests ;
5. documentation ;
6. données témoins ;
7. contrôle de non-régression ;
8. mise à jour du statut et du worklog ;
9. PR revue ;
10. fusion uniquement après validation.

Statuts autorisés : `DONE`, `PARTIAL`, `DESIGNED`, `BLOCKED`, `NOT_STARTED`.

---

## 2. Workflow Git et IA

```text
Lire AGENTS.md et docs maîtres
→ vérifier main, PR et CI
→ créer branche dédiée
→ écrire tests/ADR avant changement majeur
→ développer par petits commits
→ exécuter contrôles
→ mettre à jour statut/roadmap/worklog
→ ouvrir PR brouillon
→ revue humaine/IA
→ fusion
```

Aucune modification directe de `main`. Aucun déploiement automatique depuis une branche non validée.

---

## 3. Lot 0 — Consolidation documentaire

### Objectifs

- intégrer le présent cahier ;
- synchroniser README et index ;
- ajouter modèles de PR, issues et ADR ;
- documenter les sources méthodologiques ;
- définir le propriétaire de chaque décision.

### Livrables

- cahier maître ;
- architecture ;
- plan de lots ;
- matrice exigences/recette ;
- modèles de contribution.

### Gate

Toute IA peut expliquer le produit, l’état, les risques et la prochaine étape sans utiliser l’historique de conversation.

---

## 4. Lot 1 — Sécurité, identité et bootstrap

### Travaux

- schémas `identity` et `audit` ;
- utilisateurs, rôles, permissions et organisations ;
- OAuth2/OIDC ;
- MFA ;
- création du premier `SUPER_ADMIN` ;
- secret à usage unique ;
- gestion des clés API ;
- audit immuable ;
- protections du cockpit.

### Tests

- bootstrap base vierge ;
- login, MFA et expiration ;
- refus d’accès par rôle ;
- rotation/révocation de clé ;
- audit d’une action sensible ;
- absence de secret en Git et logs.

### Définition de terminé

Aucune route administrative n’est accessible sans contrôle d’identité et de permission.

---

## 5. Lot 2 — Modèle canonique exécutable

### Travaux

- dictionnaire des objets et champs ;
- types, unités, devises, cardinalités ;
- validations ;
- historique et sensibilité ;
- génération de documentation ;
- identifiants stables ;
- conventions de nommage ;
- seeds idempotents.

### Livrables

- tables `canonical_objects` et `canonical_fields` ;
- catalogue consultable dans le cockpit ;
- export machine-readable ;
- tests de validation.

---

## 6. Lot 3 — Interopérabilité

### Travaux

- registre des systèmes externes ;
- connexions chiffrées ;
- snapshots de schéma ;
- détection de drift ;
- mappings de champs et de valeurs ;
- transformations ;
- crosswalks ;
- contrats entrants/sortants ;
- dry-run ;
- syncs ;
- conflits et dead-letter.

### Pilotes

1. import CSV/Excel ;
2. lecture PostgreSQL ;
3. export REST ou PostgreSQL vers un site consommateur ;
4. détection d’un changement de colonne ;
5. reprise d’une synchronisation partielle.

---

## 7. Lot 4 — Adaptateurs officiels prioritaires

### Égypte

- CBE CONIA et historique ;
- T-Bills et T-Bonds ;
- EGX indices et historiques ;
- pages/API dynamiques ;
- tests par période.

### Tunisie

- BCT GOSDMX/SDMX ;
- TMM/interbancaire ;
- Trésor BTCT/BTA/BTZc ;
- CMF courbes ;
- tests de formats historiques.

### Kenya

- CBK KESONIA et taux ;
- PDMO T-Bills/Bonds ;
- NSE indices ;
- tests de profondeur historique.

### UEMOA/CEMAC

- BCEAO ;
- UMOA-Titres ;
- BRVM ;
- BEAC ;
- BVMAC ;
- parsing PDF et tableaux.

### Gate

Chaque adaptateur doit fournir une matrice de couverture : source, série, première date, dernière date, fréquence, trous, révisions et qualité.

---

## 8. Lot 5 — Moteur de courbes

### Travaux

- normalisation des tenors ;
- points observés ;
- bootstrap zéro-coupon ;
- interpolation ;
- sélection automatique selon qualité ;
- versions méthodologiques ;
- stockage des points observés et interpolés ;
- score de courbe ;
- recalcul historique sans anticipation.

### Tests

- courbe complète ;
- courbe sparse ;
- point aberrant ;
- jour sans donnée ;
- révision d’un taux ;
- comparaison avec une courbe officielle.

---

## 9. Lot 6 — Moteur obligataire

### Travaux

- calendriers ;
- cashflows ;
- intérêts courus ;
- prix propre/sale ;
- valorisation observée et modèle ;
- duration, convexité, DV01 ;
- maturité résiduelle ;
- buckets ;
- rendement Total Return ;
- pondération ;
- indices Agrégé/CT/MT/LT ;
- conversion EUR/USD.

### Jeux de référence

- obligation zéro coupon ;
- obligation fixe annuelle ;
- obligation semestrielle ;
- amortissable ;
- remboursement ;
- coupon le jour du calcul ;
- titre changeant de bucket ;
- prix manquant avec modèle ;
- proxy maturité constante.

---

## 10. Lot 7 — Fonds, catégories et benchmarks

### Travaux

- portefeuilles et classes ;
- appartenances historiques ;
- VL ajustées ;
- distributions et splits ;
- sélection quotidienne ;
- exclusions ;
- indice de catégorie ;
- indice réel ;
- composite officiel ;
- benchmark plateforme ;
- hiérarchies Afrique/région/pays ;
- conversions.

### Décisions à valider

- moyenne équipondérée ou pondérations alternatives ;
- seuils de couverture ;
- traitement des VL non quotidiennes ;
- règles de stale data ;
- pondérations du benchmark plateforme ;
- fréquence de rebalancement.

---

## 11. Lot 8 — Cockpit Super Administrateur

Écrans :

- authentification et profil ;
- utilisateurs et rôles ;
- organisations et clients API ;
- marchés, sources et adaptateurs ;
- runs, files et backfills ;
- anomalies et quarantaine ;
- mappings et drift ;
- syncs et conflits ;
- méthodologies ;
- indices et publications ;
- sauvegardes ;
- audit ;
- observabilité.

Chaque action doit indiquer : effet, périmètre, risque, confirmation, résultat et rollback possible.

---

## 12. Lot 9 — API, exports et webhooks

### Travaux

- OpenAPI ;
- pagination et filtres ;
- scopes ;
- quotas ;
- cache ;
- exports ;
- webhooks signés ;
- contrats par consommateur ;
- SDK ou exemples ;
- versionnement et politique de dépréciation.

### Tests

- permissions ;
- pagination stable ;
- performances ;
- retry webhook ;
- signature ;
- compatibilité ancienne version.

---

## 13. Lot 10 — PostHog et observabilité

### PostHog

- instrumentation frontend et API ;
- événements métier ;
- groupes ;
- feature flags ;
- dashboards d’adoption ;
- exclusion des données sensibles.

### Technique

- logs JSON ;
- OpenTelemetry ;
- métriques ;
- dashboards ;
- alertes ;
- SLO/SLA ;
- runbooks.

---

## 14. Lot 11 — CI, tests et sécurité

Pipeline minimal :

```text
format/lint
→ typecheck
→ tests unitaires
→ tests PostgreSQL/migrations
→ tests intégration
→ tests calculs de référence
→ scan secrets
→ scan dépendances
→ build images
→ tests end-to-end
```

Tests supplémentaires : charge, restauration, rollback, corruption d’un fichier, source indisponible, dérive de schéma, double exécution et reprise après crash.

---

## 15. Lot 12 — Staging

### Déploiement

- infrastructure isolée ;
- secrets distincts ;
- volumes distincts ;
- données réelles limitées ;
- domaines de test ;
- PostHog staging séparé ou filtré.

### Recette

- collecte pilote par marché ;
- backfill pilote ;
- courbe ;
- indice de catégorie ;
- indice obligataire ;
- conversion FX ;
- sync entrante/sortante ;
- Super Admin ;
- sauvegarde/restauration ;
- rollback.

### Livrable

Rapport de recette signé et liste des écarts résiduels.

---

## 16. Lot 13 — Production S1

Uniquement après validation de `docs/10_DEPLOYMENT_GATES.md`.

Séquence :

1. vérifier le bridge ou l’accès contrôlé ;
2. inventorier domaines, vhosts, ports, bases et volumes ;
3. sauvegarder et vérifier les checksums ;
4. figer la version Git ;
5. préparer variables et secrets ;
6. déployer les services ;
7. exécuter migrations et seeds ;
8. créer le Super Admin ;
9. effectuer les health checks ;
10. exécuter une collecte et un calcul pilotes ;
11. vérifier scheduler et alertes ;
12. créer une sauvegarde post-déploiement ;
13. produire le rapport de déploiement.

Rollback immédiat si un gate critique échoue.

---

## 17. Mise à jour continue obligatoire

Chaque lot met à jour :

- `docs/05_IMPLEMENTATION_ROADMAP.md` ;
- `docs/06_CURRENT_STATUS_AND_GAPS.md` ;
- `docs/08_DECISION_LOG.md` ;
- `docs/09_CHANGELOG_WORKLOG.md` ;
- le présent document si le mode de réalisation change.
