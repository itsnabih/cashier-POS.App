import { type NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizePagination } from '@/lib/sanitize';
import { apiSuccess, apiPaginated, apiUnauthorized, apiForbidden, apiInternal } from '@/lib/api-response';

// ============================================================
// GET /api/categories — List categories
// ============================================================
interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  product_count?: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.CATEGORY_VIEW)) return apiForbidden();

    const params = request.nextUrl.searchParams;
    const all = params.get('all') === 'true';

    if (all) {
      const rows = await query<CategoryRow>(
        `SELECT c.*, COUNT(p.id) as product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
         WHERE c.is_active = true
         GROUP BY c.id
         ORDER BY c.sort_order ASC`
      );
      return apiSuccess(rows.map(mapCategoryRow));
    }

    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM categories WHERE is_active = true'
    );
    const total = Number(countResult?.count ?? 0);

    const rows = await query<CategoryRow>(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY c.sort_order ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return apiPaginated(rows.map(mapCategoryRow), { page, limit, total });
  } catch (error) {
    console.error('[CATEGORIES] List error:', error);
    return apiInternal('Gagal mengambil data kategori');
  }
}

function mapCategoryRow(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    productCount: Number(row.product_count ?? 0),
  };
}
