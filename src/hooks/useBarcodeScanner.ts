// ============================================================
// Barcode Scanner Hook
//
// Detects rapid sequential keystrokes (< 50ms per char) ending
// with Enter — the typical pattern of USB barcode scanners
// operating in keyboard emulation mode.
//
// When a barcode is detected, it searches the product catalog
// and adds the matched product directly to the cart without
// requiring manual input focus.
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannnerOptions {
  /**
   * Called when a barcode scan is detected.
   * Receives the raw barcode string.
   */
  onScan: (barcode: string) => void;

  /**
   * Maximum time (ms) between keystrokes to still be
   * considered scanner input. Default: 50ms.
   */
  maxKeystrokeInterval?: number;

  /**
   * Minimum barcode length to trigger. Default: 4.
   */
  minLength?: number;

  /**
   * Whether the scanner is enabled. Default: true.
   */
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  maxKeystrokeInterval = 50,
  minLength = 4,
  enabled = true,
}: UseBarcodeScannnerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    lastKeystrokeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const elapsed = now - lastKeystrokeRef.current;

      // If Enter is pressed, check if buffer looks like a barcode
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          // This was a scanner input — prevent form submission
          e.preventDefault();
          e.stopPropagation();

          const barcode = bufferRef.current.trim();
          resetBuffer();
          onScan(barcode);
          return;
        }
        // Not a barcode, let Enter propagate normally
        resetBuffer();
        return;
      }

      // Only capture single printable characters
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // If too much time has passed since last keystroke, reset
      if (lastKeystrokeRef.current > 0 && elapsed > maxKeystrokeInterval) {
        bufferRef.current = '';
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      // Safety: clear buffer after 500ms of no input
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        resetBuffer();
      }, 500);
    };

    // Use capture phase to intercept before other handlers
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, maxKeystrokeInterval, minLength, onScan, resetBuffer]);
}
