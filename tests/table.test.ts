import assert from 'node:assert';
import { createTableState, startHand, applyAction } from '../src/engine/table';
import { PlayerAction } from '../src/types/poker';

// Sanity checks for totalCommitted tracking across pay/startHand flows
const base = createTableState({
  id: 't1',
  players: [
    { id: 'p1', name: 'Alice', chips: 100 },
    { id: 'p2', name: 'Bob', chips: 100 }
  ],
  smallBlind: 1,
  bigBlind: 2
});

const afterStart = startHand(base);
const sbIndex = afterStart.players.find(p => p.currentBet === 1)?.seatIndex ?? 0;
const bbIndex = afterStart.players.find(p => p.currentBet === 2)?.seatIndex ?? 1;

assert.strictEqual(afterStart.players[sbIndex].totalCommitted, 1, 'SB posts small blind');
assert.strictEqual(afterStart.players[bbIndex].totalCommitted, 2, 'BB posts big blind');

const callAction: PlayerAction = { type: 'call' };
const afterCall = applyAction(afterStart, callAction);
assert.strictEqual(afterCall.players[sbIndex].totalCommitted, 2, 'Call adds to total committed');

const nextHand = startHand(afterCall);
const nextSb = nextHand.players.find(p => p.currentBet === 1)?.seatIndex ?? 0;
const nextBb = nextHand.players.find(p => p.currentBet === 2)?.seatIndex ?? 1;
assert.strictEqual(nextHand.players[nextSb].totalCommitted, 1, 'New hand resets totals for SB');
assert.strictEqual(nextHand.players[nextBb].totalCommitted, 2, 'New hand resets totals for BB');

console.log('table.test.ts passed');
