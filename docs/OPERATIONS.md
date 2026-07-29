# Exploitation

## Démarrage

```bash
cp .env.example .env
docker compose up -d --build
```

## Contrôle

```bash
docker compose logs -f collector
docker compose ps
docker compose exec postgres psql -U africafunds -d africafunds_market
```

## Reprise d’un échec

1. Examiner `ops.ingestion_runs`.
2. Vérifier `publish.latest_source_health`.
3. Contrôler les fichiers sous `data/raw/<marché>/<endpoint>/`.
4. Relancer uniquement le marché ou la famille en échec.
5. Ne jamais supprimer l’archive brute pour forcer un recalcul.

## Sauvegarde

Sauvegarder ensemble :

- PostgreSQL ;
- `data/raw` ;
- `config/sources.json` ;
- versions de méthodologie.

## Déploiement sans régression

1. sauvegarde base et archive ;
2. `git status` propre ;
3. construction Docker ;
4. tests et typecheck ;
5. migrations sur copie ou staging ;
6. ingestion d’un seul marché pilote ;
7. contrôle des comptes, empreintes et doublons ;
8. activation progressive du scheduler.
