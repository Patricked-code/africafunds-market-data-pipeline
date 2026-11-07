# 03 — Gouvernance, modèle canonique et interopérabilité

## Objectif

Permettre à la plateforme de recevoir et d’envoyer des données vers plusieurs sites et bases sans dépendre de leurs noms de tables ou de champs.

## Dictionnaire canonique

Chaque champ canonique doit définir : code stable, objet parent, libellés FR/EN, type, unité, devise, cardinalité, obligation, règles de validation, source de vérité, historisation, sensibilité et version.

## Tables d’intégration

```text
integration.external_systems
integration.external_connections
integration.schema_snapshots
integration.external_tables
integration.external_fields
integration.canonical_objects
integration.canonical_fields
integration.field_mappings
integration.value_mappings
integration.transformation_rules
integration.identifier_crosswalks
integration.data_contracts
integration.sync_definitions
integration.sync_runs
integration.sync_errors
integration.conflicts
integration.dead_letter_records
```

## Découverte des schémas

Pour chaque système externe, relever :

- tables, colonnes et types ;
- clés primaires et étrangères ;
- contraintes et index ;
- formats de dates, unités et devises ;
- valeurs d’exemple et taux de nullité ;
- fréquence et propriétaire de la donnée ;
- classification de sensibilité ;
- empreinte de schéma et dérive entre versions.

## Matrices de correspondance

Chaque mapping contient : système source, objet/champ externe, champ canonique, direction, transformation, règle de validation, confiance, priorité, version, période de validité, statut et approbateur.

Statuts : `PROPOSED`, `REVIEWED`, `APPROVED`, `ACTIVE`, `RETIRED`, `REJECTED`.

Aucun mapping ambigu ne doit être activé automatiquement.

## Correspondance des identifiants

`identifier_crosswalks` relie les identités AfricaFunds aux identifiants externes : ISIN, code régulateur, code bourse, ancien identifiant, identifiant partenaire et alias.

La résolution doit empêcher la duplication des fonds, classes, sociétés de gestion, indices et titres.

## Flux entrant

```text
Connexion → snapshot de schéma → staging → mapping
→ transformation → validation → résolution d’identité
→ modèle canonique → contrôle de réconciliation
```

## Flux sortant

```text
Modèle canonique → contrat destinataire → mapping sortant
→ transformation → validation → upsert/export/webhook
→ accusé de réception → audit
```

## Connecteurs prévus

PostgreSQL, MySQL/MariaDB, SQL Server, Oracle, Supabase, REST, GraphQL, CSV, Excel, JSON, XML/SDMX, Parquet, SFTP et S3/MinIO.

## Gouvernance

- aucun accès externe sans secret chiffré ;
- lecture seule par défaut ;
- écriture explicitement autorisée par contrat ;
- stratégie de conflit définie ;
- dry-run disponible ;
- journal de chaque ligne rejetée ;
- réconciliation des compteurs et sommes ;
- données personnelles minimisées.
