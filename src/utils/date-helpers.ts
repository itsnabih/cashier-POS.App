// ============================================================
// Date Helper Utilities
// ============================================================

/**
 * Format ISO date string to Indonesian locale.
 * "2026-06-20T00:30:00Z" → "20 Jun 2026, 07:30 WIB"
 */
export function formatDateID(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

/**
 * Format date to short form: "20 Jun 2026"
 */
export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

/**
 * Format time only: "07:30"
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

/**
 * Get start of today (Jakarta timezone) as ISO string.
 */
export function getStartOfToday(): string {
  const now = new Date();
  const jakartaOffset = 7 * 60; // UTC+7
  const utcDate = new Date(now.getTime() + jakartaOffset * 60000);
  utcDate.setUTCHours(0, 0, 0, 0);
  return new Date(utcDate.getTime() - jakartaOffset * 60000).toISOString();
}

/**
 * Get relative time string: "2 menit yang lalu", "1 jam yang lalu"
 */
export function getRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit yang lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam yang lalu`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari yang lalu`;

  return formatDateShort(isoString);
}
