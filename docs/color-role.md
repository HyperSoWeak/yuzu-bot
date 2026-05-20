## Self Color Role

Self color role 讓使用者可以自行選擇身份組顏色。Yuzu 會依照使用者指定的顏色，自動建立或重用對應顏色身份組，並 assign 給使用者。

需求：

- 每個 guild 可設定是否啟用 self color role
- 使用者可設定自己的顏色身份組
- 使用者同時只能擁有一個由 Yuzu 管理的 color role
- 支援常見顏色輸入格式，例如：
  - Hex：`#ff66cc`
  - RGB：`rgb(255, 102, 204)`
  - RGB 數值：`255 102 204`
  - 顏色名稱：`pink`
- 若相同顏色的 role 已存在，應重用既有 role
- 若不存在，Yuzu 可自動建立新的 color role
- 使用者可查詢或清除自己的 color role
- 若顏色格式錯誤、權限不足或 role hierarchy 不允許，需安全失敗，不得使 bot crash
- Color role 建立、重用、分配、清除與設定變更需記錄 log

權限需求：

- 一般使用者可設定自己的 color role
- Guild 管理員可啟用、停用與調整此功能
- Bot 需具備管理身份組所需權限
