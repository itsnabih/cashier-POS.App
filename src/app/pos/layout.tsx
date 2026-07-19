import { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { PosUserMenu } from '@/components/pos/PosUserMenu';
import { PosClock } from '@/components/pos/PosClock';
import { PosNetworkStatus } from '@/components/pos/PosNetworkStatus';

export default async function PosLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const role = headersList.get('x-user-role') || '';
  const fullName = headersList.get('x-user-fullname') || 'User';

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen bg-baby-900 flex flex-col overflow-hidden overscroll-none select-none">
      {/* Topbar minimalis */}
      <header className="h-12 bg-baby-700 text-white flex items-center justify-between px-4 shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded">
              <Image src="/icons/Logo sumber baby shop.png" alt="Logo" width={24} height={24} className="object-contain drop-shadow-sm" />
            </div>
            <h1 className="font-bold text-lg tracking-wide">Sumber Baby Shop</h1>
          </div>
          <div className="h-4 w-px bg-baby-500 hidden sm:block"></div>
          <span className="text-xs text-baby-200 hidden sm:block bg-baby-800 px-2 py-0.5 rounded">Cabang Utama</span>
          <div className="h-4 w-px bg-baby-500 hidden md:block"></div>
          <PosClock />
          <div className="h-4 w-px bg-baby-500 hidden md:block"></div>
          <PosNetworkStatus />
        </div>
        <div className="flex items-center gap-3">
          {role !== 'kasir' && (
            <Link href="/dashboard" className="text-xs font-medium bg-baby-600 hover:bg-baby-500 px-3 py-1.5 rounded transition-colors border border-baby-500">
              Kembali ke Dashboard
            </Link>
          )}
          <PosUserMenu fullName={fullName} role={role} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
