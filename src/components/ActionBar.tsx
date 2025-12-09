"use client";

// This bar holds all the buttons a human player can click (fold, check, call, raise, all-in).
// For a plain-language walkthrough, see docs/components-walkthrough.md.

import { useMemo, useState } from 'react';
import { PlayerAction, TableState } from '@/types/poker';

interface Props {
    state: TableState;
    controlledPlayerId: string;
    onAction: (action: PlayerAction) => void;
}

export function ActionBar({ state, controlledPlayerId, onAction }: Props) {
    const [amount, setAmount] = useState(state.bigBlind * 2);
    const current = state.players[state.currentPlayerIndex];
    const me = state.players.find(p => p.id === controlledPlayerId);

    // Only let the human act if it's their turn, they are still active, and the hand is running.
    const myTurn = current?.id === controlledPlayerId && current.status === 'active' && state.isHandInProgress;
    const toCall = Math.max(0, state.currentBet - (me?.currentBet ?? 0));
    const canCheck = toCall === 0;

    const minRaiseTotal = useMemo(() => {
        if (state.currentBet === 0) return state.bigBlind * 2;
        return state.currentBet + state.lastRaiseSize;
    }, [state.currentBet, state.bigBlind, state.lastRaiseSize]);

    const disabled = !myTurn;

    const safeAmount = Math.max(state.bigBlind, amount);

    return (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <button className={btn} disabled={disabled} onClick={() => onAction({ type: 'fold' })}>Fold</button>
            <button className={btn} disabled={disabled || !canCheck} onClick={() => onAction({ type: 'check' })}>Check</button>
            <button className={btn} disabled={disabled || toCall <= 0} onClick={() => onAction({ type: 'call' })}>Call {toCall}</button>
            <button className={btn} disabled={disabled || state.currentBet === 0 || (me?.chips ?? 0) + (me?.currentBet ?? 0) < minRaiseTotal}
                onClick={() => onAction({ type: 'raise', amount: Math.min(minRaiseTotal, (me?.currentBet ?? 0) + (me?.chips ?? 0)) })}>
                Min Raise {minRaiseTotal}
            </button>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded px-2 py-1">
                <input
                    type="number"
                    className="w-24 bg-transparent outline-none"
                    value={safeAmount}
                    min={state.bigBlind}
                    onChange={e => setAmount(Number(e.target.value))}
                />
                <button
                    className={btn}
                    disabled={disabled || (state.currentBet !== 0 && safeAmount < minRaiseTotal)}
                    onClick={() => onAction(state.currentBet === 0 ? { type: 'bet', amount: safeAmount } : { type: 'raise', amount: safeAmount })}
                >
                    {state.currentBet === 0 ? 'Bet' : 'Raise'}
                </button>
            </div>
            <button className={btn} disabled={disabled || (me?.chips ?? 0) <= 0} onClick={() => onAction({ type: 'all-in' })}>All-in</button>
        </div>
    );
}

const btn = 'px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold transition';
