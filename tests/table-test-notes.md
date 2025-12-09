# `table.test.ts` 測試說明

這個檔案用 `ts-node` 直接執行，目的是驗證德州撲克引擎中「本局總注」(`totalCommitted`) 的行為是否正確。測試流程與檢查點如下：

1. **建桌與盲注**

   - 呼叫 `createTableState` 建立 2 人桌、盲注 1/2，並用 `startHand` 開局。
   - 找出小盲與大盲的玩家（依 `currentBet` 為 1/2 判斷）。
   - 斷言：小盲的 `totalCommitted` 為 1，大盲為 2，確保盲注有被計入本局總注。

2. **跟注累積**

   - 讓小盲玩家做 `call`，補齊到與大盲相同的下注量。
   - 斷言：小盲的 `totalCommitted` 變成 2，確認跟注會累積到本局總注。

3. **新局重置**
   - 再呼叫一次 `startHand` 開啟新的一局。
   - 重新辨識新局的小盲/大盲，檢查各自的 `totalCommitted`。
   - 斷言：新局小盲 `totalCommitted` 為 1、大盲為 2，確認每局開始時會重新歸零再計入盲注。

測試最後印出 `table.test.ts passed`，代表上述三個場景皆通過。
