import { Table } from '@/components/Table';

export default function HomePage() {
    return (
        <main className="min-h-screen w-full flex items-center justify-center p-6">
            <div className="w-full max-w-6xl space-y-4">
                <h1 className="text-3xl font-bold text-emerald-200">德州撲克</h1>
                <Table />
            </div>
        </main>
    );
}
