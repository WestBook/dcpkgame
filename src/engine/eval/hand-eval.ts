import { Card, Rank } from '@/types/poker';

export type HandCategory =
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'One Pair'
  | 'High Card';

export interface HandEvaluation {
  category: HandCategory;
  /** Descending values used for tie-break comparison */
  tiebreak: number[];
}

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'T': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14
};

function rankNumber(card: Card): number {
  return RANK_VALUE[card.rank];
}

function isStraight(values: number[]): { straight: boolean; high: number } {
  const uniq = Array.from(new Set(values)).sort((a, b) => b - a);
  // Wheel check
  if (uniq.includes(14)) uniq.push(1);
  for (let i = 0; i <= uniq.length - 5; i++) {
    const window = uniq.slice(i, i + 5);
    if (window[0] - window[4] === 4) {
      return { straight: true, high: window[0] === 1 ? 5 : window[0] };
    }
  }
  return { straight: false, high: 0 };
}

function evaluateFive(cards: Card[]): HandEvaluation {
  const values = cards.map(rankNumber).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  const entries = Object.entries(counts).map(([v, cnt]) => ({ v: Number(v), cnt }));
  entries.sort((a, b) => b.cnt - a.cnt || b.v - a.v);

  const { straight, high: straightHigh } = isStraight(values);
  const isFlush = suits.every(s => s === suits[0]);

  if (straight && isFlush) {
    const category: HandCategory = straightHigh === 14 ? 'Royal Flush' : 'Straight Flush';
    return { category, tiebreak: [straightHigh] };
  }

  if (entries[0]?.cnt === 4) {
    const four = entries[0].v;
    const kicker = entries.find(e => e.cnt === 1)?.v ?? 0;
    return { category: 'Four of a Kind', tiebreak: [four, kicker] };
  }

  if (entries[0]?.cnt === 3 && entries[1]?.cnt === 2) {
    return { category: 'Full House', tiebreak: [entries[0].v, entries[1].v] };
  }

  if (isFlush) {
    return { category: 'Flush', tiebreak: values.slice(0, 5) };
  }

  if (straight) {
    return { category: 'Straight', tiebreak: [straightHigh] };
  }

  if (entries[0]?.cnt === 3) {
    const trips = entries[0].v;
    const kickers = entries.filter(e => e.cnt === 1).map(e => e.v).sort((a, b) => b - a).slice(0, 2);
    return { category: 'Three of a Kind', tiebreak: [trips, ...kickers] };
  }

  if (entries[0]?.cnt === 2 && entries[1]?.cnt === 2) {
    const highPair = Math.max(entries[0].v, entries[1].v);
    const lowPair = Math.min(entries[0].v, entries[1].v);
    const kicker = entries.find(e => e.cnt === 1)?.v ?? 0;
    return { category: 'Two Pair', tiebreak: [highPair, lowPair, kicker] };
  }

  if (entries[0]?.cnt === 2) {
    const pair = entries[0].v;
    const kickers = entries.filter(e => e.cnt === 1).map(e => e.v).sort((a, b) => b - a).slice(0, 3);
    return { category: 'One Pair', tiebreak: [pair, ...kickers] };
  }

  return { category: 'High Card', tiebreak: values.slice(0, 5) };
}

export function compareEval(a: HandEvaluation, b: HandEvaluation): number {
  const order: HandCategory[] = [
    'High Card',
    'One Pair',
    'Two Pair',
    'Three of a Kind',
    'Straight',
    'Flush',
    'Full House',
    'Four of a Kind',
    'Straight Flush',
    'Royal Flush'
  ];
  const rankA = order.indexOf(a.category);
  const rankB = order.indexOf(b.category);
  if (rankA !== rankB) return rankA - rankB;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function evaluate7(cards: Card[]): HandEvaluation {
  if (cards.length < 5) throw new Error('Need at least 5 cards to evaluate');
  let best: HandEvaluation | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const eval5 = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareEval(eval5, best) > 0) {
              best = eval5;
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error('Evaluation failed');
  return best;
}

export function compareHands(a: Card[], b: Card[]): number {
  const evalA = evaluate7(a);
  const evalB = evaluate7(b);
  return compareEval(evalA, evalB);
}
