'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ============================================================
// Login page — clean enterprise aesthetic, no emoji
// ============================================================

// Reason code → display text mapping (frontend-only)
const REASON_MESSAGES: Record<string, string> = {
  unauthenticated: 'Silakan login terlebih dahulu',
  session_expired: 'Sesi telah berakhir, silakan login ulang',
  forbidden: 'Anda tidak memiliki akses ke halaman tersebut',
};

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const callbackUrl = searchParams.get('callbackUrl');
  const reasonMessage = reason ? REASON_MESSAGES[reason] ?? null : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Login gagal');
        setLoading(false);
        return;
      }

      // Redirect based on role
      const role = data.data.user.role;
      const defaultPaths: Record<string, string> = {
        owner: '/dashboard',
        admin: '/dashboard',
        kasir: '/pos',
      };
      router.push(callbackUrl || defaultPaths[role] || '/dashboard');
    } catch {
      setError('Tidak dapat terhubung ke server');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-white tracking-tight">BabyPOS</h1>
          <p className="text-sm text-slate-500 mt-1">Sistem Kasir &amp; Inventaris</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          {reasonMessage && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              {reasonMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-medium text-slate-600 mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors text-slate-900"
                placeholder="Masukkan username"
                autoFocus
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors text-slate-900"
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          v0.1.0
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="text-slate-500 text-sm">Memuat...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
