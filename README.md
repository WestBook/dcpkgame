# Texas Hold'em Web Poker (單桌本機版)

Next.js + TypeScript 客戶端德州撲克練習桌，內建簡易 AI、倒數計時與每局投入/結算顯示。所有邏輯在前端執行，方便本機練習與展示。

## 功能亮點

- 無限注德州撲克完整流程：發牌、下注輪、Side Pot、攤牌結算。
- 簡易 AI：2–5 秒內自動 Check/Call，籌碼不足則 Fold。
- 10 秒倒數：逾時自動 Fold。
- 每局總注與輸贏摘要：座位列出「本局總注」，結算彈窗呈現各玩家投入與盈虧。
- 一鍵重開：New Hand 觸發洗牌 intro，重置狀態並重新發盲注。
- RWD 介面：環形座位、漸層桌面、聚焦玩家操作列。

## 技術棧

- Next.js (App Router), React 18, TypeScript, TailwindCSS
- 無後端 / 無 WebSocket，狀態以 React hooks 管理

## 快速開始

```bash
npm install
npm run dev      # http://localhost:3000
```

## 指令

- `npm run dev`：開發伺服器
- `npm run build`：生產建置
- `npm run start`：啟動建置產物
- `npm run test`：以 ts-node 跑 `tests/table.test.ts`（檢查盲注/跟注的 totalCommitted 行為）

## 目錄概覽

```
src/
 ├─ app/         # Next.js 頁面與全域樣式
 ├─ components/  # Table, ActionBar, Seat, Card
 └─ engine/      # 發牌、下注、side pot、手牌評分
 docs/           # 元件解說、規格文件
 tests/          # ts-node 測試（totalCommitted 行為）
```

## 核心邏輯摘要

- `engine/table.ts`：發牌、盲注、輪替、加注規則、side pot 建立、Showdown 分池、莊家移動。
- `engine/deck.ts`：Fisher–Yates 洗牌。
- `engine/hand-evaluation.ts`：7 張取最佳五張的評分與比較。
- `components/Table.tsx`：掌控回合、AI/倒數、結算彈窗、座位排版。

## 預設設定

- 玩家：You, Alice, Bob, Carol, Dave, Eve，各 2000 籌碼
- 盲注：SB 10 / BB 20

## 更多資訊

- 完整規格：`TexasHoldemFullSpec.md`
- 非工程者元件說明：`docs/components-walkthrough.md`
