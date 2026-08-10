import { type NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiNotFound, apiUnauthorized, apiInternal } from '@/lib/api-response';
import { type ProductRow, mapProductRow } from '@/types/product';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();

    const { code } = await params;
    if (!code) return apiNotFound('Kode barcode / SKU tidak diberikan');

    const cleanCode = code.trim();

    const productRow = await queryOne<ProductRow>(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE (p.barcode = $1 OR p.sku = $1) AND p.is_active = true
       LIMIT 1`,
      [cleanCode]
    );

    if (!productRow) {
      return apiNotFound(`Produk dengan barcode/SKU "${cleanCode}" tidak ditemukan`);
    }

    return apiSuccess(mapProductRow(productRow));
  } catch (error) {
    console.error('[PRODUCTS] Barcode lookup error:', error);
    return apiInternal('Gagal mencari produk berdasarkan barcode');
  }
}
