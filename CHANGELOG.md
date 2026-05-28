# Changelog

## [1.6.0](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.5.0...v1.6.0) (2026-05-28)


### Features

* **backup:** add optional Google Drive upload via rclone ([6aa2a4d](https://github.com/HyperSoWeak/yuzu-bot/commit/6aa2a4d8667c9441f99e537bc30c9714558eee2a))
* **backup:** send Discord notification on backup completion ([6d043ba](https://github.com/HyperSoWeak/yuzu-bot/commit/6d043ba0ec18aa1e117d7a4be0bb98c854cc935d))
* **mine:** persist active games across restarts ([d4f101e](https://github.com/HyperSoWeak/yuzu-bot/commit/d4f101e1aa435a33ab6ad4806b9cb075a6223e86))
* **mine:** replace per-player move cap with 5-step consecutive limit ([4308371](https://github.com/HyperSoWeak/yuzu-bot/commit/430837186b367cf3cadd62ddc23a45023b0829b4))
* **role-menu:** replace reaction-role with button-only role-menu ([e8a7069](https://github.com/HyperSoWeak/yuzu-bot/commit/e8a7069b9de69b47d43a3d8b9d4b6d9edc7ca3a1))
* **role-menu:** replace reaction-role with button-only role-menu ([0baded3](https://github.com/HyperSoWeak/yuzu-bot/commit/0baded3987ac4413a000e32183e7543a5cf21747))


### Bug Fixes

* **role-menu:** fix TOCTOU race in getOrCreateMenu using upsert ([fbb4fb5](https://github.com/HyperSoWeak/yuzu-bot/commit/fbb4fb51d62fec421a0befb06ee3091b7c613486))
* **role-menu:** replace deprecated ephemeral:true with MessageFlags.Ephemeral ([52e32ec](https://github.com/HyperSoWeak/yuzu-bot/commit/52e32eccf2100187db72ee29fbb43d62b74b2013))

## [1.5.0](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.4.0...v1.5.0) (2026-05-23)


### Features

* **botinfo:** show bot version from package.json ([60ad4f4](https://github.com/HyperSoWeak/yuzu-bot/commit/60ad4f41f3180faac4916f580557429e8438c6d7))
* **mine:** add expert 16×16 difficulty ([3ce9ad1](https://github.com/HyperSoWeak/yuzu-bot/commit/3ce9ad1da5423d9e3bb1d54b4c51b732c3cbd7eb))
* **mine:** add renderBoardImage with dark Discord theme ([7414051](https://github.com/HyperSoWeak/yuzu-bot/commit/74140510ebdf0fdaa64b87e9652364c0774a96bc))
* **mine:** add renderStatusText for image+status separation ([abdb51c](https://github.com/HyperSoWeak/yuzu-bot/commit/abdb51c335feb078b123154b7531469dbbad82ca))
* **mine:** chord open on revealed number cells ([d88eb45](https://github.com/HyperSoWeak/yuzu-bot/commit/d88eb45f402715d8ab5219a7ff4d53439ea381e1))
* **mine:** use image board output with text fallback ([f691e7b](https://github.com/HyperSoWeak/yuzu-bot/commit/f691e7bb63be0042cc300a8dcb996506e6072e9f))


### Bug Fixes

* **mine-display:** remove irregular whitespace characters ([37b1912](https://github.com/HyperSoWeak/yuzu-bot/commit/37b19122df470c200dd6de197bb18a9f38ef5e23))
* **mine:** extend COL_EMOJIS and ROW_LABELS to support 16-col expert board ([df8def8](https://github.com/HyperSoWeak/yuzu-bot/commit/df8def8f4d3dfb1526ef003f90f4d395ce4ed710))
* **mine:** load system fonts and use FreeMono for board image rendering ([8077cc1](https://github.com/HyperSoWeak/yuzu-bot/commit/8077cc171272d3686886ab309a0b413cbae4abd3))
* **mine:** prevent column headers from combining into flag emoji ([1a2c4da](https://github.com/HyperSoWeak/yuzu-bot/commit/1a2c4da03cb572a051bbad62c2498c4c9f2cf8c5))
* **mine:** use unicode escapes in renderStatusText to avoid irregular whitespace lint errors ([a243790](https://github.com/HyperSoWeak/yuzu-bot/commit/a243790eca05ccdfcf73c4805a77837e715b955c))

## [1.4.0](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.3.0...v1.4.0) (2026-05-23)


### Features

* **achievement:** add fix-achievements owner command ([5c08d25](https://github.com/HyperSoWeak/yuzu-bot/commit/5c08d25a6ed6da7c234b473e0fd56e935649bb9e))


### Bug Fixes

* **achievement:** check achievementsEnabled before fix-achievements ([e00ae65](https://github.com/HyperSoWeak/yuzu-bot/commit/e00ae6536a93d05608a98c3942bb2d407eb5e4af))

## [1.3.0](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.2.0...v1.3.0) (2026-05-23)


### Features

* **mine:** add /mine slash command and register it ([03ec1d2](https://github.com/HyperSoWeak/yuzu-bot/commit/03ec1d222c9997683ef84b8190a1c56509f40597))
* **mine:** add board display renderer ([cb7a0d1](https://github.com/HyperSoWeak/yuzu-bot/commit/cb7a0d13d97b2491227a21bd08cc5c946262ed77))
* **mine:** add cooperative minesweeper mini-game ([295318d](https://github.com/HyperSoWeak/yuzu-bot/commit/295318d907ab5bb78b43c9f926ff78d209a60ab3))
* **mine:** add game logic with open, flag, and flood fill ([5f58b39](https://github.com/HyperSoWeak/yuzu-bot/commit/5f58b3922c2640844be24900d18581e68aa45fef))
* **mine:** add in-memory game store with 24h timeout ([87f71e6](https://github.com/HyperSoWeak/yuzu-bot/commit/87f71e6b71ad54ad10fe844f958929db218255cc))
* **mine:** add mine game types and category ([08fccfe](https://github.com/HyperSoWeak/yuzu-bot/commit/08fccfe11ac678e312f3c1451dc4e9fb25d0f60b))
* **mine:** add mine placement and adjacency calculation ([83c86c9](https://github.com/HyperSoWeak/yuzu-bot/commit/83c86c9c96edfc05eeb52d5e6bee6f01437dee59))

## [1.2.0](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.1.1...v1.2.0) (2026-05-22)


### Features

* **backfill:** add until option to limit scan end time ([a150109](https://github.com/HyperSoWeak/yuzu-bot/commit/a150109e2e9d64b6271b705f8f4399f29665b92f))
* **leaderboard,achievement:** make ranking replies public ([16d07b4](https://github.com/HyperSoWeak/yuzu-bot/commit/16d07b4b891a87960bc6aca5ec00c2b676c8cff5))


### Bug Fixes

* **owner:** validate set-stat key against config STAT groups ([6caf013](https://github.com/HyperSoWeak/yuzu-bot/commit/6caf013d141081064029998a69932df983a04d41))

## [1.1.1](https://github.com/HyperSoWeak/yuzu-bot/compare/v1.1.0...v1.1.1) (2026-05-22)


### Bug Fixes

* **backup:** invoke script via sh and run as host user ([902c100](https://github.com/HyperSoWeak/yuzu-bot/commit/902c100021e34bcaaf414d28eaefc70a5d7f751c))
* **backup:** use root user for rootless Docker; fix docs ([8cdaa42](https://github.com/HyperSoWeak/yuzu-bot/commit/8cdaa423024ab30b0550204a391cfec17150fc5e))

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
