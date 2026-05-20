# Yuzu Discord Bot

可擴充、可長期維護的 Discord Bot。

需求文件：

- [`docs/v0.md`](docs/v0.md) — 整體需求
- [`docs/reaction-role.md`](docs/reaction-role.md) — Reaction / Button role
- [`docs/color-role.md`](docs/color-role.md) — Self color role

## 開發

```bash
pnpm install
cp .env.example .env            # 填入 DISCORD_TOKEN / DISCORD_CLIENT_ID 等
cp config/config.example.toml config/config.toml
pnpm prisma:migrate:dev
pnpm dev
```

## 部署

```bash
docker compose up -d --build
```

Backup 寫到 `./backups`，保留 7 天，每天 03:00 UTC 執行一次。

## 指令

- `pnpm lint` / `pnpm format` / `pnpm typecheck`
- `pnpm build` / `pnpm start`
- `pnpm test`
- `pnpm prisma:migrate:dev`

## Release

採用 [release-please](https://github.com/googleapis/release-please)：合併到 `main` 後 action 自動產生 release PR；merge release PR 即發 tag / GitHub release / 更新 `CHANGELOG.md`。

Commit 訊息請遵循 [Conventional Commits](https://www.conventionalcommits.org/)。
