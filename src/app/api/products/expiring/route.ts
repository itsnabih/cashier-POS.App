import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { query } from '@/lib/db';
import { apiSuccess, apiUnauthorized, apiForbidden, apiInternal } from '@/lib/api-response';

// ============================================================
// GET /api/products/expiring — Products expiring within 90 days
// Returns 3 tiers: critical (30d), warning (60d), info (90d)
// ============================================================

interface ExpiringProductRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  stock: number;
  expired_date: string;
  days_until_expiry: number;
  category_name: string | null;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.DASHBOARD_VIEW)) return apiForbidden();

    const rows = await query<ExpiringProductRow>(
      `SELECT p.id, p.name, p.sku, p.barcode, p.stock,
              p.expired_date,
              (p.expired_date - CURRENT_DATE) as days_until_expiry,
              c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = true
         AND p.expired_date IS NOT NULL
         AND p.expired_date <= CURRENT_DATE + INTERVAL '90 days'
         AND p.stock > 0
       ORDER BY p.expired_date ASC`,
      []
    );

    const critical = rows
      .filter((r) => r.days_until_expiry <= 30)
      .map(mapExpiringProduct);

    const warning = rows
      .filter((r) => r.days_until_expiry > 30 && r.days_until_expiry <= 60)
      .map(mapExpiringProduct);

    const info = rows
      .filter((r) => r.days_until_expiry > 60 && r.days_until_expiry <= 90)
      .map(mapExpiringProduct);

    return apiSuccess({
      critical,
      warning,
      info,
      summary: {
        criticalCount: critical.length,
        warningCount: warning.length,
        infoCount: info.length,
        totalCount: rows.length,
      },
    });
  } catch (error) {
    console.error('[PRODUCTS] Expiring error:', error);
    return apiInternal('Gagal mengambil data kedaluwarsa');
  }
}

function mapExpiringProduct(row: ExpiringProductRow) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    stock: row.stock,
    expiredDate: row.expired_date,
    daysUntilExpiry: Number(row.days_until_expiry),
    categoryName: row.category_name,
  };
}
