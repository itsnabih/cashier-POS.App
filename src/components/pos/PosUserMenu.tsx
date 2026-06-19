'use client';

import { useRouter } from 'next/navigation';

interface PosUserMenuProps {
  fullName: string;
  role: string;
}

export function PosUserMenu({ fullName, role }: PosUserMenuProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-indigo-800/50 px-3 py-1 rounded-lg border border-indigo-500/30">
      <div className="text-right hidden sm:block">
        <div className="text-xs font-semibold text-white">{fullName}</div>
        <div className="text-[10px] text-indigo-200 capitalize leading-none">{role}</div>
      </div>
      <div className="h-6 w-px bg-indigo-500/50 hidden sm:block"></div>
      <button 
        onClick={handleLogout}
        className="text-xs font-medium text-red-200 hover:text-red-100 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
        title="Keluar / Ganti Akun"
      >
        Ganti Akun
      </button>
    </div>
  );
}
