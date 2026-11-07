# 01 — Vision produit et périmètre

## Dénomination et séparation du périmètre

La **plateforme SadiaAF** est la cible du socle technique actuellement hébergé dans le dépôt historique `Patricked-code/africafunds-market-data-pipeline`. Le nom de ce dépôt, ainsi que certains noms internes historiques comme « modèle canonique AfricaFunds », ne changent **ni la responsabilité ni la cible** de la plateforme. **AfricaFunds** désigne un consommateur éventuel de ses données, parmi d'autres ; la plateforme centrale doit rester indépendante et servir plusieurs applications et partenaires.

Cette clarification est documentaire et ne demande **aucun renommage cassant** de module, API, table, domaine ou dépôt.

## Le produit

SadiaAF n’est pas seulement un site web. C’est une **plateforme de données financières africaines** qui sert de source de vérité technique à plusieurs applications.

```text
Sources officielles et partenaires
            ↓
Collecte, archivage, extraction, normalisation
            ↓
Modèle canonique AfricaFunds
            ↓
Calculs, qualité, méthodologies et publication
            ↓
AfricaFunds, BRVM ChainSolutions, partenaires, exports et API
```

## Interfaces prévues

### `sadiaaf.wealthtechinnovations.com`

Cockpit sécurisé : Super Administrateur, gestion des données, qualité, sources, adaptateurs, mappings, synchronisations, calculs, publications et audit.

### `api.sadiaaf.wealthtechinnovations.com`

API versionnée pour les applications internes et partenaires : marchés, taux, courbes, indices, fonds, VL, benchmarks, méthodologies et intégrations.

## Premier bootstrap cible

Le premier déploiement validé devra créer automatiquement :

- PostgreSQL et tous les schémas ;
- stockage des sources brutes ;
- API et workers ;
- scheduler ;
- migrations et seeds ;
- premier compte `SUPER_ADMIN` via secret à usage unique ;
- journal d’audit ;
- clés et secrets hors Git ;
- tests de santé ;
- état de déploiement et rollback.

## Utilisateurs

- Super Administrateur
- Administrateur données
- Contrôleur qualité
- Opérateur de collecte
- Méthodologiste / analyste quantitatif
- Développeur intégration/API
- Lecteur / auditeur
- Organisation ou application partenaire

## Hors périmètre immédiat

- déploiement production avant recette ;
- remplacement d’un service existant sans sauvegarde ;
- publication d’un indice non validé comme indice officiel ;
- écriture aveugle dans une base partenaire ;
- contournement d’authentification, CAPTCHA ou licence de données.

## Résultat attendu

Chaque valeur diffusée doit répondre à :

- quelle source ?
- quelle date économique ?
- quelle version de fichier ?
- quelle transformation ?
- quelle méthodologie ?
- quels composants ?
- quelle devise et quel FX ?
- quelle couverture ?
- quel score de qualité ?
- quel run de calcul ?
