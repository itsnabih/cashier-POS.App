'use client';

import { useState, useEffect } from 'react';

export function PosClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());

    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Tanggal & jam — hanya dihitung jika time sudah tersedia
  let dateStr = '';
  let timeStr = '';

  if (time) {
    // Tanggal: Sabtu, 20 Juni 2026
    dateStr = time.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta', // WIB
    });

    // Jam: 04:35:42
    timeStr = time
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta', // WIB
      })
      .replace(/\./g, ':'); // Pastikan pemisahnya titik dua
  }

  return (
    <div className="text-xs text-baby-200 hidden md:block w-[240px]" suppressHydrationWarning>
      {time ? (
        <div className="flex items-center gap-1.5 text-[11px] tabular-nums tracking-wide">
          <span>{dateStr}</span>
          <span className="text-baby-400 opacity-50">•</span>
          <span className="font-bold text-white tracking-widest">{timeStr} WIB</span>
        </div>
      ) : (
        <span>&hellip;</span>
      )}
    </div>
  );
}
