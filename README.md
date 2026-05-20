# Yuzu Discord Bot

An extensible, long-term-maintainable Discord bot.

## Tech stack

- TypeScript / Node 22 / discord.js v14
- PostgreSQL 16 + Prisma
- pnpm, ESLint + Prettier, vitest, tsx
- TOML config (`@iarna/toml`) + zod-validated `.env`
- pino runtime logs, DB-backed audit logs
- Docker Compose (bot + postgres + backup sidecar)
- GitHub Actions CI + release-please

## Local development

```bash
pnpm install
cp .env.example .env                       # fill DISCORD_TOKEN / CLIENT_ID / OWNER_IDS
cp config/config.example.toml config/config.toml

# Start a local Postgres (postgres service only)
docker compose up -d postgres

pnpm prisma:migrate:dev                    # apply schema
pnpm dev                                   # tsx watch
```

Set `DISCORD_DEV_GUILD_ID` to register slash commands to a single guild for instant updates (global registration can take up to 1 hour to propagate).

## Deployment

```bash
docker compose up -d --build
```

- The bot container runs `prisma migrate deploy` then `pnpm start` on boot.
- Postgres backup: daily at 03:00 UTC, `pg_dump` to `./backups/yuzu-YYYYMMDD-HHMMSS.sql.gz`, 7-day retention, older files pruned automatically.

## Commands

| Category              | Commands                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Info                  | `/ping` `/botinfo` `/guildinfo` `/userinfo` `/help` `/changelog`                                                                                         |
| Settings (admin)      | `/settings show \| keyword-stats \| keyword-replies \| keyword-reply-cooldown \| achievements \| achievement-channel \| color-role \| audit-log-channel` |
| Keyword (admin)       | `/keyword trigger {add,remove,list}` `/keyword reply {add,remove,list}` `/keyword groups`                                                                |
| Achievement           | `/achievement list \| user \| top`                                                                                                                       |
| Leaderboard           | `/leaderboard <stat>`                                                                                                                                    |
| Reaction role (admin) | `/reaction-role create-button-menu \| add-reaction \| add-button \| remove-mapping \| delete \| list`                                                    |
| Color role            | `/color set \| show \| clear`                                                                                                                            |
| Owner only            | `/owner ping \| health \| say \| set-stat`                                                                                                               |

## Dev scripts

```bash
pnpm lint            # ESLint
pnpm format          # Prettier write
pnpm typecheck       # tsc --noEmit
pnpm build           # tsc -p tsconfig.build.json
pnpm test            # vitest run
pnpm prisma:migrate:dev
```

## Architecture

```
src/
├── config/         # env (zod) + TOML loader
├── core/
│   ├── command/    # registry, dispatcher, cooldown, errors
│   ├── event-bus.ts
│   ├── logger.ts (pino)
│   └── audit-log.ts
├── features/
│   ├── settings/
│   ├── keyword/    # service, matcher, stats, listener
│   ├── achievement/ # engine + rules/*.ts (one file per rule type)
│   ├── reaction-role/
│   └── color-role/
├── commands/       # grouped by category
└── db/             # prisma client
```

Extension points:

- **New command**: export a `Command` from `src/commands/<category>/*.ts` and add it to that category's `index.ts` array.
- **New achievement rule type**: implement `AchievementRule` in `src/features/achievement/rules/<type>.ts` and call `registerRule()`.
- **New achievement**: add an entry to `src/features/achievement/definitions.ts`.
- **New stat type**: admins just run `/keyword trigger add kind:stat group:<name> ...`.
- **New guild setting**: add the column in `prisma/schema.prisma` → migration → extend `SettingsPatch` in the service → add a `/settings` subcommand.

## Release

Uses [release-please](https://github.com/googleapis/release-please). When commits land on `main`, the action opens a release PR; merging that PR cuts a tag, creates a GitHub Release, and updates `CHANGELOG.md`.

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).
