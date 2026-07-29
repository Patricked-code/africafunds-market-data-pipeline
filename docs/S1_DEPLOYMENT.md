# Déploiement S1 — sadiaaf.wealthtechinnovations.com

## Affectation des domaines

- `sadiaaf.wealthtechinnovations.com` : tableau de bord de supervision en lecture seule.
- `api.sadiaaf.wealthtechinnovations.com` : API de santé et de consultation des séries.
- `/opt/apps/sadiaaf-market-data` : releases Docker, données partagées et état de déploiement.
- `/var/backups/sadiaaf` : sauvegardes datées des anciennes applications et configurations Plesk.

## Sécurité du remplacement

Le déploiement suit cet ordre :

1. précontrôle des vhosts, ports, Docker, Plesk et espace disque ;
2. sauvegarde intégrale des deux anciennes applications ;
3. sauvegarde de `vhost.conf` et `vhost_ssl.conf` ;
4. construction du stack Docker ;
5. migrations et seed PostgreSQL ;
6. vérification locale des services ;
7. activation du proxy Plesk ;
8. vérification HTTPS externe ;
9. suppression des anciens contenus seulement après succès ;
10. écriture de `DEPLOYMENT_STATE.json` avec le chemin de rollback.

En cas d’échec après la sauvegarde, le script appelle automatiquement le rollback.

## Commande

```bash
cd /chemin/du/projet
sudo ./deploy/s1/deploy.sh
```

## Rollback manuel

```bash
sudo ./deploy/s1/rollback.sh /var/backups/sadiaaf/YYYYMMDD_HHMMSS
```

## Ports locaux

- API : `127.0.0.1:8891`
- Web : `127.0.0.1:8892`

Ces ports peuvent être remplacés avec `API_BIND_PORT` et `WEB_BIND_PORT`.

## Cron

Le conteneur `collector` exécute le scheduler interne :

- ingestion les jours ouvrés à 21 h 30 ;
- découverte des archives le dimanche à 2 h 15 ;
- audit des portails le premier jour du mois à 3 h.

Ne pas activer simultanément le scheduler interne et le fichier `crontab.example`.
