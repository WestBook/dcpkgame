import { Card, Player, PlayerAction, PlayerStatus, TableState, BettingRound } from '@/types/poker';
import { createShuffledDeck } from './deck';
import { evaluate7, compareEval } from './eval/hand-eval';

function cloneState(state: TableState): TableState {
  return JSON.parse(JSON.stringify(state)) as TableState;
}

function nextActiveIndex(state: TableState, from: number): number | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    const p = state.players[idx];
    if (p.status === 'active' && p.chips > 0) return idx;
  }
  return null;
}

function countLivePlayers(state: TableState): number {
  return state.players.filter(p => p.status !== 'folded' && p.status !== 'out').length;
}

function buildSidePots(state: TableState): void {
  const contributions: Record<string, number> = { ...state.commitments };
  const pots: { amount: number; eligiblePlayerIds: string[] }[] = [];

  while (true) {
    const positive = Object.values(contributions).filter(v => v > 0);
    if (positive.length === 0) break;
    const min = Math.min(...positive);
    const involvedIds = Object.entries(contributions)
      .filter(([, v]) => v > 0)
      .map(([id]) => id);
    const eligibleIds = state.players
      .filter(p => involvedIds.includes(p.id) && p.status !== 'folded' && p.status !== 'out')
      .map(p => p.id);
    const potAmount = min * involvedIds.length;
    pots.push({ amount: potAmount, eligiblePlayerIds: eligibleIds });
    for (const id of involvedIds) {
      contributions[id] -= min;
    }
  }

  state.pots = pots;
}

function awardSingleWinner(state: TableState): TableState {
  const live = state.players.filter(p => p.status !== 'folded' && p.status !== 'out');
  if (live.length === 1) {
    const winner = live[0];
    const total = Object.values(state.commitments).reduce((a, b) => a + b, 0);
    winner.chips += total;
    state.commitments = {};
    state.isHandInProgress = false;
  }
  return state;
}

function showdown(state: TableState): TableState {
  buildSidePots(state);
  const community = state.communityCards;

  for (const pot of state.pots) {
    if (pot.eligiblePlayerIds.length === 0) continue;
    const contenders = state.players.filter(p => pot.eligiblePlayerIds.includes(p.id));
    let bestEval: ReturnType<typeof evaluate7> | null = null;
    let winners: Player[] = [];
    for (const p of contenders) {
      const evalHand = evaluate7([...p.holeCards, ...community]);
      if (!bestEval || compareEval(evalHand, bestEval) > 0) {
        bestEval = evalHand;
        winners = [p];
      } else if (compareEval(evalHand, bestEval) === 0) {
        winners.push(p);
      }
    }
    winners.sort((a, b) => a.seatIndex - b.seatIndex);
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    winners.forEach((w, idx) => {
      w.chips += share + (remainder > 0 && idx === 0 ? remainder : 0);
    });
  }

  state.isHandInProgress = false;
  return state;
}

function dealCommunity(state: TableState, count: number) {
  for (let i = 0; i < count; i++) {
    const card = state.deck.pop();
    if (card) state.communityCards.push(card);
  }
}

function advanceRound(state: TableState): TableState {
  if (state.currentRound === 'preflop') {
    dealCommunity(state, 3);
    state.currentRound = 'flop';
  } else if (state.currentRound === 'flop') {
    dealCommunity(state, 1);
    state.currentRound = 'turn';
  } else if (state.currentRound === 'turn') {
    dealCommunity(state, 1);
    state.currentRound = 'river';
  } else if (state.currentRound === 'river') {
    state.currentRound = 'showdown';
    return showdown(state);
  }

  state.players.forEach(p => (p.currentBet = 0));
  state.currentBet = 0;
  state.lastAggressorIndex = null;
  state.lastRaiseSize = state.bigBlind;

  const first = nextActiveIndex(state, state.dealerIndex);
  state.roundStartPlayerIndex = first ?? state.currentPlayerIndex;
  state.currentPlayerIndex = state.roundStartPlayerIndex;

  // If everyone all-in, skip betting and fast-forward to showdown
  const allAllIn = state.players.every(p => p.status !== 'active');
  if (allAllIn) {
    while (state.communityCards.length < 5) dealCommunity(state, 1);
    state.currentRound = 'showdown';
    return showdown(state);
  }

  return state;
}

