import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString, sanitizeUUID } from '@/lib/sanitize';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiForbidden, apiNotFound, apiInternal } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type ProductRow, mapProductRow, mapProductRowCashier } from '@/types/product';

// ============================================================
// GET /api/products/[id] — Get single product
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PRODUCT_VIEW)) return apiForbidden();

    const { id } = await params;
    const cleanId = sanitizeUUID(id);
    if (!cleanId) return apiBadRequest('ID produk tidak valid');

    const row = await queryOne<ProductRow & { category_name: string }>(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [cleanId]
    );

    if (!row) return apiNotFound('Produk tidak ditemukan');

    const canSeeBuyPrice = hasPermission(user.role, PERMISSIONS.PRODUCT_VIEW_BUY_PRICE);
    const product = canSeeBuyPrice
      ? { ...mapProductRow(row), categoryName: row.category_name }
      : { ...mapProductRowCashier(row), categoryName: row.category_name };

    return apiSuccess(product);
  } catch (error) {
    console.error('[PRODUCTS] Get error:', error);
    return apiInternal('Gagal mengambil data produk');
  }
}

// ============================================================
// PUT /api/products/[id] — Update product
// ============================================================

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).transform(sanitizeString).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().max(50).transform(sanitizeString).nullable().optional(),
  barcode: z.string().max(50).transform(sanitizeString).nullable().optional(),
  description: z.string().max(1000).transform(sanitizeString).nullable().optional(),
  buyPrice: z.number().int().min(0).optional(),
  sellPrice: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  unit: z.string().max(20).transform(sanitizeString).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  expiredDate: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PRODUCT_EDIT)) return apiForbidden();

    const { id } = await params;
    const cleanId = sanitizeUUID(id);
    if (!cleanId) return apiBadRequest('ID produk tidak valid');

    const body = await request.json();
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    // Fetch existing for audit trail
    const existing = await queryOne<ProductRow>('SELECT * FROM products WHERE id = $1', [cleanId]);
    if (!existing) return apiNotFound('Produk tidak ditemukan');

    const d = parsed.data;

    // Check duplicate SKU/barcode (exclude self)
    if (d.sku !== undefined && d.sku !== null) {
      const dup = await queryOne<{ id: string }>('SELECT id FROM products WHERE sku = $1 AND id != $2', [d.sku, cleanId]);
      if (dup) return apiBadRequest('SKU sudah digunakan');
    }
    if (d.barcode !== undefined && d.barcode !== null) {
      const dup = await queryOne<{ id: string }>('SELECT id FROM products WHERE barcode = $1 AND id != $2', [d.barcode, cleanId]);
      if (dup) return apiBadRequest('Barcode sudah digunakan');
    }

    // Build dynamic SET clause
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      name: 'name', categoryId: 'category_id', sku: 'sku', barcode: 'barcode',
      description: 'description', buyPrice: 'buy_price', sellPrice: 'sell_price',
      stock: 'stock', minStock: 'min_stock', unit: 'unit', imageUrl: 'image_url',
      isActive: 'is_active', expiredDate: 'expired_date',
    };

    for (const [key, dbCol] of Object.entries(fieldMap)) {
      if (d[key as keyof typeof d] !== undefined) {
        setClauses.push(`${dbCol} = $${idx}`);
        values.push(d[key as keyof typeof d]);
        idx++;
      }
    }

    if (setClauses.length === 0) return apiBadRequest('Tidak ada field yang diupdate');

    values.push(cleanId);
    const row = await queryOne<ProductRow>(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!row) return apiInternal('Gagal update produk');

    // Audit trail with old/new values
    await auditLog(user, 'UPDATE', 'product', cleanId, {
      oldValues: { name: existing.name, buy_price: existing.buy_price, sell_price: existing.sell_price, stock: existing.stock },
      newValues: d as Record<string, unknown>,
      request,
    });

    return apiSuccess(mapProductRow(row));
  } catch (error) {
    console.error('[PRODUCTS] Update error:', error);
    return apiInternal('Gagal update produk');
  }
}

// ============================================================
// DELETE /api/products/[id] — Soft-delete product
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PRODUCT_DELETE)) return apiForbidden();

    const { id } = await params;
    const cleanId = sanitizeUUID(id);
    if (!cleanId) return apiBadRequest('ID produk tidak valid');

    const existing = await queryOne<ProductRow>('SELECT * FROM products WHERE id = $1', [cleanId]);
    if (!existing) return apiNotFound('Produk tidak ditemukan');

    // Soft delete
    await query('UPDATE products SET is_active = false WHERE id = $1', [cleanId]);

    // Audit trail
    await auditLog(user, 'DELETE', 'product', cleanId, {
      oldValues: { name: existing.name, sku: existing.sku },
      description: `Produk "${existing.name}" dinonaktifkan`,
      request,
    });

    return apiSuccess({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('[PRODUCTS] Delete error:', error);
    return apiInternal('Gagal menghapus produk');
  }
}
