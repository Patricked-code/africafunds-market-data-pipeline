# 04 — Méthodologies financières maîtres

## Catégories nationales N5

Chaque jour, pour chaque catégorie nationale : compter les fonds actifs, éligibles, valorisés, utilisés, exclus et sans VL ; calculer le rendement moyen, le niveau de l’indice, le composite officiel, le benchmark, les vues locale/EUR/USD et le score de qualité.

La date déterminante est `valuation_date`, distincte de la date de publication et d’ingestion.

## Indice national de catégorie

```text
R_category(D) = moyenne des rendements valides des portefeuilles économiques utilisés
I_category(D) = I_category(D-1) × [1 + R_category(D)]
```

Base initiale : 100, sauf décision méthodologique versionnée.

Éviter de compter plusieurs classes représentant le même portefeuille économique. Conserver la composition quotidienne et tous les motifs d’exclusion.

## Benchmark plateforme

Pour une catégorie Actions nationale : combinaison versionnée entre le composite des indices officiels et l’indice de catégorie corrigé de l’inflation. Les pondérations et règles de rebalancement doivent être enregistrées, non codées implicitement.

## Devises

La série locale reste la source. Les rendements convertis intègrent l’effet de change :

```text
1 + R_EUR(t) = [1 + R_local(t)] × [FX_local/EUR(t) / FX_local/EUR(t-1)]
1 + R_USD(t) = [1 + R_local(t)] × [FX_local/USD(t) / FX_local/USD(t-1)]
```

Conserver le taux, sa date, sa source, le décalage, la triangulation et la qualité. Une vue convertie peut devenir non certifiée sans invalider la série locale.

## Obligations

Hiérarchie nationale : Agrégé, CT, MT, LT.

Bornes initiales, configurables et historisées :

- Monétaire : 0 à 1 an inclus ;
- CT : plus de 1 an à 3 ans inclus ;
- MT : plus de 3 ans à 7 ans inclus ;
- LT : plus de 7 ans.

L’affectation dépend de la maturité résiduelle chaque jour.

## Méthodes obligataires

1. `OBSERVED_TOTAL_RETURN` : prix, intérêts courus, coupons, remboursements et encours observés.
2. `MODEL_PRICED_TOTAL_RETURN` : flux actualisés par la courbe lorsqu’il manque des prix secondaires.
3. `CONSTANT_MATURITY_PROXY` : proxy explicite lorsque seuls les taux sont disponibles.

Ne jamais présenter un proxy comme un véritable Total Return.

```text
R_bond(t) = [DirtyPrice(t) + Cashflows(t)] / DirtyPrice(t-1) - 1
R_index(t) = Σ Weight(i,t-1) × R_bond(i,t)
I_index(t) = I_index(t-1) × [1 + R_index(t)]
```

## Courbes

Points cibles : ON, 1W, 1M, 3M, 6M, 9M, 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 15Y, 20Y, 25Y, 30Y.

Méthodes possibles : interpolation linéaire/monotone, spline monotone, Nelson-Siegel, Nelson-Siegel-Svensson, bootstrap zéro-coupon. Le choix dépend de la couverture et est versionné.

## Reconstitution historique

Calcul sans anticipation : utiliser uniquement les instruments, compositions, taux, encours et méthodologies connus à la date D. Conserver première publication, révisions et dates d’effet.

## Qualité

Le score quotidien couvre au minimum : couverture, fraîcheur, prix observés, qualité de courbe, encours, cashflows, anomalies et provenance. Statuts : `PROVISIONAL`, `VALIDATED`, `INSUFFICIENT_DATA` et statuts méthodologiques explicites.

## Références nationales

Le registre détaillé des indices officiels et chaînes de taux se trouve dans `docs/SOURCE_ADAPTERS.md`. Les références officielles importées restent distinctes des indices AfricaFunds calculés.
