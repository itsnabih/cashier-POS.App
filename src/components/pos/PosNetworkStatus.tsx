'use client';

import { useState, useEffect } from 'react';
import { NetworkStatus } from './NetworkStatus';

/**
 * Client-side wrapper for NetworkStatus that tracks
 * navigator.onLine status. Used in server layout.
 */
export function PosNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <NetworkStatus isOnline={isOnline} />;
}
