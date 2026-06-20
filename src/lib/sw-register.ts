// ============================================================
// Service Worker Registration
//
// Registers the service worker and sets up Background Sync.
// Call this once from the root layout on client-side mount.
// ============================================================

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service Worker registered:', registration.scope);

    // Request Background Sync if supported
    if ('sync' in registration) {
      try {
        await (registration as any).sync.register('sync-transactions');
        console.log('[SW] Background Sync registered');
      } catch {
        console.log('[SW] Background Sync not supported');
      }
    }

    // Listen for SW messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_TRANSACTIONS') {
        // Dispatch custom event that hooks can listen to
        window.dispatchEvent(new CustomEvent('sw-sync-transactions'));
      }
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[SW] New service worker activated');
          }
        });
      }
    });
  } catch (err) {
    console.error('[SW] Registration failed:', err);
  }
}
