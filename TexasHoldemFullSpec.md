# 德州撲克（Texas Hold’em）Web 遊戲規格文件 — 現行專案版

_Next.js + TypeScript 單頁桌面/行動體驗，內建簡易 AI 與單桌本地邏輯_

---

## 1. 專案概要（Overview）

**專案名稱**：Texas Hold’em Web Poker（本機單桌版）  
**技術棧**：Next.js App Router、TypeScript、TailwindCSS、React hooks（無後端 / 無 WebSocket）  
**狀態管理**：以 React `useState` / `useEffect` 為主，無外部狀態庫  
**玩法**：無限注德州撲克（No-Limit Texas Hold’em）  
**玩家數**：預設 6 席（`You` + 5 位簡易 AI），邏輯支援 2+ 人  
**運作範圍**：純前端模擬，所有邏輯在瀏覽器端執行；非多人連線版本

---

## 2. 遊戲規則（Game Rules）

### 2.1 牌組規則

- 標準 52 張牌，無鬼牌。
- 每位玩家 2 張底牌（Hole Cards）。
- 公共牌最多 5 張，分 Flop(3) / Turn(1) / River(1)。

### 2.2 目標

- 使用底牌 + 公共牌任意組合取最佳五張；或可直接「全用公共牌」。
- Showdown 比牌決勝；若場上僅剩 1 名未棄牌，直接獲勝。

### 2.3 牌型排名（高 → 低）

皇家同花順、同花順、四條、葫蘆、同花、順子、三條、兩對、一對、高牌。  
平手：比主牌 → 踢腳牌；完全相同則平分彩池。

---

## 3. 下注結構（No-Limit）

- 位置：莊家（BTN）、小盲（SB）、大盲（BB）。
- 預設盲注：SB 10 / BB 20（可在程式初始化調整）。
- 最小加注：前一個「加注額的差值」。
- All-in：隨時可宣告，籌碼不足形成 side pot。

---

## 4. 玩家行動

| 行動   | 條件         | 說明                                   |
| ------ | ------------ | -------------------------------------- |
| Fold   | 隨時可用     | 放棄本局                               |
| Check  | 本輪無需補錢 | 保持注額不變，轉給下一位               |
| Call   | 場上有下注   | 補齊到目前最高注                       |
| Bet    | 本輪無人下注 | 建立新注額                             |
| Raise  | 本輪有人下注 | 在 Call 基礎上加更多錢（遵守最小加注） |
| All-in | 隨時可用     | 壓上全部籌碼                           |

---

## 5. 遊戲流程（單桌單手）

```
Init Table → Start Hand → 發底牌
 → Preflop 下注
 → 發 Flop → Flop 下注
 → 發 Turn → Turn 下注
 → 發 River → River 下注
 → Showdown / 只剩一人 → 結算
 → 庄家右移到下一個有效玩家 → 下一手
```

附加行為：

- AI（非玩家座位）在 2–5 秒內自動行動：若可 Check 則 Check；若需補注且籌碼足夠則 Call；不足則 Fold（不會主動 Bet/Raise/Bluff）。
- 行動計時 10 秒，超時自動 Fold。
- 點擊「New Hand」：顯示 intro（約 1.2 秒），重置 lastActions、winnerSummary、handTotals，呼叫 `startHand` 重新發牌並放盲注。

---

## 6. 下注輪結束條件

- 場上只剩 1 名未棄牌 → 直接結束。
- 所有仍在局內的玩家，其 `currentBet` 已等於桌面 `currentBet`，或狀態為 All-in。
- 行動回到最後加注者（last aggressor），或無下一個可行動玩家。
- 若所有玩家皆非 `active`（都 all-in / fold），自動補發公共牌至 River 後進入 Showdown。

---

## 7. 輪替邏輯

- 可行動：`status === 'active'` 且 `chips > 0`。
- 下一位：從當前索引往後找下一個符合可行動的玩家（循環查找）。
- 無可行動者：直接判定下注輪完成並推進回合 / Showdown。

---

## 8. 資料結構（依實作）

### 8.1 主要型別（`src/types/poker.ts`）

