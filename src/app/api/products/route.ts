import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString, sanitizeSearchQuery, sanitizePagination } from '@/lib/sanitize';
import { apiSuccess, apiPaginated, apiBadRequest, apiUnauthorized, apiForbidden, apiInternal, apiCreated } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type ProductRow, mapProductRow, mapProductRowCashier } from '@/types/product';

// ============================================================
// GET /api/products — List products (paginated, searchable)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PRODUCT_VIEW)) return apiForbidden();

    const params = request.nextUrl.searchParams;
    const search = params.get('search') ? sanitizeSearchQuery(params.get('search')!) : null;
    const categoryId = params.get('category') || null;
    const activeOnly = params.get('active') !== 'false';
    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    // Build dynamic WHERE clauses safely
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (activeOnly) {
      conditions.push(`p.is_active = true`);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (categoryId) {
      conditions.push(`p.category_id = $${paramIndex}`);
      values.push(categoryId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM products p ${whereClause}`,
      values
    );
    const total = Number(countResult?.count ?? 0);

    // Determine columns based on role (kasir cannot see buy_price)
    const canSeeBuyPrice = hasPermission(user.role, PERMISSIONS.PRODUCT_VIEW_BUY_PRICE);
    const selectColumns = canSeeBuyPrice
      ? 'p.*, c.name as category_name'
      : 'p.id, p.category_id, p.sku, p.barcode, p.name, p.description, p.sell_price, p.stock, p.min_stock, p.unit, p.image_url, p.is_active, p.expired_date, p.created_at, p.updated_at, c.name as category_name';

    // Fetch rows
    const rows = await query<ProductRow & { category_name: string }>(
      `SELECT ${selectColumns}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY p.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    const products = canSeeBuyPrice
      ? rows.map((r) => ({ ...mapProductRow(r), categoryName: r.category_name }))
      : rows.map((r) => ({ ...mapProductRowCashier(r), categoryName: r.category_name }));

    return apiPaginated(products, { page, limit, total });
  } catch (error) {
    console.error('[PRODUCTS] List error:', error);
    return apiInternal('Gagal mengambil data produk');
  }
}

// ============================================================
// POST /api/products — Create product
// ============================================================

const CreateProductSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(200).transform(sanitizeString),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().max(50).transform(sanitizeString).nullable().optional(),
  barcode: z.string().max(50).transform(sanitizeString).nullable().optional(),
  description: z.string().max(1000).transform(sanitizeString).nullable().optional(),
  buyPrice: z.number().int().min(0, 'Harga beli tidak boleh negatif'),
  sellPrice: z.number().int().min(0, 'Harga jual tidak boleh negatif'),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  unit: z.string().max(20).default('pcs').transform(sanitizeString),
  imageUrl: z.string().url().nullable().optional(),
  expiredDate: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PRODUCT_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Check duplicate SKU/barcode
    if (d.sku) {
      const existing = await queryOne('SELECT id FROM products WHERE sku = $1', [d.sku]);
      if (existing) return apiBadRequest('SKU sudah digunakan');
    }
    if (d.barcode) {
      const existing = await queryOne('SELECT id FROM products WHERE barcode = $1', [d.barcode]);
      if (existing) return apiBadRequest('Barcode sudah digunakan');
    }

    const row = await queryOne<ProductRow>(
      `INSERT INTO products (name, category_id, sku, barcode, description, buy_price, sell_price, stock, min_stock, unit, image_url, expired_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [d.name, d.categoryId ?? null, d.sku ?? null, d.barcode ?? null, d.description ?? null,
       d.buyPrice, d.sellPrice, d.stock, d.minStock, d.unit, d.imageUrl ?? null, d.expiredDate ?? null]
    );

    if (!row) return apiInternal('Gagal membuat produk');

    // Audit trail
    await auditLog(user, 'CREATE', 'product', row.id, {
      newValues: { name: d.name, sku: d.sku, buyPrice: d.buyPrice, sellPrice: d.sellPrice, stock: d.stock },
      request,
    });

    return apiCreated(mapProductRow(row));
  } catch (error) {
    console.error('[PRODUCTS] Create error:', error);
    return apiInternal('Gagal membuat produk');
  }
}
