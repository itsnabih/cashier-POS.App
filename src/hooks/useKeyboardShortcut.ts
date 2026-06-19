import { useState, useCallback, useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
}

export function useKeyboardShortcut(
  shortcuts: { options: ShortcutOptions; handler: KeyHandler }[]
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      // EXCEPT for specific keys like ArrowUp/Down/Enter/Escape which we might want to handle even in inputs
      // But we have to be careful. Generally, F1-F12 and Esc are fine.
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      for (const { options, handler } of shortcuts) {
        if (options.enabled === false) continue;

        if (
          event.key === options.key &&
          !!event.ctrlKey === !!options.ctrlKey &&
          !!event.altKey === !!options.altKey &&
          !!event.shiftKey === !!options.shiftKey
        ) {
          // If it's a character key and we are inside an input, usually don't trigger
          // unless explicitly allowed, but for F-keys and Esc, it's fine.
          if (isInput && options.key.length === 1 && !options.ctrlKey && !options.altKey) {
             continue; // Let the user type
          }

          if (options.preventDefault) {
            event.preventDefault();
          }
          handler(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
