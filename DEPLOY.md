# Deployment Guide

## Prerequisites

- Docker + Docker Compose v2
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))

---

## First-time setup

### 1. Copy config files

```bash
cp .env.example .env
cp config/config.example.toml config/config.toml
```

### 2. Fill in `.env`

Only two values are strictly required — the bot will refuse to start without them:

```env
DISCORD_TOKEN=<bot token>
DISCORD_CLIENT_ID=<application id>
```

Everything else has a working default. Set these if you want to override them:

| Variable            | Default     | Notes                                                                 |
| ------------------- | ----------- | --------------------------------------------------------------------- |
| `DISCORD_OWNER_IDS` | _(empty)_   | Comma-separated user IDs; owner-only commands won't work without this |
| `POSTGRES_PASSWORD` | `yuzu`      | Postgres is loopback-only, but change this on shared servers          |
| `POSTGRES_USER`     | `yuzu`      |                                                                       |
| `POSTGRES_DB`       | `yuzu`      |                                                                       |
| `BACKUP_DIR`        | `./backups` | Host path where `pg_dump` files are written                           |
| `LOG_LEVEL`         | `info`      | `debug` / `info` / `warn` / `error`                                   |

> **Do not set `DATABASE_URL`** — Docker Compose assembles it from `POSTGRES_*` and injects it into the bot container automatically.

### 3. Edit `config/config.toml` if needed

Non-secret settings (bot name, cooldowns, feature flags). The defaults are reasonable; only edit what you need.

### 4. Start

```bash
docker compose up -d --build
```

On first boot the bot container runs `prisma migrate deploy` to initialise the schema, then starts. Slash commands are registered to Discord automatically on every startup.

---

## Verifying the deployment

```bash
docker compose ps                  # all three services should show "Up"
docker compose logs -f bot         # watch startup logs
```

Expected startup sequence in logs:

```
postgres connected
commands registered
discord ready
deployed global commands
```

> Global slash commands can take up to 1 hour to appear in Discord. For instant updates, set `DISCORD_DEV_GUILD_ID=<your guild id>` in `.env` — commands will register to that guild only.

---

## Updating

```bash
git pull
docker compose up -d --build
```

The bot container re-runs `prisma migrate deploy` on every start, so new migrations are applied automatically.

---

## Backups

A sidecar container runs `pg_dump` daily at **03:00 UTC**, writing compressed files to `BACKUP_DIR`:

```
backups/
  yuzu-20260520-030000.sql.gz
  yuzu-20260519-030000.sql.gz
  ...
```

Files older than 7 days are pruned automatically. To change retention, set `BACKUP_RETENTION_DAYS` in `.env`.

### Manual backup

```bash
docker compose exec backup backup.sh
```

### Restore from backup

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
| `prisma migrate deploy` error          | Postgres not healthy yet; Docker Compose should retry — check `docker compose logs postgres`       |
| Slash commands not appearing           | Global propagation delay (up to 1 hour); set `DISCORD_DEV_GUILD_ID` for instant guild registration |
| Owner commands say "permission denied" | `DISCORD_OWNER_IDS` not set or wrong user ID                                                       |
| Color roles not applying               | Bot role is too low in the server hierarchy; move it above the color roles                         |
