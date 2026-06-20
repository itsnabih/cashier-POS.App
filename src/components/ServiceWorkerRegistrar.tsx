'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw-register';

/**
 * Client component that registers the service worker on mount.
 * Rendered in the root layout so it runs on every page.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
