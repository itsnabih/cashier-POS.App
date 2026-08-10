import { type NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiPaginated, apiUnauthorized, apiInternal } from '@/lib/api-response';
import { sanitizePagination } from '@/lib/sanitize';
import { type ProductBatchRow, mapProductBatchRow } from '@/types/batch';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();

    const params = request.nextUrl.searchParams;
    const productId = params.get('productId');
    const status = params.get('status') || 'active';
    const search = params.get('search');
    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (productId) {
      conditions.push(`b.product_id = $${idx}`);
      values.push(productId);
      idx++;
    }

    if (status && status !== 'all') {
      conditions.push(`b.status = $${idx}`);
      values.push(status);
      idx++;
    }

    if (search && search.trim().length > 0) {
      conditions.push(`(b.batch_number ILIKE $${idx} OR p.name ILIKE $${idx} OR p.barcode ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM product_batches b
       JOIN products p ON p.id = b.product_id
       ${whereClause}`,
      values
    );
    const total = Number(countResult?.count ?? 0);

    const rows = await query<ProductBatchRow>(
      `SELECT 
        b.*,
        p.name as product_name,
        p.sku as product_sku,
        p.barcode as product_barcode,
        po.po_number
       FROM product_batches b
       JOIN products p ON p.id = b.product_id
       LEFT JOIN purchase_orders po ON po.id = b.po_id
       ${whereClause}
       ORDER BY 
         CASE WHEN b.expired_date IS NULL THEN 1 ELSE 0 END,
         b.expired_date ASC,
         b.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return apiPaginated(rows.map(mapProductBatchRow), { page, limit, total });
  } catch (error) {
    console.error('[BATCHES] List error:', error);
    return apiInternal('Gagal mengambil data batch produk');
  }
}
