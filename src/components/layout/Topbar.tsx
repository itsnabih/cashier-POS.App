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
  const pageTitle = PAGE_TITLES[baseRoute] || 'BabyPOS';
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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <h1 className="font-semibold text-slate-900">{pageTitle}</h1>
        {subPageTitle && (
          <>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">{subPageTitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Online indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-400">Online</span>
        </div>

        {/* Role badge */}
        {user && (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {user.role.toUpperCase()}
          </span>
        )}
      </div>
    </header>
  );
}
