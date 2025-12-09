"use client";

import { Card as CardType } from '@/types/poker';

const suitColor: Record<CardType['suit'], string> = {
    '♠': 'text-slate-900',
    '♣': 'text-slate-900',
    '♥': 'text-red-500',
    '♦': 'text-red-500'
};

export function Card({ card, hidden = false }: { card?: CardType; hidden?: boolean }) {
    if (!card || hidden) {
        return (
            <div className="w-16 h-24 rounded-lg bg-slate-800 border border-slate-600 shadow-inner" />
        );
    }

    return (
        <div className="w-16 h-24 rounded-lg bg-white text-black shadow-lg border border-slate-200 flex flex-col justify-between p-2">
            <div className={`text-lg font-bold ${suitColor[card.suit]}`}>{card.rank}</div>
            <div className={`text-xl self-end ${suitColor[card.suit]}`}>{card.suit}</div>
        </div>
    );
}
