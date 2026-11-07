# 14 — Matrice des exigences et de recette

Cette matrice relie les besoins, les composants, les preuves attendues et les gates de validation.

---

## 1. Exigences fonctionnelles

| ID | Exigence | Preuve attendue | Statut initial |
|---|---|---|---|
| FR-001 | Collecter les sources officielles configurées | run réussi, fichier archivé, provenance | PARTIAL |
| FR-002 | Archiver sans écrasement avec SHA-256 | deux versions conservées, checksums distincts | PARTIAL |
| FR-003 | Reprendre un backfill interrompu | fenêtre reprise sans doublon | PARTIAL |
| FR-004 | Gérer HTML/CSV/Excel/JSON/XML/PDF/ZIP | tests par format | PARTIAL |
| FR-005 | Conserver date économique, publication et ingestion | requête démonstrative | PARTIAL |
| FR-006 | Historiser les appartenances fonds/catégories | changement de catégorie reconstitué | PARTIAL |
| FR-007 | Éviter le double comptage des classes | cas multi-classes validé | DESIGNED |
| FR-008 | Calculer l’indice national de catégorie | jeu de référence reproduit | DESIGNED |
| FR-009 | Produire les vues locale/EUR/USD | comparaison manuelle validée | PARTIAL |
| FR-010 | Calculer le rendement réel | CPI et dates de publication tracés | DESIGNED |
| FR-011 | Construire les courbes historiques | points observés/interpolés et score | PARTIAL |
| FR-012 | Affecter Monétaire/CT/MT/LT quotidiennement | titre changeant de segment | PARTIAL |
| FR-013 | Calculer le Total Return obligataire | prix sale + flux + pondérations | PARTIAL |
| FR-014 | Produire Agrégé/CT/MT/LT | quatre séries cohérentes | DESIGNED |
| FR-015 | Distinguer officiel, propriétaire et proxy | métadonnées et API explicites | PARTIAL |
| FR-016 | Créer le premier Super Admin | login + MFA + audit | NOT_STARTED |
| FR-017 | Gérer utilisateurs, rôles et organisations | matrice de permission testée | NOT_STARTED |
| FR-018 | Découvrir les schémas externes | snapshot et empreinte | DESIGNED |
| FR-019 | Maintenir des mappings versionnés | approbation et historique | DESIGNED |
| FR-020 | Synchroniser en entrée et sortie | dry-run, sync et réconciliation | DESIGNED |
| FR-021 | Résoudre les identités externes | crosswalk sans doublon | DESIGNED |
| FR-022 | Publier par API et export | OpenAPI + fichiers + quotas | PARTIAL |
| FR-023 | Gérer les webhooks signés | livraison, retry et vérification | NOT_STARTED |
| FR-024 | Superviser les sources et jobs | cockpit avec actions auditées | PARTIAL |
| FR-025 | Versionner les méthodologies | deux versions sur périodes distinctes | PARTIAL |

---

## 2. Exigences non fonctionnelles

| ID | Exigence | Critère de recette |
|---|---|---|
| NFR-001 | Idempotence | même run deux fois, aucune duplication |
| NFR-002 | Traçabilité | toute valeur remonte au document source |
| NFR-003 | Reproductibilité | recalcul identique avec même version et inputs |
| NFR-004 | Absence de look-ahead | test historique avec données futures interdites |
| NFR-005 | Sécurité | OWASP, MFA, RBAC et secrets contrôlés |
| NFR-006 | Disponibilité | health checks et SLO définis |
| NFR-007 | Reprise | crash simulé puis reprise réussie |
| NFR-008 | Performance | temps cibles définis et mesurés |
| NFR-009 | Extensibilité | ajout d’un marché sans modifier le cœur |
| NFR-010 | Observabilité | logs, métriques, traces et alertes |
| NFR-011 | Sauvegarde | restauration complète testée |
| NFR-012 | Compatibilité API | version précédente non cassée |
| NFR-013 | Documentation | docs statut/roadmap/worklog à jour |
| NFR-014 | Confidentialité | aucune donnée sensible dans PostHog/logs |
| NFR-015 | Réversibilité | rollback staging et production testé |

---

## 3. Recette des calculs de catégories

