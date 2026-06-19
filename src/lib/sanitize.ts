// ============================================================
// Input Sanitization Utilities
// Prevents XSS, trims whitespace, validates common patterns
// ============================================================

/**
 * Strip HTML tags and trim whitespace from a string.
 * Used on all user-facing text inputs before DB insertion.
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars
}

/**
 * Sanitize and normalize a slug (URL-safe string).
 */
export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate and sanitize a UUID string.
 * Returns null if invalid.
 */
export function sanitizeUUID(input: string): string | null {
  const uuid = input.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return uuidRegex.test(uuid) ? uuid : null;
}

/**
 * Sanitize a search query string.
 * Removes dangerous characters but preserves spaces for search.
 */
export function sanitizeSearchQuery(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/['"`;\\]/g, '')
    .substring(0, 200); // limit length
}

/**
 * Ensure a number is within bounds.
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize pagination parameters.
 */
export function sanitizePagination(
  page?: number | string,
  limit?: number | string
): { page: number; limit: number; offset: number } {
  const p = clampNumber(Number(page) || 1, 1, 10000);
  const l = clampNumber(Number(limit) || 50, 1, 100);
  return { page: p, limit: l, offset: (p - 1) * l };
}
