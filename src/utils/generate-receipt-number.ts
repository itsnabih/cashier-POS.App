// ============================================================
// Receipt Number Generator
// Format: INV-YYYYMMDD-XXXX (4 digit sequence per day)
// ============================================================

/**
 * Generate a receipt number based on current date and sequence.
 * Example: INV-20260620-0001
 */
export function generateReceiptNumber(sequence: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  return `INV-${year}${month}${day}-${seq}`;
}