| Cas | Données | Résultat attendu |
|---|---|---|
| CAT-001 | 4 fonds valides | moyenne correcte et composition conservée |
| CAT-002 | une VL manquante | fonds sans VL compté mais non utilisé |
| CAT-003 | deux classes même portefeuille | une seule contribution représentative |
| CAT-004 | distribution | rendement ajusté correct |
| CAT-005 | split | continuité de rendement |
| CAT-006 | changement de catégorie | inclusion uniquement sur période valide |
| CAT-007 | FX absent | local publié, vue convertie non certifiée |
| CAT-008 | couverture sous seuil | statut `INSUFFICIENT_DATA` |
| CAT-009 | rendement aberrant | exclusion ou quarantaine documentée |
| CAT-010 | révision de VL | version précédente conservée |

---

## 4. Recette obligataire

| Cas | Résultat attendu |
|---|---|
| BOND-001 zéro coupon | prix et rendement conformes |
| BOND-002 coupon annuel | intérêt couru et cashflow corrects |
| BOND-003 coupon semestriel | calendrier et day-count corrects |
| BOND-004 remboursement final | flux intégré au Total Return |
| BOND-005 amortissable | principal restant et flux partiels corrects |
| BOND-006 prix secondaire manquant | valorisation modèle explicitement marquée |
| BOND-007 seulement des taux | proxy constant maturity, jamais Total Return officiel |
| BOND-008 passage LT→MT→CT | bucket selon maturité résiduelle |
| BOND-009 encours modifié | poids historique conforme à la date |
| BOND-010 courbe révisée | première publication et révision conservées |

---

## 5. Recette interopérabilité

| Cas | Résultat attendu |
|---|---|
| INT-001 import CSV | mapping, validation et provenance |
| INT-002 PostgreSQL read-only | snapshot sans écriture |
| INT-003 drift de type | sync suspendue et alerte |
| INT-004 champ renommé | mapping proposé, non activé automatiquement |
| INT-005 conflit d’identifiant | résolution ou file de conflit |
| INT-006 export partenaire | contrat, transformation et accusé |
| INT-007 retry après panne | reprise sans doublon |
| INT-008 mapping retiré | historique conservé |
| INT-009 dry-run | impact affiché sans écriture |
| INT-010 dead-letter | ligne rejetée consultable et rejouable |

---

## 6. Recette sécurité et administration

| Cas | Résultat attendu |
|---|---|
| SEC-001 bootstrap | Super Admin créé une seule fois |
| SEC-002 secret initial | changement obligatoire |
| SEC-003 MFA | challenge valide et révocation possible |
| SEC-004 RBAC | accès refusé hors périmètre |
| SEC-005 clé API | scopes et quotas appliqués |
| SEC-006 révocation | accès immédiatement bloqué |
| SEC-007 action sensible | confirmation et audit complet |
| SEC-008 secret | absent de Git, logs et PostHog |
| SEC-009 session expirée | renouvellement contrôlé |
| SEC-010 audit | événement immuable consultable |

---

## 7. Recette des adaptateurs prioritaires

Pour chaque adaptateur :

- URL et institution officielles ;
- première et dernière date disponibles ;
- format ;
- pagination ;
- séries et maturités ;
- révisions ;
- trous ;
- licences/conditions ;
- jeux de documents témoins ;
- tests de parsing ;
- taux de couverture ;
- anomalies connues.

Marchés prioritaires : Égypte, Tunisie, Kenya, UEMOA et CEMAC.

---

## 8. Gate de staging

Le staging est validé uniquement si :

- migrations base vierge et existante réussies ;
- seeds idempotents ;
- Super Admin et RBAC validés ;
- collecte pilote réelle ;
- backfill pilote ;
- courbe et indice reproduits ;
- synchronisation pilote ;
- logs, métriques, traces et PostHog actifs ;
- sauvegarde/restauration ;
- rollback ;
- rapport de recette approuvé.

---

## 9. Gate de production

La production S1 nécessite :

- validation de tous les items de `docs/10_DEPLOYMENT_GATES.md` ;
- commit/tag immuable ;
- approbation humaine explicite ;
- inventaire et sauvegarde vérifiés ;
- ressources suffisantes ;
- proxy et certificats ;
- plan de retour arrière ;
- fenêtre de changement ;
- runbook d’incident ;
- rapport post-déploiement.