- `Card { suit, rank }`
- `Player { id, name, chips, seatIndex, holeCards, status, currentBet, totalCommitted }`（`totalCommitted` 為本局累計投入，用於顯示與 side pot 計算）
- `Pot { amount, eligiblePlayerIds }`
- `TableState { players, deck, communityCards, pots, dealerIndex, smallBlind, bigBlind, currentRound, currentPlayerIndex, roundStartPlayerIndex, lastAggressorIndex, currentBet, lastRaiseSize, isHandInProgress, commitments }`
  - `roundStartPlayerIndex`：本輪第一個行動者，用於判定輪完結。
  - `lastRaiseSize`：上一個加注的增量（決定最小再加注額）。
  - `commitments`：每位玩家對彩池的累計，用於 side pot 拆分。
- `PlayerAction` union：fold / check / call / bet / raise / all-in。

### 8.2 檔案與模組

- `src/engine/table.ts`：核心狀態機（發牌、輪替、下注、side pot、showdown、莊家移動）。
- `src/engine/deck.ts`：洗牌（Fisher–Yates）。
- `src/engine/hand-evaluation.ts` + `eval/hand-eval`：7 張取最佳五張評分與比較。
- `src/components/Table.tsx`：主畫面、回合控制、AI、自動倒數、結算彈窗、座位排版。
- `src/components/ActionBar.tsx`：玩家操作按鈕列。
- `src/components/Seat.tsx`：單一座位資訊（本局總注、倒數、下注、身份）。
- `src/components/Card.tsx`：單張撲克牌顯示。
- `docs/components-walkthrough.md`：給非工程人員的元件解說。
- `tests/table.test.ts`：以 `ts-node` 驗證盲注、跟注、換手時 `totalCommitted` 累計/重置行為。

### 8.3 目錄結構（現況）

```
src/
 ├─ app/
 │   ├─ page.tsx
 │   └─ globals.css
 ├─ components/
 │   ├─ ActionBar.tsx
 │   ├─ Card.tsx
 │   ├─ Seat.tsx
 │   └─ Table.tsx
 └─ engine/
     ├─ deck.ts
     ├─ game.ts (unused in UI)
     ├─ game/hand-evaluation.ts
     ├─ game/types.ts
     └─ table.ts
```

（另有 `docs/`, `tests/`, `public/` 等）

---

## 9. UI / UX（現行）

- 單頁桌面/行動 RWD：中央公共牌，座位環形排列，背景漸層桌面風格。
- 座位排版：半徑約 38% 的圓環，起點在畫面下方中央，順時針排 seatIndex。
- `ActionBar` 固定在桌面下方，僅在輪到玩家且仍在局內時可互動。
- 倒數計時顯示在當前行動者座位；超時自動 Fold。
- 簡易 AI 自動行動，節奏 2–5 秒。
- 結算彈窗顯示：你的贏/輸、所有玩家的「本局總注」與籌碼差額。
- 「New Hand」按鈕可立即重開一局；intro 層提示洗牌中。

---

## 10. 非功能與限制

- **單機版**：無多人連線、無伺服器同步；邏輯全在前端記憶體，重新整理即重置。
- **效能**：桌面與行動皆可流暢運作；狀態量小，無特別性能瓶頸。
- **安全**：為教學/練習用途，未實作防作弊機制。
- **預設參數**：玩家 6 位（You, Alice, Bob, Carol, Dave, Eve），各 2000 籌碼；盲注 10/20；色彩與字體採現行 `globals.css`（Space Grotesk/IBM Plex Sans）。

---

## 11. 已知行為與簡化

- AI 僅支援基本 Check/Call/Fold；不會主動加注或 bluff。
- 單桌單手流程，不含牌局歷史、重播、斷線重連。
- 無籌碼買入/加碼流程，只有預設起始籌碼。
- 接受條件（最小驗收）：
  - 盲注入池後，小盲/大盲的 `totalCommitted` 正確累計。
  - 玩家跟注會累計 `totalCommitted`，並在換手時重置為盲注金額。
  - 超時 10 秒自動 Fold；AI 會在 2–5 秒內完成行動；所有玩家 all-in 時自動補公共牌到 River 並攤牌。

---

## 12. 後續可延伸方向

- 真正多人連線（WebSocket + 後端同步、權威狀態）。
- 更聰明的 AI（加注/風險偏好）。
- Hand history / 重播 / 匯出牌譜。
- 籌碼管理與換桌大廳、排隊機制。
- 動畫與音效強化。

---

# END
