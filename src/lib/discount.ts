import { ProductCashierView } from '@/types/product';

// Calculate days difference from today
function daysDiffFromToday(dateString: string | null): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  
  // Set times to midnight to just compare dates
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function calculateProductDiscount(
  product: ProductCashierView,
  settings: Record<string, string>
): number {
  const nearExpiryDays = parseInt(settings['inventory.near_expiry_days'] || '180', 10);
  const nearExpiryPct = parseInt(settings['discount.near_expiry_pct'] || '10', 10);
  
  const slowMovingDays = parseInt(settings['inventory.slow_moving_days'] || '60', 10);
  const slowMovingPct = parseInt(settings['discount.slow_moving_pct'] || '5', 10);

  let maxDiscountPct = 0;

  // 1. Near Expiry Check
  if (product.expiredDate) {
    const daysUntilExpiry = daysDiffFromToday(product.expiredDate);
    if (daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= nearExpiryDays) {
      maxDiscountPct = Math.max(maxDiscountPct, nearExpiryPct);
    }
  }

  // 2. Slow Moving Check
  // If never sold, use createdAt. If sold, use lastSoldAt.
  const referenceDate = product.lastSoldAt ? product.lastSoldAt : product.createdAt;
  const daysSinceSold = daysDiffFromToday(referenceDate);
  
  // daysSinceSold will be negative if it's in the past. We want absolute days.
  if (daysSinceSold !== null) {
    const daysIdle = Math.abs(daysSinceSold);
    if (daysIdle >= slowMovingDays) {
      maxDiscountPct = Math.max(maxDiscountPct, slowMovingPct);
    }
  }

  return maxDiscountPct;
}
