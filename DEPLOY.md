# Deployment Guide

## Prerequisites

- Docker + Docker Compose v2
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))

---

## First-time setup

```bash
cp .env.example .env
cp config/config.example.toml config/config.toml
```

Edit `.env`. Only two values are required — the bot refuses to start without them:

```env
DISCORD_TOKEN=<bot token>
DISCORD_CLIENT_ID=<application id>
```

| Variable                | Default     | Notes                                                                 |
| ----------------------- | ----------- | --------------------------------------------------------------------- |
| `DISCORD_OWNER_IDS`     | _(empty)_   | Comma-separated user IDs; owner-only commands won't work without this |
| `POSTGRES_PASSWORD`     | `yuzu`      | Postgres is loopback-only, but change this on shared servers          |
| `POSTGRES_USER`         | `yuzu`      |                                                                       |
| `POSTGRES_DB`           | `yuzu`      |                                                                       |
| `BACKUP_DIR`            | `./backups` | Host path where `pg_dump` files are written                           |
| `BACKUP_RETENTION_DAYS` | `7`         | Days to keep backup files                                             |
| `LOG_LEVEL`             | `info`      | `debug` / `info` / `warn` / `error`                                   |

> **Do not set `DATABASE_URL`** — Docker Compose assembles it from `POSTGRES_*` and injects it automatically.

Edit `config/config.toml` if needed (non-secret settings; defaults are reasonable). Changes take effect after `docker compose restart bot` — no rebuild needed.

Then start:

```bash
docker compose up -d --build
```

On first boot the bot runs `prisma migrate deploy` to initialise the schema, then starts. Slash commands are registered automatically on startup.

---

## Verifying

```bash
docker compose ps          # all three services should show "Up"
docker compose logs -f bot  # watch startup logs
```

Healthy startup ends with `discord ready` and `deployed global commands`.

> Global slash commands can take up to 1 hour to appear in Discord. Set `DISCORD_DEV_GUILD_ID=<your guild id>` in `.env` for instant guild registration.

---

## Updating

```bash
git pull
docker compose up -d --build
```

New migrations are applied automatically on startup.

---

## Backups

A sidecar container runs `pg_dump` daily at **03:00 UTC** → `BACKUP_DIR/yuzu-YYYYMMDD-HHMMSS.sql.gz`. Files older than `BACKUP_RETENTION_DAYS` are pruned automatically.

### Manual backup

```bash
docker compose exec backup sh /usr/local/bin/backup.sh
```

### Restore

```bash
gunzip -c backups/yuzu-<timestamp>.sql.gz | \
  docker compose exec -T postgres psql -U yuzu -d yuzu
```

---

## Stopping / restarting

```bash
docker compose down          # stop, keep volumes
docker compose down -v       # stop and DELETE all data (irreversible)
docker compose restart bot   # restart bot only (e.g. after .env change)
```

---

## Troubleshooting

| Symptom                                | Likely cause                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Bot exits immediately on start         | Missing `DISCORD_TOKEN` or `DISCORD_CLIENT_ID` in `.env`                                           |
| `prisma migrate deploy` error          | Postgres not healthy yet — check `docker compose logs postgres`                                    |
| Slash commands not appearing           | Global propagation delay (up to 1 hour); set `DISCORD_DEV_GUILD_ID` for instant guild registration |
| Owner commands say "permission denied" | `DISCORD_OWNER_IDS` not set or wrong user ID                                                       |
| Color roles not applying               | Bot role is too low in the server hierarchy; move it above the color roles                         |
