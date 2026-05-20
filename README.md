# Yuzu Discord Bot

可擴充、可長期維護的 Discord Bot。

需求文件：

- [`docs/v0.md`](docs/v0.md) — 整體需求
- [`docs/reaction-role.md`](docs/reaction-role.md) — Reaction / Button role
- [`docs/color-role.md`](docs/color-role.md) — Self color role

## Tech stack

- TypeScript / Node 22 / discord.js v14
- PostgreSQL 16 + Prisma
- pnpm, ESLint + Prettier, vitest, tsx
- TOML config (`@iarna/toml`) + zod-validated `.env`
- pino runtime logs, DB-backed audit logs
- Docker Compose (bot + postgres + backup sidecar)
- GitHub Actions CI + release-please

## 本地開發

```bash
pnpm install
cp .env.example .env                       # 填 DISCORD_TOKEN / CLIENT_ID / OWNER_IDS
cp config/config.example.toml config/config.toml

# 啟動本地 Postgres (只開 postgres service)
docker compose up -d postgres

pnpm prisma:migrate:dev                    # 套用 schema
pnpm dev                                   # tsx watch
```

設定 `DISCORD_DEV_GUILD_ID` 後，slash command 會註冊到單一 guild，更新立即生效（global 註冊最久需 1 小時）。

## 部署

```bash
docker compose up -d --build
```

- Bot container 啟動時自動跑 `prisma migrate deploy` + `pnpm start`。
- Postgres backup：每日 03:00 UTC `pg_dump` 到 `./backups/yuzu-YYYYMMDD-HHMMSS.sql.gz`，保留 7 天，自動刪除過期檔。

## 指令

| 分類                  | 指令                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Info                  | `/ping` `/botinfo` `/guildinfo` `/userinfo` `/help` `/changelog`                                                                                         |
| Settings (admin)      | `/settings show \| keyword-stats \| keyword-replies \| keyword-reply-cooldown \| achievements \| achievement-channel \| color-role \| audit-log-channel` |
| Keyword (admin)       | `/keyword trigger {add,remove,list}` `/keyword reply {add,remove,list}` `/keyword groups`                                                                |
| Achievement           | `/achievement list \| user \| top`                                                                                                                       |
| Leaderboard           | `/leaderboard <stat>`                                                                                                                                    |
| Reaction role (admin) | `/reaction-role create-button-menu \| add-reaction \| add-button \| remove-mapping \| delete \| list`                                                    |
| Color role            | `/color set \| show \| clear`                                                                                                                            |
| Owner only            | `/owner ping \| health \| say \| set-stat`                                                                                                               |

## 開發指令

```bash
pnpm lint            # ESLint
pnpm format          # Prettier write
pnpm typecheck       # tsc --noEmit
pnpm build           # tsc -p tsconfig.build.json
pnpm test            # vitest run
pnpm prisma:migrate:dev
```

## 架構

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
├── commands/       # 按分類分資料夾
└── db/             # prisma client
```

新增功能：

- 新指令：在 `src/commands/<category>/*.ts` export `Command`，加入該分類的 `index.ts` 陣列。
- 新成就規則：在 `src/features/achievement/rules/<type>.ts` 實作 `AchievementRule` 並 `registerRule()`。
- 新成就：在 `src/features/achievement/definitions.ts` 新增條目。
- 新統計類型：admin 直接用 `/keyword trigger add kind:stat group:<name> ...`。
- 新 guild setting：schema 加欄位 → migration → service `SettingsPatch` 加 key → `/settings` 加 subcommand。

## Release

採用 [release-please](https://github.com/googleapis/release-please)：合併到 `main` 後 action 自動產生 release PR；merge release PR 即發 tag / GitHub release / 更新 `CHANGELOG.md`。

Commit 訊息請遵循 [Conventional Commits](https://www.conventionalcommits.org/)。
