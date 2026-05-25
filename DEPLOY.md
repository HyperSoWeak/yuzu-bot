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

| Variable                    | Default        | Notes                                                                 |
| --------------------------- | -------------- | --------------------------------------------------------------------- |
| `DISCORD_OWNER_IDS`         | _(empty)_      | Comma-separated user IDs; owner-only commands won't work without this |
| `POSTGRES_PASSWORD`         | `yuzu`         | Postgres is loopback-only, but change this on shared servers          |
| `POSTGRES_USER`             | `yuzu`         |                                                                       |
| `POSTGRES_DB`               | `yuzu`         |                                                                       |
| `BACKUP_DIR`                | `./backups`    | Host path where `pg_dump` files are written                           |
| `BACKUP_RETENTION_DAYS`     | `7`            | Days to keep backup files                                             |
| `GDRIVE_PATH`               | `yuzu-backups` | Google Drive destination folder (requires rclone setup)               |
| `DISCORD_NOTIFY_CHANNEL_ID` | _(empty)_      | Channel ID for system notifications (backup results, etc.)            |
| `LOG_LEVEL`                 | `info`         | `debug` / `info` / `warn` / `error`                                   |

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

### Google Drive sync (optional)

Backups can be uploaded to Google Drive after each dump. This requires a one-time rclone authorisation — no extra software needed on the host.

**1. Generate rclone credentials (one-time)**

Run this in the project root. It starts an interactive config session inside Docker:

```bash
docker run --rm -it -v $(pwd)/docker/rclone:/config/rclone rclone/rclone config
```

Follow the prompts:

- `n` → new remote
- Name: **`gdrive`** (must be exactly this)
- Storage type: **Google Drive** (enter the number shown)
- Leave `client_id` and `client_secret` blank (uses rclone's defaults)
- Scope: **`drive`** (full access) or **`drive.file`** (only files created by rclone)
- When asked to auto-open browser: if the workstation has a browser, say yes. If not, copy the URL and open it on any machine.
- Complete the Google authorisation in the browser.
- `n` for shared drive unless you need one.
- `q` to quit.

This writes credentials to `docker/rclone/rclone.conf` (gitignored — never committed).

**2. Set destination folder (optional)**

In `.env`, set the Google Drive folder name (defaults to `yuzu-backups`):

```env
GDRIVE_PATH=yuzu-backups
```

**3. Restart the backup service**

```bash
docker compose up -d backup
```

The next run (or manual trigger) will upload to `gdrive:yuzu-backups/`.

**Verify**

```bash
docker compose exec backup sh /usr/local/bin/backup.sh
docker compose exec backup cat /var/log/backup.log
```

Look for `uploaded to Google Drive` in the output. If credentials are missing or misconfigured, the script prints a `WARNING` and skips the upload without failing the local backup.

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
