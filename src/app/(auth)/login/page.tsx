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
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
            <h2 className="login-title">Sign in</h2>

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
                  placeholder="Username"
                  autoFocus
                  required
                  autoComplete="username"
                />
              </div>

              <div className="login-field">
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="login-forgot">
                <a href="#">Forgotten your password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-submit"
              >
                {loading ? 'Processing...' : 'Masuk'}
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
