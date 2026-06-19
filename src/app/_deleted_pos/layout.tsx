import { type ReactNode } from 'react';
import Link from 'next/link';

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Topbar minimalis */}
      <header className="h-12 bg-indigo-700 text-white flex items-center justify-between px-4 shadow-md z-20">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg tracking-wide">BabyPOS <span className="text-indigo-300 font-normal">KASIR</span></h1>
          <div className="h-4 w-px bg-indigo-500 hidden sm:block"></div>
          <span className="text-xs text-indigo-200 hidden sm:block bg-indigo-800 px-2 py-0.5 rounded">Cabang Utama</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs font-medium bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded transition-colors border border-indigo-500">
            Kembali ke Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
