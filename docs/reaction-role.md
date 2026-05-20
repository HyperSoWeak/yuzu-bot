## Reaction / Button Role

Reaction / Button role 讓管理員可以設定指定訊息上的 reaction 或 button，使用者互動後會自動取得或移除對應身份組。

需求：

- 每個 guild 可設定是否啟用 reaction / button role
- 管理員可指定某則訊息作為 role menu
- 管理員可設定每個 reaction 或 button 對應的身份組
- 使用者對指定訊息按下 reaction 或 button 後，Yuzu 會 assign 對應身份組
- 使用者移除 reaction，或再次切換按鈕狀態時，Yuzu 會移除對應身份組
- 同一則訊息可設定多個 reaction / button 與多個身份組
- 設定必須持久化保存，bot 重啟後仍需繼續追蹤既有 role menu
- Bot 啟動時需載入既有 reaction / button role 設定
- 若訊息、頻道或身份組不存在，需安全失敗，不得使 bot crash
- 若權限不足或 role hierarchy 不允許，需安全失敗，不得使 bot crash
- 設定變更與 role assign / remove 結果需記錄 log

權限需求：

- 一般使用者可透過 reaction 或 button 取得 / 移除身份組
- Guild 管理員可管理 reaction / button role 設定
- Bot 需具備讀取訊息、管理身份組，以及處理 reaction 或 interaction 所需權限

範例：

```txt
🍎 -> Role A
🍋 -> Role B
🍇 -> Role C
```
