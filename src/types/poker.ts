export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out';

export interface Player {
  id: string;
  name: string;
  chips: number;
  seatIndex: number;
  holeCards: Card[];
  status: PlayerStatus;
  currentBet: number;
  totalCommitted?: number; // chips committed in current hand (for side pots)
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface TableState {
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
  roundStartPlayerIndex: number; // player who started current betting round
  currentBet: number;
  lastRaiseSize: number; // amount of the last raise increment
  isHandInProgress: boolean;

  // Track contributions per player for side-pot calculation
  commitments: Record<string, number>;
}

export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'all-in' };
