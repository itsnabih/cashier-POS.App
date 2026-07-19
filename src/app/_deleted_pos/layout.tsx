import { type ReactNode } from 'react';
import Link from 'next/link';

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-baby-900 flex flex-col">
      {/* Topbar minimalis */}
      <header className="h-12 bg-baby-700 text-white flex items-center justify-between px-4 shadow-md z-20">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg tracking-wide">BabyPOS <span className="text-baby-300 font-normal">KASIR</span></h1>
          <div className="h-4 w-px bg-baby-500 hidden sm:block"></div>
          <span className="text-xs text-baby-200 hidden sm:block bg-baby-800 px-2 py-0.5 rounded">Cabang Utama</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs font-medium bg-baby-600 hover:bg-baby-500 px-3 py-1.5 rounded transition-colors border border-baby-500">
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
