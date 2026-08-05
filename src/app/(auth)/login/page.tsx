'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';
import './login.css';

// ============================================================
// Login page — modern split-panel design
// ============================================================

const REASON_MESSAGES: Record<string, string> = {
  unauthenticated: 'Silakan login terlebih dahulu',
  session_expired: 'Sesi telah berakhir, silakan login ulang',
  forbidden: 'Anda tidak memiliki akses ke halaman tersebut',
};

function LoginForm() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
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
        body: JSON.stringify({ username, pin }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Login gagal');
        setLoading(false);
        return;
      }

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

  const handlePinChange = (value: string) => {
    // Only allow digits, max 6
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        
        {/* Left panel */}
        <div className="login-left">
          <div className="login-brand-header">
            <span className="login-brand-name">SUMBER BABY SHOP</span>
          </div>

          <div className="login-left-center">
            <div className="login-pos-icon-wrapper">
              <Image src="/icons/Logo sumber baby shop.png" alt="Logo" width={120} height={120} className="object-contain drop-shadow-lg" priority />
            </div>
            <h1 className="login-pos-title">Point of<br/>Sale</h1>
          </div>
        </div>

        {/* Right panel */}
        <div className="login-right">
          {/* Decorative wave */}
          <div className="login-wave-bg" />
          
          <div className="login-right-content">
            {/* Mobile Header (Hidden on Desktop) */}
            <div className="login-mobile-header block lg:hidden mb-6 text-center">
              <Image src="/icons/Logo sumber baby shop.png" alt="Logo" width={48} height={48} className="mx-auto mb-2 object-contain" />
              <h1 className="text-xl font-bold text-gray-800">SUMBER BABY SHOP</h1>
            </div>

            <p className="login-subtitle">POINT OF SALE</p>
            <h2 className="login-title">Masuk</h2>

            {reasonMessage && (
              <div className="login-alert">
                <span>{reasonMessage}</span>
              </div>
            )}

            {error && (
              <div className="login-alert error">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="User ID"
                  autoFocus
                  required
                  autoComplete="username"
                />
              </div>

              <div className="login-field">
                <input
                  id="login-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="PIN (6 digit)"
                  required
                  autoComplete="current-password"
                  pattern="\d{6}"
                  title="PIN harus 6 digit angka"
                />
              </div>

              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="login-submit"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page-container">
        <div className="login-card" style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Memuat...</h2>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
