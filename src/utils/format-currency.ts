// ============================================================
// Currency Formatting Utilities
// Harga disimpan dalam BIGINT (sen): Rp 15.000 = 1500000
// ============================================================

/**
 * Format sen (BIGINT) ke string Rupiah.
 * 1500000 → "Rp 15.000"
 */
export function formatRupiah(sen: number): string {
  const rupiah = Math.round(sen / 100);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupiah);
}

/**
 * Format sen ke angka Rupiah tanpa prefix.
 * 1500000 → "15.000"
 */
export function formatNumber(sen: number): string {
  const rupiah = Math.round(sen / 100);
  return new Intl.NumberFormat('id-ID').format(rupiah);
}

/**
 * Parse input Rupiah string ke sen (BIGINT).
 * "15.000" → 1500000
 * "15000"  → 1500000
 */
export function parseRupiahToSen(input: string): number {
  const cleaned = input.replace(/[^\d]/g, '');
  return Number(cleaned) * 100;
}
