# Agent / contributor guide

Project-specific rules. The user's global preferences (zh-TW prose, concise replies, no over-engineering, etc.) still apply on top of these.

## Commit messages — strict

Release tooling is [release-please](https://github.com/googleapis/release-please), which reads every commit on `main` to compute the next version and the changelog. Bad messages = ugly / missing changelog entries.

**Format**: [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short imperative summary>

<optional body>
```

| Type       | When to use                               | Changelog     | Bump  |
| ---------- | ----------------------------------------- | ------------- | ----- |
| `feat`     | new user-visible feature                  | Features      | minor |
| `fix`      | bug fix                                   | Bug Fixes     | patch |
| `perf`     | perf improvement                          | Performance   | patch |
| `refactor` | internal restructure, no behaviour change | Refactors     | patch |
| `docs`     | docs / README / comments                  | Documentation | patch |
| `build`    | build system, Dockerfile, deps            | Build         | patch |
| `ci`       | GitHub Actions, workflows                 | CI            | patch |
| `chore`    | misc (gitignore, scaffolding)             | hidden        | patch |
| `test`     | tests only                                | hidden        | patch |

**Breaking changes**: append `!` after type/scope (`feat(api)!: ...`) or add a `BREAKING CHANGE:` footer in the body. Triggers a major bump.

**Rules**:

- One logical change per commit. Do not mix refactor with feature/fix.
- Imperative present tense (`add X`, not `added X`).
- Scope is optional; use it to point at the affected feature: `feat(keyword): ...`, `fix(color-role): ...`.
- Body explains the **why**, not the what. Skip it for trivial commits.
- Branch naming: `type/issue-id-name` when working off branches; direct push to `main` is fine for solo work.

## Before every commit

```bash
pnpm format        # writes Prettier fixes
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

CI runs the same checks. Don't push if any of these fail locally.

## Code style

- **No comments** unless explaining a non-obvious WHY (a hidden constraint, a workaround, a surprising invariant). Identifiers should already describe WHAT.
- **No defensive code** for impossible states. Trust internal callers. Validate only at boundaries (user input, external APIs).
- **No new abstractions** for hypothetical future needs. Three similar lines is better than a premature helper. Only abstract on the second or third real reuse.
- **No backwards-compat shims** for things you can just delete. If a function/var is unused, remove it.
- **No emojis in code or commit messages** unless the user explicitly asks.
- Prefer editing existing files over creating new ones. Don't create README/docs files unless asked.

## Architecture invariants

The bot must keep running through any feature failure:

- `handleMessageForKeywords` swallows all errors → only logs.
- `recordAudit` swallows all errors → audit failures must never break user-visible flows.
- Reaction / button listeners log on permission / hierarchy / fetch failures, never throw.
- Achievement engine: rule eval errors are caught per-rule and logged; one bad rule must not kill the rest.

When adding new event handlers / listeners, follow the same pattern: try/catch at the top, log, do not rethrow.

## Where things go

- **New slash command**: `src/commands/<category>/*.ts` exports default `Command`, registered in that category's `index.ts` array.
- **New achievement rule type**: `src/features/achievement/rules/<type>.ts`, calls `registerRule()`. Side-effect import from `rules/index.ts`.
- **New achievement instance**: append to `src/features/achievement/definitions.ts`; seeded on boot via `seedAchievements()`.
- **New stat type**: no code change — admins run `/keyword trigger add kind:stat group:<name> ...`.
- **New guild setting**:
  1. Add column in `prisma/schema.prisma`
  2. `pnpm prisma migrate dev --name <descriptive>`
  3. Extend `SettingsPatch` in `src/features/settings/service.ts`
  4. Add a subcommand in `src/commands/settings/index.ts` and an audit log call

## DB / Prisma

- Schema lives in `prisma/schema.prisma`. Map all field names to `snake_case` columns and all model names to `snake_case` tables (`@map` / `@@map`) — we use snake_case in Postgres.
- Generate migration via `pnpm prisma:migrate:dev` (needs a running local Postgres — `docker compose up -d postgres`).
- Never edit existing migrations. Add a new one for follow-up changes.
- `prisma generate` runs automatically as part of postinstall; rerun manually after schema edits.

## Config / env split

- **Secrets** → `.env` (validated by `src/config/env.ts` via zod).
- **Non-secret bot settings** → `config/config.toml` (validated by `src/config/config.ts`). Ship defaults in `config/config.example.toml`.
- Both loaders cache their result. Editing either requires a process restart.

## Permissions / safety

- Owner-only commands check `interaction.user.id` against `env.DISCORD_OWNER_IDS` (set in `.env`).
- Admin commands set `setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)` AND set `permissions: { adminOnly: true }` so the dispatcher rechecks at runtime.
- Color role / reaction role mutations require Manage Roles and respect role hierarchy — failures surface as `CommandError` to the user, not crashes.

## Destructive actions

Always confirm with the user before:

- `git push --force` to any branch, especially `main`.
- `prisma migrate reset`, dropping tables, deleting prod data.
- Deleting / overwriting uncommitted local work.
- Mass deletion (color roles cleanup is per-role, gated by name prefix — safe by design).

## Things that surprised me last time

- Discord `MessageFlags.Ephemeral` typings: pass `flags: MessageFlags.Ephemeral as const`, not a conditional. Avoid the deprecated `ephemeral: true` boolean.
- `SlashCommandBuilder.toJSON()` is the form you give to `REST.put(...)` — use `deployCommands()`.
- Slash commands registered globally take up to 1 hour to propagate; set `DISCORD_DEV_GUILD_ID` in `.env` for instant per-guild registration in dev.
- For button-based reaction roles, the message must be authored by the bot — only the original author can edit components.
- Color role priority: created roles start at the bottom; we explicitly `setPosition()` to just below the bot's highest role so the color actually wins Discord's color resolution.
- `release-please` won't open PRs unless the repo setting "Allow GitHub Actions to create and approve pull requests" is enabled (Settings → Actions → General).
