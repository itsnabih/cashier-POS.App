'use client';

import { useState, useEffect } from 'react';
import { getPendingCount } from '@/lib/offline-db';

interface NetworkStatusProps {
  isOnline: boolean;
}

export function NetworkStatus({ isOnline }: NetworkStatusProps) {
  const [pendingCount, setPendingCount] = useState(0);

  // Poll pending count every 5 seconds
  useEffect(() => {
    const update = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {
        // IndexedDB may not be available during SSR
      }
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline
              ? 'bg-emerald-400'
              : 'bg-red-400 animate-pulse'
          }`}
        />
        <span className={`text-[10px] font-medium ${
          isOnline ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Pending sync badge */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-medium text-amber-300">
            {pendingCount} pending
          </span>
        </div>
      )}
    </div>
  );
}
