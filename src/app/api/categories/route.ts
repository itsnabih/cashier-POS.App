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

// ============================================================
// POST /api/categories — Create category
// ============================================================

import { z } from 'zod';
import { sanitizeString } from '@/lib/sanitize';
import { apiBadRequest, apiCreated } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(100).transform(sanitizeString),
  color: z.string().max(20).default('bg-slate-100 text-slate-800'),
  icon: z.string().max(50).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.CATEGORY_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Slug generation
    const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Check duplicate name
    const existingName = await queryOne('SELECT id FROM categories WHERE name ILIKE $1', [d.name]);
    if (existingName) return apiBadRequest('Kategori dengan nama ini sudah ada');

    // Get max sort_order
    const maxSort = await queryOne<{ max: number }>('SELECT MAX(sort_order) as max FROM categories');
    const nextSortOrder = (maxSort?.max ?? 0) + 1;

    const row = await queryOne<CategoryRow>(
      `INSERT INTO categories (name, slug, color, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [d.name, slug, d.color, d.icon ?? null, nextSortOrder]
    );

    if (!row) return apiInternal('Gagal membuat kategori');

    // Audit trail
    await auditLog(user, 'CREATE', 'category', row.id, {
      newValues: { name: d.name },
      request,
    });

    return apiCreated(mapCategoryRow(row));
  } catch (error) {
    console.error('[CATEGORIES] Create error:', error);
    return apiInternal('Gagal membuat kategori');
  }
}

