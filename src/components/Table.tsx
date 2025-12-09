"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar } from './ActionBar';
import { Seat } from './Seat';
import { Card } from './Card';
import { PlayerAction, TableState } from '@/types/poker';
import { applyAction, createTableState, startHand } from '@/engine/table';

const DEFAULT_PLAYERS = [
    { id: 'p1', name: 'You', chips: 2000 },
    { id: 'p2', name: 'Alice', chips: 2000 },
    { id: 'p3', name: 'Bob', chips: 2000 },
    { id: 'p4', name: 'Carol', chips: 2000 },
    { id: 'p5', name: 'Dave', chips: 2000 },
    { id: 'p6', name: 'Eve', chips: 2000 }
];

export function Table() {
    const [state, setState] = useState<TableState>(() =>
        createTableState({ id: 'table-1', players: DEFAULT_PLAYERS, smallBlind: 10, bigBlind: 20 })
    );
    const [autoStartDone, setAutoStartDone] = useState(false);
    const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
    const [intro, setIntro] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [lastActions, setLastActions] = useState<Record<string, string>>({});
    const [showEndModal, setShowEndModal] = useState(false);
    const [startChips, setStartChips] = useState<Record<string, number>>({});
    const [winnerSummary, setWinnerSummary] = useState<{ winners: { id: string; name: string; delta: number }[]; heroDelta: number }>({ winners: [], heroDelta: 0 });
    const [handTotals, setHandTotals] = useState<{ id: string; name: string; totalCommitted: number; delta: number }[]>([]);
    const prevInProgress = useRef(false);

    // Tick for countdown display
    useEffect(() => {
        if (!turnDeadline || !state.isHandInProgress) return;
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, [turnDeadline, state.isHandInProgress]);

    // Very simple auto action for AIs (random 2-5s delay)
    useEffect(() => {
        const current = state.players[state.currentPlayerIndex];
        if (!state.isHandInProgress || intro) return;
        if (!current || current.id === 'p1' || current.status !== 'active') return;

        const toCall = Math.max(0, state.currentBet - current.currentBet);
        const act = () => {
            const action: PlayerAction = toCall === 0 ? { type: 'check' } : current.chips >= toCall ? { type: 'call' } : { type: 'fold' };
            dispatchActionWithLabel(action);
        };

        const delay = 2000 + Math.random() * 3000;
        const id = setTimeout(act, delay);
        return () => clearTimeout(id);
    }, [state, intro]);

    // Turn timer: 10s auto-fold
    useEffect(() => {
        if (!state.isHandInProgress || intro) return;
        const current = state.players[state.currentPlayerIndex];
        if (!current || current.status !== 'active') return;

        const deadline = Date.now() + 10_000;
        setTurnDeadline(deadline);

        const tick = setInterval(() => {
            if (Date.now() >= deadline) {
                dispatchActionWithLabel({ type: 'fold' });
            }
        }, 300);

        return () => clearInterval(tick);
    }, [state.currentPlayerIndex, state.isHandInProgress, intro, state.players]);

    useEffect(() => {
        if (!autoStartDone) {
            startWithIntro();
            setAutoStartDone(true);
        }
    }, [autoStartDone]);

    const startWithIntro = () => {
        setIntro(true);
        setTimeout(() => {
            setState(s => {
                const nextSnapshot = startHand(s);
                const chipsMap: Record<string, number> = {};
                nextSnapshot.players.forEach((p) => {
                    chipsMap[p.id] = p.chips;
                });
                setStartChips(chipsMap);
                return nextSnapshot;
            });
            setIntro(false);
            setShowEndModal(false);
            setLastActions({});
            setWinnerSummary({ winners: [], heroDelta: 0 });
            setHandTotals([]);
        }, 1200);
    };

    // Track hand end to show modal
    useEffect(() => {
        if (prevInProgress.current && !state.isHandInProgress) {
            // compute winner summary
            const deltas = state.players.map(p => ({ id: p.id, name: p.name, delta: p.chips - (startChips[p.id] ?? p.chips) }));
            const maxDelta = Math.max(...deltas.map(d => d.delta));
            const winners = deltas.filter(d => d.delta === maxDelta && maxDelta > 0);
            const hero = deltas.find(d => d.id === 'p1');
            setWinnerSummary({ winners, heroDelta: hero?.delta ?? 0 });
            const totals = state.players.map(p => ({
                id: p.id,
                name: p.name,
                totalCommitted: p.totalCommitted ?? 0,
                delta: p.chips - (startChips[p.id] ?? p.chips)
            }));
            setHandTotals(totals);
            setShowEndModal(true);
        }
        prevInProgress.current = state.isHandInProgress;
    }, [state.isHandInProgress, state.players, startChips]);

    const labelForAction = (playerId: string, action: PlayerAction, snap: TableState): string => {
        const player = snap.players.find(p => p.id === playerId);
        if (!player) return '';
        const toCall = Math.max(0, snap.currentBet - player.currentBet);
        switch (action.type) {
            case 'fold':
                return 'Fold';
            case 'check':
                return 'Check';
            case 'call':
                return `Call ${toCall}`;
            case 'bet':
                return `Bet ${action.amount}`;
            case 'raise':
                return `Raise ${action.amount}`;
            case 'all-in':
                return 'All-in';
            default:
                return '';
        }
    };

    const dispatchActionWithLabel = (action: PlayerAction) => {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const label = labelForAction(currentPlayer.id, action, state);
        if (label) {
            setLastActions(prev => ({ ...prev, [currentPlayer.id]: label }));
        }
        setState(prev => applyAction(prev, action));
    };

    const current = state.players[state.currentPlayerIndex];
    const potsTotal = useMemo(() => state.pots.reduce((a, p) => a + p.amount, 0), [state.pots]);

    const handleAction = (action: PlayerAction) => {
        dispatchActionWithLabel(action);
    };

    const positions = useMemo(() => {
        const n = state.players.length;
        const radius = 38; // percent of container radius for ring
        const startAngle = Math.PI / 2; // seatIndex 0 at bottom center
        return state.players.map((p, i) => {
            const angle = startAngle + (2 * Math.PI * i) / n; // clockwise around center starting from bottom
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);
            return { id: p.id, left: `${x}%`, top: `${y}%`, player: p };
        });
    }, [state.players]);

    const currentTimerSeconds = turnDeadline ? Math.max(0, (turnDeadline - now) / 1000) : undefined;

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="relative w-full rounded-3xl bg-gradient-to-br from-emerald-900/60 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 shadow-2xl min-h-[100vh]">
                <div className="absolute inset-0" aria-hidden>
                    <div className="absolute inset-0 bg-emerald-500/5 blur-3xl" />
                </div>

                <div className="relative w-full h-full min-h-[100vh]">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            {state.communityCards.map((c, idx) => (
                                <Card key={idx} card={c} />
                            ))}
                            {Array.from({ length: Math.max(0, 5 - state.communityCards.length) }).map((_, i) => (
                                <Card key={`empty-${i}`} />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-100 bg-slate-900/70 rounded-full px-3 py-1 border border-emerald-500/30">
                            <span>Round: {state.currentRound}</span>
                            <span>Pot: {potsTotal || 0}</span>
                            <span>To act: {current?.name ?? '-'}</span>
                        </div>
                    </div>

                    {positions.map(pos => (
                        <div
                            key={pos.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: pos.left, top: pos.top }}
                        >
                            <Seat
                                player={pos.player}
                                isCurrent={state.currentPlayerIndex === pos.player.seatIndex}
                                isDealer={state.dealerIndex === pos.player.seatIndex}
                                showCards={pos.player.id === 'p1' || (!state.isHandInProgress && state.currentRound === 'showdown')}
                                timerSeconds={state.currentPlayerIndex === pos.player.seatIndex ? currentTimerSeconds : undefined}
                                lastAction={lastActions[pos.player.id]}
                            />
                        </div>
                    ))}

                    {intro && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-2xl font-bold text-emerald-200 animate-pulse gap-2">
                            <div>遊戲開始</div>
                            <div className="text-base text-emerald-100">洗牌中…</div>
                        </div>
                    )}
                </div>
            </div>

            <ActionBar state={state} controlledPlayerId="p1" onAction={handleAction} />

            <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                    className="px-3 py-2 rounded bg-slate-800 border border-slate-600 hover:bg-slate-700"
                    onClick={startWithIntro}
                >
                    New Hand
                </button>
                <span>Small Blind {state.smallBlind}, Big Blind {state.bigBlind}</span>
            </div>

            {showEndModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-emerald-400/40 rounded-xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
                        <div className="text-xl font-bold text-emerald-200">本局結束</div>
                        {winnerSummary.heroDelta > 0 ? (
                            <p className="text-sm text-emerald-200">你贏了 {winnerSummary.heroDelta}</p>
                        ) : winnerSummary.heroDelta < 0 ? (
                            <div className="text-sm text-slate-200 space-y-1">
                                <div>你輸了 {Math.abs(winnerSummary.heroDelta)}</div>
                                {winnerSummary.winners.length > 0 && (
                                    <div>
                                        勝者：{winnerSummary.winners.map(w => `${w.name} +${w.delta}`).join('，')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-200">平分彩池</p>
                        )}
                        <div className="text-left text-xs text-slate-200 space-y-2">
                            <div className="text-sm font-semibold text-emerald-200">本局投入 / 結果</div>
                            <div className="space-y-1">
                                {handTotals.map(t => (
                                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2">
                                        <span className="font-semibold text-slate-100">{t.name}</span>
                                        <span className="text-slate-300">注 {t.totalCommitted}</span>
                                        <span className={t.delta > 0 ? 'text-emerald-200' : t.delta < 0 ? 'text-rose-200' : 'text-slate-200'}>
                                            {t.delta >= 0 ? `+${t.delta}` : t.delta}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm text-slate-200">要重新開始下一局嗎？</p>
                        <div className="flex justify-center gap-3">
                            <button
                                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                onClick={startWithIntro}
                            >
                                重新開始
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
                                onClick={() => setShowEndModal(false)}
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
