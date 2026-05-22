# Changelog

## [1.1.0](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.0.1...v1.1.0) (2026-05-22)


### Features

* **keyword:** add /owner backfill to recover missed keyword stats ([a37db86](https://github.com/HyperSoWeak/yuzu-bot/commit/a37db866a7b4dcc04927fe5eb866296fbc21feda))
* **keyword:** make triggers and stats global; config-driven triggers ([8df08e9](https://github.com/HyperSoWeak/yuzu-bot/commit/8df08e952b11e49a8cd1fd70978c4f82e1ccf623))

## [1.0.1](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.0.0...v1.0.1) (2026-05-20)


### Bug Fixes

* **build:** resolve @/ path aliases in compiled output via tsc-alias ([857277f](https://github.com/HyperSoWeak/yuzu-bot/commit/857277fa7f4d29cba2df9d8bc72861da947e47d5))
* **docker:** fix Prisma engine setup on Alpine runtime ([28b1666](https://github.com/HyperSoWeak/yuzu-bot/commit/28b16664daae6d026940899050e264a65222257e))
* **docker:** use external DNS to fix musl libc resolution failure ([e0599a5](https://github.com/HyperSoWeak/yuzu-bot/commit/e0599a583ad50c904e75c8175a2fee4187f28f60))

## 1.0.0 (2026-05-20)


### Features

* **achievement:** add extensible achievement system ([18b9103](https://github.com/HyperSoWeak/yuzu-bot/commit/18b9103920223bc3781d43d47509abc350b34dd8))
* **color-role:** add self color role ([106e9e3](https://github.com/HyperSoWeak/yuzu-bot/commit/106e9e3e6c8dc8046ca4a90eb9967e9a97170cac))
* **color-role:** raise role position; cleanup orphaned roles ([5e168dc](https://github.com/HyperSoWeak/yuzu-bot/commit/5e168dc2444ff52e619dbc14d2af2a01ca508178))
* **commands:** add command framework + info commands ([e81964d](https://github.com/HyperSoWeak/yuzu-bot/commit/e81964d55cb0b162efb72a34587206d3447def33))
* **commands:** add leaderboard and owner-only commands ([dd08689](https://github.com/HyperSoWeak/yuzu-bot/commit/dd08689dcd4ed6eb3d33f7462b1608c42017ac80))
* **keyword:** add keyword stats + replies system ([3ca1e17](https://github.com/HyperSoWeak/yuzu-bot/commit/3ca1e17d0160d734c4a438b9b54e9d71176323a9))
* **reaction-role:** add reaction + button role menus ([82f584e](https://github.com/HyperSoWeak/yuzu-bot/commit/82f584ea9830e9e4e5d5da27e368b87203b80c36))
* **settings:** add guild settings service and slash commands ([f81f975](https://github.com/HyperSoWeak/yuzu-bot/commit/f81f97557b9abcc5f771b3021ced74b95898c8ed))


### Bug Fixes

* **docker:** publish postgres port to loopback for local dev ([df2aa10](https://github.com/HyperSoWeak/yuzu-bot/commit/df2aa109d00394c774780711154d1151d898148e))