function isBettingComplete(state: TableState, nextIndex: number | null): boolean {
  const live = state.players.filter(p => p.status !== 'folded' && p.status !== 'out');
  const activeCount = live.filter(p => p.status === 'active').length;
  if (live.length <= 1) return true;

  const unsettled = live.filter(p => p.status === 'active' && p.currentBet !== state.currentBet);
  if (unsettled.length > 0) return false;

  // If no next actor (all others are all-in/folded) the round is done
  if (nextIndex === null) return true;

  if (live.every(p => p.status === 'all-in') || activeCount <= 1) return true;
  if (state.lastAggressorIndex !== null && nextIndex === state.lastAggressorIndex) return true;
  if (state.lastAggressorIndex === null && nextIndex === state.roundStartPlayerIndex) return true;
  return false;
}

function moveToNextActorOrAdvance(state: TableState): TableState {
  let nextIdx = nextActiveIndex(state, state.currentPlayerIndex);

  // If no active player remains, finish the betting round / showdown
  if (nextIdx === null) {
    if (isBettingComplete(state, nextIdx)) {
      if (state.currentRound === 'river') return showdown(state);
      return advanceRound(state);
    }
    return state;
  }

  // Skip over any non-active seats defensively
  let safety = state.players.length;
  while (safety-- > 0 && state.players[nextIdx].status !== 'active') {
    nextIdx = nextActiveIndex(state, nextIdx) ?? nextIdx;
  }

  state.currentPlayerIndex = nextIdx;
  return state;
}

function pay(state: TableState, player: Player, amount: number) {
  const payAmount = Math.min(amount, player.chips);
  player.chips -= payAmount;
  player.currentBet += payAmount;
  player.totalCommitted = (player.totalCommitted ?? 0) + payAmount;
  state.commitments[player.id] = (state.commitments[player.id] ?? 0) + payAmount;
  if (player.chips === 0) {
    player.status = 'all-in';
  }
}

export function createTableState(params: {
  id: string;
  players: { id: string; name: string; chips: number }[];
  smallBlind: number;
  bigBlind: number;
}): TableState {
  const players: Player[] = params.players.map((p, idx) => ({
    id: p.id,
    name: p.name,
    chips: p.chips,
    seatIndex: idx,
    holeCards: [],
    status: p.chips > 0 ? 'active' : 'out',
    currentBet: 0,
    totalCommitted: 0
  }));

  return {
    id: params.id,
    players,
    deck: [],
    communityCards: [],
    pots: [],
    dealerIndex: -1,
    smallBlind: params.smallBlind,
    bigBlind: params.bigBlind,
    currentRound: 'preflop',
    currentPlayerIndex: 0,
    roundStartPlayerIndex: 0,
    lastAggressorIndex: null,
    currentBet: 0,
    lastRaiseSize: params.bigBlind,
    isHandInProgress: false,
    commitments: {}
  };
}

export function startHand(state: TableState): TableState {
  const nextState = cloneState(state);
  // reset statuses for players with chips
  nextState.players.forEach(p => {
    if (p.chips > 0) {
      p.status = 'active';
      p.holeCards = [];
      p.currentBet = 0;
      p.totalCommitted = 0;
    } else {
      p.status = 'out';
      p.holeCards = [];
      p.currentBet = 0;
      p.totalCommitted = 0;
    }
  });

  const activeSeats = nextState.players.filter(p => p.status !== 'out');
  if (activeSeats.length < 2) {
    nextState.isHandInProgress = false;
    return nextState;
  }

  // move dealer to next active
  const n = nextState.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (nextState.dealerIndex + i) % n;
    if (nextState.players[idx].status !== 'out') {
      nextState.dealerIndex = idx;
      break;
    }
  }

  nextState.deck = createShuffledDeck();
  nextState.communityCards = [];
  nextState.pots = [];
  nextState.commitments = {};
  nextState.currentRound = 'preflop';
  nextState.lastAggressorIndex = null;
  nextState.lastRaiseSize = nextState.bigBlind;
  nextState.isHandInProgress = true;

  // blinds
  const sbIndex = nextActiveIndex(nextState, nextState.dealerIndex) ?? 0;
  const bbIndex = nextActiveIndex(nextState, sbIndex) ?? sbIndex;
  const sb = nextState.players[sbIndex];
  const bb = nextState.players[bbIndex];
  pay(nextState, sb, nextState.smallBlind);
  pay(nextState, bb, nextState.bigBlind);
  nextState.currentBet = bb.currentBet;
  nextState.lastAggressorIndex = bbIndex;

  // deal hole cards
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < nextState.players.length; i++) {
      const idx = (nextState.dealerIndex + 1 + i) % nextState.players.length;
      const p = nextState.players[idx];
      if (p.status === 'active' || p.status === 'all-in') {
        const card = nextState.deck.pop();
        if (card) p.holeCards.push(card);
      }
    }
  }

  const firstToAct = nextActiveIndex(nextState, bbIndex) ?? bbIndex;
  nextState.currentPlayerIndex = firstToAct;
  nextState.roundStartPlayerIndex = firstToAct;

  return nextState;
}

