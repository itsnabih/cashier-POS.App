'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

// ============================================================
// Topbar — page header with breadcrumb + user context
// ============================================================

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Produk',
  '/categories': 'Kategori',
  '/suppliers': 'Supplier',
  '/purchases': 'Pembelian',
  '/stock-opname': 'Stok Opname',
  '/transactions': 'Transaksi',
  '/reports': 'Laporan',
  '/audit': 'Audit Log',
  '/settings': 'Pengaturan',
};

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const baseRoute = '/' + (pathname.split('/')[1] || '');
  const pageTitle = PAGE_TITLES[baseRoute] || 'Sumber Baby Shop';
  const isSubPage = pathname !== baseRoute && pathname !== baseRoute + '/';

  const subPageLabels: Record<string, string> = {
    '/new': 'Tambah Baru',
    '/edit': 'Edit',
  };

  let subPageTitle = '';
  if (isSubPage) {
    for (const [key, label] of Object.entries(subPageLabels)) {
      if (pathname.endsWith(key)) {
        subPageTitle = label;
        break;
      }
    }
  }

  return (
    <header className="h-16 glass-panel border-b border-sky-100 flex items-center justify-between px-6 flex-shrink-0 z-30 sticky top-0 shadow-sm shadow-sky-100/50">
      <div className="flex items-center gap-2 text-sm">
        <h1 className="font-bold text-slate-800 text-lg tracking-tight">{pageTitle}</h1>
        {subPageTitle && (
          <>
            <span className="text-sky-300 font-bold">/</span>
            <span className="text-slate-500 font-medium">{subPageTitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Online indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-semibold text-emerald-600">Online</span>
        </div>

        {/* Role badge */}
        {user && (
          <span className="text-xs font-bold text-brand-blue bg-brand-sky-light px-2.5 py-1.5 rounded-lg shadow-inner">
            {user.role.toUpperCase()}
          </span>
        )}
      </div>
    </header>
  );
}
