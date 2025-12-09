# 德州撲克（Texas Hold’em）Web 遊戲規格文件  
*Next.js + TypeScript 全版實作規格*

---

## 1. 專案概要（Overview）

**專案名稱**：Texas Hold’em Web Poker  
**技術棧（Tech Stack）**：  
- 前端框架：Next.js（App Router）  
- 語言：TypeScript  
- 即時通訊：WebSocket  
- 狀態管理：React Context / Zustand / Redux  
- 介面：RWD 響應式介面  

**遊戲類型**：無限注德州撲克（No-Limit Texas Hold’em）  
**每桌玩家數量**：2–9 人  

---

## 2. 遊戲規則規格（Game Rules Specification）

### 2.1 牌組規則（Card Rules）
- 使用標準 **52 張撲克牌**  
- 無鬼牌  
- 每位玩家發 **2 張底牌（Hole Cards）**  
- 公共牌最多 **5 張**，分 3 個階段發出：  
  - Flop：3 張  
  - Turn：1 張  
  - River：1 張  

### 2.2 遊戲目標（Game Goal）
玩家需利用：
- **底牌 + 公共牌** 的任意組合（取最佳五張）  
- 或完全使用公共牌（Play the Board）  

於 **Showdown（攤牌）** 比較牌型決勝。  
若只剩 1 名玩家未棄牌 → 直接獲勝。

---

### 2.3 牌型排名（Hand Rankings，高 → 低）
1. **皇家同花順（Royal Flush）**  
2. **同花順（Straight Flush）**  
3. **四條（Four of a Kind）**  
4. **葫蘆（Full House）**  
5. **同花（Flush）**  
6. **順子（Straight）**  
7. **三條（Three of a Kind）**  
8. **兩對（Two Pair）**  
9. **一對（One Pair）**  
10. **高牌（High Card）**

**平手規則（Tie-breaking）**：  
- 比牌型 → 主牌 → 踢腳牌（Kicker）  
- 全部相同則平分彩池（Split Pot）

---

## 3. 下注結構（No-Limit Betting Structure）

### 3.1 座位角色（Positions）
- 按鈕位（Dealer Button, BTN）  
- 小盲（Small Blind, SB）  
- 大盲（Big Blind, BB）

### 3.2 最小加注規則
- Preflop / Post-flop：  
  最小加注額 = 前次 **加注額的差值**

### 3.3 All-in 規則
- 玩家可隨時 All-in  
- 若金額無法完整跟注 → 形成 Side Pot

---

## 4. 玩家可用行動

| 行動 | 條件 | 說明 |
|------|------|------|
| **Fold** | 隨時可用 | 放棄本局遊戲 |
| **Check** | 無人下注 | 不加錢，讓行動往下位移 |
| **Call** | 場上有下注 | 補齊至最高下注額 |
| **Bet** | 本輪無人下注 | 下新注 |
| **Raise** | 本輪有人下注 | 在 Call 基礎上加更多錢 |
| **All-in** | 隨時可用 | 壓上全部籌碼 |

---

## 5. 遊戲流程（Game Flow）

```
Init Hand
 → Deal Hole Cards
 → Preflop Betting
 → Deal Flop
 → Flop Betting
 → Deal Turn
 → Turn Betting
 → Deal River
 → River Betting
 → Showdown
 → Hand End → Dealer 移動 → Next Hand
```

---

## 6. 下注輪結束條件（Betting Round Completion）

下注輪結束必須符合：

### **條件 1：至少 2 名玩家仍在局內**  
若剩 1 人 → 本局直接結束。

### **條件 2：所有玩家已完成跟注或 All-in**
- `player.currentBet == currentBet`  
或  
- `player.status == all-in`

### **條件 3：輪回最後加注者（lastAggressor）**
當行動回到最後加注者 → 該輪結束。

---

## 7. 玩家輪替邏輯（Turn Rotation）

### 7.1 可行動玩家條件
- status = `active`  
- chips > 0  
- 非 folded / out / all-in  

### 7.2 輪替方式
```
next = (currentIndex + 1) % players.length
```
若玩家不具行動資格 → 跳過。

---

## 8. 系統架構（System Architecture）

### 8.1 推薦目錄結構
```
src/
 ├─ app/
 │   ├─ page.tsx
 │   ├─ table/[tableId]/page.tsx
 │   └─ api/table/[tableId]/route.ts
 ├─ engine/
 │   ├─ table.ts
 │   ├─ actions.ts
 │   ├─ player.ts
 │   ├─ round.ts
 │   └─ eval/
 ├─ types/
 │   └─ poker.ts
 └─ utils/
     └─ shuffle.ts
```

---

## 9. TypeScript 型別結構（完整）

### 9.1 Card
```ts
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A';

interface Card {
  suit: Suit;
  rank: Rank;
}
```

### 9.2 Player
```ts
type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out';

interface Player {
  id: string;
  name: string;
  chips: number;
  seatIndex: number;

  holeCards: Card[];
  status: PlayerStatus;

  currentBet: number;
}
```

### 9.3 Pot
```ts
interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}
```

### 9.4 TableState（完整）
```ts
type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

interface TableState {
  id: string;

  players: Player[];
  deck: Card[];
  communityCards: Card[];
  pots: Pot[];

  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;

  currentRound: BettingRound;
  currentPlayerIndex: number;
  lastAggressorIndex: number | null;
  currentBet: number;

  isHandInProgress: boolean;
}
```

---

## 10. 遊戲引擎邏輯（Game Engine Logic）

### 10.1 輪替函式
```ts
function getNextPlayerIndex(state: TableState, from: number): number | null;
```

### 10.2 行動 Reducer（applyAction）
```ts
function applyAction(state: TableState, action: PlayerAction): TableState;
```

功能包含：
- 驗證行動  
- 更新：
  - 玩家籌碼  
  - 狀態（folded / all-in）  
  - currentBet / currentBet  
  - lastAggressor  
- 判斷下注輪是否結束  
- 判斷整局是否結束  

---

## 11. UI / UX 需求

### 11.1 UI 元件
- 撲克牌桌  
- 玩家座位（包含籌碼、底牌、狀態）  
- 公共牌  
- 操作按鈕區（Fold / Check / Call / Raise / Bet / All-in）  
- 籌碼動畫  
- 行動 Log  

### 11.2 RWD 設計
- 手機：優先顯示玩家 + 公共牌  
- 桌機：完整展示所有座位  

---

## 12. 非功能需求（Non-functional Requirements）

### 12.1 效能
- 單次狀態更新 < 100ms  
- 洗牌須使用 Fisher-Yates，並於後端執行  

### 12.2 安全性
- 禁止前端執行核心邏輯  
- 不得讓使用者操控洗牌或牌型判定  

### 12.3 擴充性
可加入：
- 多桌大廳  
- 玩家排行  
- AI Bot  
- 教學模式  

---

## 13. 未來功能（Future Enhancements）
- 斷線重連  
- 回放系統（Hand History）  
- 動畫強化與特效  

---

# END