export function applyAction(state: TableState, action: PlayerAction): TableState {
  if (!state.isHandInProgress) return state;
  const nextState = cloneState(state);
  const player = nextState.players[nextState.currentPlayerIndex];
  if (player.status !== 'active') {
    return moveToNextActorOrAdvance(nextState);
  }

  const toCall = nextState.currentBet - player.currentBet;

  switch (action.type) {
    case 'fold': {
      player.status = 'folded';
      break;
    }
    case 'check': {
      if (nextState.currentBet !== player.currentBet) return state;
      break;
    }
    case 'call': {
      if (toCall <= 0) return state;
      pay(nextState, player, toCall);
      break;
    }
    case 'bet': {
      if (nextState.currentBet !== 0) return state;
      const amt = action.amount;
      if (amt < nextState.bigBlind) return state;
      pay(nextState, player, amt);
      nextState.currentBet = player.currentBet;
      nextState.lastAggressorIndex = nextState.currentPlayerIndex;
      nextState.lastRaiseSize = amt;
      break;
    }
    case 'raise': {
      if (nextState.currentBet === 0) return state;
      const desiredTotal = action.amount;
      const minTotal = nextState.currentBet + nextState.lastRaiseSize;
      const additional = desiredTotal - player.currentBet;
      if (additional <= 0) return state;
      if (player.chips + player.currentBet < desiredTotal) {
        // all-in short raise; treat as call if below min raise threshold
        pay(nextState, player, player.chips);
        if (desiredTotal >= minTotal) {
          nextState.lastAggressorIndex = nextState.currentPlayerIndex;
          nextState.lastRaiseSize = desiredTotal - nextState.currentBet;
          nextState.currentBet = desiredTotal;
        }
      } else {
        if (desiredTotal < minTotal) return state;
        pay(nextState, player, additional);
        nextState.lastAggressorIndex = nextState.currentPlayerIndex;
        nextState.lastRaiseSize = desiredTotal - nextState.currentBet;
        nextState.currentBet = desiredTotal;
      }
      break;
    }
    case 'all-in': {
      const push = player.chips;
      const total = player.currentBet + push;
      pay(nextState, player, push);
      if (nextState.currentBet === 0) {
        nextState.currentBet = total;
        nextState.lastAggressorIndex = nextState.currentPlayerIndex;
        nextState.lastRaiseSize = total;
      } else if (total >= nextState.currentBet + nextState.lastRaiseSize) {
        nextState.lastAggressorIndex = nextState.currentPlayerIndex;
        nextState.lastRaiseSize = total - nextState.currentBet;
        nextState.currentBet = total;
      }
      break;
    }
    default:
      return state;
  }

  // Early win check
  if (countLivePlayers(nextState) === 1) {
    return awardSingleWinner(nextState);
  }

  const nextIdx = nextActiveIndex(nextState, nextState.currentPlayerIndex);

  if (isBettingComplete(nextState, nextIdx)) {
    if (nextState.currentRound === 'river') {
      // showdown
      return showdown(nextState);
    }
    return advanceRound(nextState);
  }

  nextState.currentPlayerIndex = nextIdx ?? nextState.currentPlayerIndex;
  return nextState;
}
