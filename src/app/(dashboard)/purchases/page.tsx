'use client';

export default function PurchasesUnderDevelopment() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] animate-in text-center px-4">
      <div className="w-16 h-16 bg-baby-50 text-baby-500 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Fitur Dalam Pengembangan</h2>
      <p className="text-slate-500 max-w-md">
        Fitur Pembelian saat ini sedang dinonaktifkan dan dalam tahap pengembangan (Under Development). Silakan kembali lagi nanti.
      </p>
    </div>
  );
}
