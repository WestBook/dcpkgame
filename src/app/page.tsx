import { Table } from '@/components/Table';

export default function HomePage() {
    return (
        <main className="min-h-screen w-full flex items-center justify-center p-6">
            <div className="w-full max-w-6xl space-y-8">
                <header className="flex flex-col gap-4 bg-slate-900/70 border border-emerald-500/20 rounded-3xl p-6 shadow-xl backdrop-blur">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-200">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30">Practice Mode</span>
                        <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30">No rake • Instant resets</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl md:text-5xl font-semibold text-emerald-100 leading-tight">德州撲克桌</h1>
                        <p className="text-base md:text-lg text-slate-200 max-w-3xl">
                            練習下注節奏、盲注壓力與攤牌計算。隨時開新局、檢視每位玩家的本局總注與輸贏變化。
                        </p>
                    </div>
                </header>

                <div className="rounded-3xl border border-emerald-500/25 bg-slate-950/60 shadow-2xl p-4 md:p-6 backdrop-blur">
                    <Table />
                </div>
            </div>
        </main>
    );
}
