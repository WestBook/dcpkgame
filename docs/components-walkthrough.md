# Components Walkthrough (Plain Language)

這份說明用非程式背景的角度，解釋畫面上的主要元件：`Table`, `ActionBar`, `Seat`, `Card`。每個元件的檔案裡也有簡短註解，但完整文字版在這裡。

## Table (`src/components/Table.tsx`)

- **目的**：主控台。負責啟動新牌局、輪到誰行動、倒數計時、自動 NPC 行動、計算獲勝者、顯示公共牌與玩家座位。
- **狀態(state)**：
  - `state`：撲克桌的核心資料（玩家、籌碼、公共牌、當前下注、輪到誰等），由遊戲引擎提供。
  - `turnDeadline/now`：計算玩家剩餘思考秒數。
  - `intro`：開局時的覆蓋層（「洗牌中…」）。
  - `lastActions`：紀錄每位玩家上一個動作的文字（如 Fold、Call 20）。
  - `startChips`：記錄開局時每個人的籌碼，用來計算輸贏差額。
  - `winnerSummary/handTotals`：一局結束後，顯示誰贏了多少，以及每人本局總注與結算差額。
- **初始化**：`useEffect` 在第一次渲染時呼叫 `startWithIntro()`，把牌局進入「洗牌 → 發牌」流程。
- **自動行動(AI)**：另一個 `useEffect` 觀察當前玩家。若是電腦玩家且仍在牌局中，會在 2–5 秒後自動 Call 或 Check（若籌碼不足就 Fold）。
- **倒數計時**：`turnDeadline` 設為現在 +10 秒，並以 `setInterval` 每 300ms 檢查時間到則自動 Fold。
- **開始新局**：`startWithIntro()` 會顯示 intro、重置上一局的摘要，然後呼叫遊戲引擎的 `startHand` 重新發牌、放盲注。
- **結束一局**：偵測到 `state.isHandInProgress` 變為 false 時，計算每人籌碼差額，找出贏家，並把當局的總注、輸贏差額放進 `handTotals`，然後打開結果彈窗。
- **版面**：
  - 中央區域顯示公共牌與當前輪到誰。
  - 周圍以圓形排布多個 `Seat`。
  - 下方放 `ActionBar`（操作按鈕）、新局按鈕、盲注資訊。
  - 結算彈窗顯示你的輸贏、每位玩家的本局投入與結果。

## ActionBar (`src/components/ActionBar.tsx`)

- **目的**：玩家的操作按鈕列（Fold、Check、Call、Raise/Bet、All-in）。
- **回合判斷**：只有當前輪到你、且你仍在牌局中時，按鈕才可用。
- **金額邏輯**：
  - `toCall`：需要補齊的金額。
  - `minRaiseTotal`：規則要求的最小加注總額（上一個下注 + 最後加注大小）。
  - 輸入框可設定加注/下注金額；如果還沒有下注，按鈕顯示 Bet；已有底池時顯示 Raise。
- **行為**：點擊按鈕會觸發 `onAction`，把玩家的動作送給上層 `Table` 處理。

## Seat (`src/components/Seat.tsx`)

- **目的**：呈現單個玩家的座位資訊。
- **顯示內容**：
  - 「本局總注」：此局累計投入。
  - 倒數秒數：如果是當前行動者才會顯示。
  - 玩家名稱與剩餘籌碼。
  - 兩張底牌（未到攤牌時只有玩家本人可見）。
  - 上一次動作文字，莊家標記 (D)，以及當前未結算的下注 (Bet)。
- **狀態樣式**：輪到該玩家時，邊框會亮起。

## Card (`src/components/Card.tsx`)

- **目的**：顯示單張撲克牌或背面。
- **顯示邏輯**：
  - 沒有卡片或被設為 hidden 時，呈現牌背；
  - 否則顯示點數與花色，紅色花色用紅字，黑色用深色字。

---

若想快速追蹤對應程式碼，檔案開頭都有一段註解指向本說明。
