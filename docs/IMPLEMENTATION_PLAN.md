# Plan d’implémentation

## État de la version 0.1

| Lot | État |
|---|---|
| Registre des 11 marchés et institutions | Réalisé |
| Registre des endpoints initiaux | Réalisé — 44 endpoints |
| Archive brute SHA-256 | Réalisé |
| Collecteur HTTP et reprises | Réalisé |
| Parseurs HTML, CSV, XLS/XLSX | Réalisé |
| Découverte de documents liés | Réalisé |
| PostgreSQL et migrations | Réalisé |
| File de rattrapage historique | Réalisé |
| Scheduler quotidien/hebdomadaire/mensuel | Réalisé |
| Noyau de calcul monétaire, change et indices | Réalisé |
| Noyau de valorisation obligataire par courbe | Réalisé |
| Adaptateurs nationaux de normalisation | À développer source par source |
| Bootstrap complet des courbes | À développer |
| Total Return CT/MT/LT quotidien | À développer après contrôle des données |
| Publication API vers AfricaFunds | À raccorder au projet existant |

## Ordre recommandé

1. Maroc : MONIA, interbancaire, FX et indices Casablanca.
2. Égypte : CONIA/CONIA Index et T-Bills/T-Bonds via API dynamique.
3. Nigeria : NOFRI, Government Securities et DMO.
4. UEMOA : BCEAO, UMOA-Titres et BRVM.
5. Ghana et Kenya.
6. Tunisie et CEMAC.
7. Botswana, Namibie et Éthiopie.

## Critère de fin d’un marché

Un marché ne peut être marqué `HISTORY_COMPLETE` que lorsque :

- la première et la dernière date ont été établies ;
- toutes les pages et fichiers ont été parcourus ;
- les doublons et ruptures ont été contrôlés ;
- les maturités sont normalisées ;
- la provenance est complète ;
- les contrôles de couverture sont publiés ;
- un échantillon a été rapproché manuellement avec la source officielle.
