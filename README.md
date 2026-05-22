# Yuzu Discord Bot

[![CI](https://github.com/HyperSoWeak/yuzu-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/HyperSoWeak/yuzu-bot/actions/workflows/ci.yml)

A Discord bot for community servers — tracks keyword stats, awards achievements, manages color roles and reaction roles, and logs admin actions. Run `/help` in Discord for a full command reference.

## Tech stack

- TypeScript / Node 22 / discord.js v14
- PostgreSQL 16 + Prisma
- pnpm, ESLint + Prettier, vitest, tsx
- TOML config (`@iarna/toml`) + zod-validated `.env`
- pino runtime logs, DB-backed audit logs
- Docker Compose (bot + postgres + backup sidecar)
- GitHub Actions CI + release-please

## Prerequisites

- Node 22+, pnpm, Docker
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- Required gateway intents (enable in Developer Portal → Bot): **Server Members**, **Message Content**

## Local development

```bash
pnpm install
cp .env.example .env
cp config/config.example.toml config/config.toml
```

Required `.env` fields:

| Variable            | Description                     |
| ------------------- | ------------------------------- |
| `DISCORD_TOKEN`     | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | Application ID                  |
| `DISCORD_OWNER_IDS` | Comma-separated owner user IDs  |
| `DATABASE_URL`      | Postgres connection string      |

Optional: set `DISCORD_DEV_GUILD_ID` to register slash commands to one guild for instant updates (omit for global registration, which can take up to 1 hour).

```bash
docker compose up -d postgres   # start local Postgres
pnpm prisma:migrate:dev         # apply schema
pnpm dev                        # tsx watch — bot logs to stdout
```

The bot prints `Logged in as Yuzu#XXXX` when ready. Slash commands are deployed automatically on startup.

## Deployment

```bash
docker compose up -d --build
```

On start the bot container runs `prisma migrate deploy` then `pnpm start`. No manual migration step needed.

Postgres backup: daily `pg_dump` at 03:00 UTC → `./backups/yuzu-YYYYMMDD-HHMMSS.sql.gz`, 7-day retention.

## Dev scripts

```bash
pnpm lint
pnpm format
pnpm typecheck
pnpm build
pnpm test
pnpm prisma:migrate:dev
```

## Architecture

```
src/
├── config/         # env (zod) + TOML loader
├── core/
│   ├── command/    # registry, dispatcher, cooldown, errors
│   ├── event-bus.ts
│   ├── logger.ts
│   └── audit-log.ts
├── features/       # one directory per domain (settings, keyword, achievement, …)
├── commands/       # slash commands grouped by category; each file exports a Command
└── db/             # prisma client
```

Features are isolated by domain under `src/features/`; commands under `src/commands/` are thin handlers that call into feature services.

## Release

Uses [release-please](https://github.com/googleapis/release-please). Commits to `main` trigger the action; it opens a release PR. Merging that PR cuts a tag, creates a GitHub Release, and updates `CHANGELOG.md`. Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).

After a release tag is cut, deploy by pulling the latest code and rebuilding:

```bash
git pull && docker compose up -d --build
```

## License

MIT
