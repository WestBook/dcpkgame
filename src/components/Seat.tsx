"use client";

// Renders a single player's seat: name, chips, timers, hole cards, and last action.
// For a plain-language walkthrough, see docs/components-walkthrough.md.

import { Card } from './Card';
import { Player } from '@/types/poker';

interface SeatProps {
    player: Player;
    isCurrent: boolean;
    isDealer: boolean;
    showCards: boolean;
    timerSeconds?: number;
    lastAction?: string;
}

export function Seat({ player, isCurrent, isDealer, showCards, timerSeconds, lastAction }: SeatProps) {
    const border = isCurrent ? 'border-2 border-amber-400 shadow-amber-400/40' : 'border border-slate-600';
    return (
        <div className={`w-48 rounded-xl bg-slate-900/70 p-3 text-sm text-slate-100 ${border} shadow-lg flex flex-col gap-2`}>
            <div className="flex justify-between items-center text-[11px] text-emerald-200 mb-1">
                <span className="px-2 py-[2px] rounded bg-emerald-900/60 border border-emerald-500/40">
                    本局總注: {player.totalCommitted ?? 0}
                </span>
                {isCurrent && timerSeconds !== undefined && (
                    <span className="text-amber-200">{Math.ceil(timerSeconds)}s</span>
                )}
            </div>
            <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{player.name}</div>
                <div className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700">${player.chips}</div>
            </div>
            <div className="flex items-center gap-2">
                <Card card={player.holeCards[0]} hidden={!showCards} />
                <Card card={player.holeCards[1]} hidden={!showCards} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="capitalize">{lastAction || player.status}</div>
                {isDealer && <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-400 text-amber-200">D</span>}
                {player.currentBet > 0 && (
                    <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Bet: {player.currentBet}</span>
                )}
            </div>
        </div>
    );
}
