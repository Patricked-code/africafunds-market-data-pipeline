# Dictionnaire de données initial

## Grains importants

| Table | Grain |
|---|---|
| `source.raw_artifacts` | Une version de contenu unique par endpoint et SHA-256 |
| `market.raw_records` | Une ligne extraite d’un fichier ou tableau |
| `market.official_index_observations` | Un indice officiel, une date, une révision |
| `market.official_rate_observations` | Une série de taux, une date, une révision |
| `market.instrument_market_observations` | Un instrument, une date, un type d’observation |
| `calc.yield_curve_points` | Une courbe quotidienne et une maturité |
| `calc.instrument_daily_valuations` | Un instrument et une date |
| `calc.index_daily_values` | Un indice, une date, une devise et une révision |
| `quality.source_health_checks` | Un endpoint et un contrôle horodaté |
| `ops.backfill_jobs` | Un endpoint et une fenêtre historique |

## Champs récupérés

- dates de référence, publication, émission, règlement et échéance ;
- niveau d’indice et type de rendement ;
- taux, bid, ask, moyenne pondérée, taux marginal ;
- volumes, montants offerts et acceptés ;
- prix propre, prix sale et intérêt couru ;
- coupon, fréquence, nominal et encours ;
- devise, maturité et fournisseur ;
- URL, fichier, feuille, ligne et empreinte source.

## Champs calculés

- rendement journalier ;
- maturité résiduelle ;
- segment monétaire, CT, MT ou LT ;
- courbe ajustée, taux zéro coupon, par et forward ;
- prix de modèle, duration, convexité et DV01 ;
- rendement Total Return ;
- poids et composition quotidienne ;
- niveau d’indice local, EUR et USD ;
- couverture et score de qualité.
