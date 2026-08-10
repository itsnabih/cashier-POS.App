import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne, transaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString, sanitizePagination } from '@/lib/sanitize';
import { apiSuccess, apiPaginated, apiBadRequest, apiUnauthorized, apiForbidden, apiInternal, apiCreated } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type PurchaseOrderRow, mapPurchaseOrderRow } from '@/types/purchase';

// ============================================================
// GET /api/purchases — List purchase orders (Barang Masuk)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_VIEW)) return apiForbidden();

    const params = request.nextUrl.searchParams;
    const status = params.get('status');
    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`po.status = $${idx}`);
      values.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM purchase_orders po ${whereClause}`,
      values
    );
    const total = Number(countResult?.count ?? 0);

    const rows = await query<PurchaseOrderRow>(
      `SELECT po.*, u.full_name as received_by_name
       FROM purchase_orders po
       LEFT JOIN users u ON u.id = po.received_by
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return apiPaginated(rows.map(mapPurchaseOrderRow), { page, limit, total });
  } catch (error) {
    console.error('[PURCHASES] List error:', error);
    return apiInternal('Gagal mengambil data barang masuk');
  }
}

// ============================================================
// POST /api/purchases — Catat Barang Masuk
// Implements Moving Average Cost (MAC) for HPP calculation
// incorporates discount and tax distributions
// ============================================================

const PurchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Kuantitas harus lebih dari 0'),
  unitCost: z.number().int().min(0, 'Harga beli tidak boleh negatif'),
  batchNumber: z.string().optional().or(z.literal('')),
  expiredDate: z.string().nullable().optional(),
});

const CreatePurchaseSchema = z.object({
  source: z.string().max(255).transform(sanitizeString).nullable().optional(),
  referenceNumber: z.string().max(100).transform(sanitizeString).nullable().optional(),
  notes: z.string().max(500).transform(sanitizeString).nullable().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'Minimal 1 item'),
  discountType: z.enum(['percentage', 'fixed']).nullable().optional(),
  discountValue: z.number().min(0).default(0),
  taxType: z.enum(['percentage', 'fixed']).nullable().optional(),
  taxValue: z.number().min(0).default(0),
  autoReceive: z.boolean().default(true), // We'll keep this flag for compatibility, though we always receive now
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.PURCHASE_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreatePurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Generate PO number: BM-YYYYMMDD-XXXX (BM = Barang Masuk)
    const now = new Date();
    const datePrefix = `BM-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seqResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE po_number LIKE $1`,
      [`${datePrefix}%`]
    );
    const seq = String(Number(seqResult?.count ?? 0) + 1).padStart(4, '0');
    const poNumber = `${datePrefix}-${seq}`;

    // Calculate totals
    const totalAmount = d.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    
    // Discount
    let calcDiscountValue = 0;
    if (d.discountType === 'percentage') {
      calcDiscountValue = Math.round(totalAmount * (d.discountValue / 100));
    } else if (d.discountType === 'fixed') {
      calcDiscountValue = d.discountValue;
    }
    // Cap discount
    if (calcDiscountValue > totalAmount) calcDiscountValue = totalAmount;

    // Tax
    const afterDiscount = totalAmount - calcDiscountValue;
    let calcTaxValue = 0;
    if (d.taxType === 'percentage') {
      calcTaxValue = Math.round(afterDiscount * (d.taxValue / 100));
    } else if (d.taxType === 'fixed') {
      calcTaxValue = d.taxValue;
    }

    const grandTotal = afterDiscount + calcTaxValue;

    const result = await transaction(async (client) => {
      // Create PO header
      const poResult = await client.query(
        `INSERT INTO purchase_orders (
          po_number, source, reference_number, received_by, status, 
          total_amount, discount_type, discount_value, tax_type, tax_value, grand_total, 
          notes, received_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          poNumber,
          d.source ?? null,
          d.referenceNumber ?? null,
          d.autoReceive ? user.userId : null,
          d.autoReceive ? 'received' : 'draft',
          totalAmount,
          d.discountType ?? null,
          d.discountValue, // we store the raw input here, not the calculated one
          d.taxType ?? null,
          d.taxValue, // raw input
          grandTotal,
          d.notes ?? null,
          d.autoReceive ? now.toISOString() : null,
        ]
      );
      const po = poResult.rows[0];

      // Distribute discount/tax to items proportionally
      let remainingDiscount = calcDiscountValue;
      let remainingTax = calcTaxValue;

      for (let i = 0; i < d.items.length; i++) {
        const item = d.items[i];
        const isLast = i === d.items.length - 1;

        const productRow = await client.query(
          'SELECT id, name, buy_price, stock FROM products WHERE id = $1',
          [item.productId]
        );

        if (productRow.rows.length === 0) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        const product = productRow.rows[0];
        const subtotal = item.quantity * item.unitCost;

        // Proportional distribution
        let itemDiscount = 0;
        let itemTax = 0;

        if (totalAmount > 0) {
          const ratio = subtotal / totalAmount;
          if (isLast) {
            // Apply all remainders to the last item to handle rounding errors
            itemDiscount = remainingDiscount;
            itemTax = remainingTax;
          } else {
            itemDiscount = Math.round(calcDiscountValue * ratio);
            itemTax = Math.round(calcTaxValue * ratio);
            remainingDiscount -= itemDiscount;
            remainingTax -= itemTax;
          }
        }

        const netSubtotal = subtotal - itemDiscount + itemTax;
        const netUnitCost = item.quantity > 0 ? Math.round(netSubtotal / item.quantity) : 0;

        // Auto-generate batch number if empty
        const itemBatchNum = (item.batchNumber && item.batchNumber.trim().length > 0)
          ? item.batchNumber.trim()
          : `BATCH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`;

        // Insert into product_batches
        const batchResult = await client.query(
          `INSERT INTO product_batches (
            product_id, po_id, batch_number, quantity_received, quantity_remaining, unit_cost, expired_date, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id`,
          [
            item.productId,
            po.id,
            itemBatchNum,
            item.quantity,
            item.quantity,
            netUnitCost,
            item.expiredDate || null,
          ]
        );
        const batchId = batchResult.rows[0].id;

        // Insert PO item with batch_id
        await client.query(
          `INSERT INTO purchase_order_items (
            po_id, product_id, product_name, quantity, unit_cost, subtotal, net_unit_cost, expired_date, batch_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [po.id, item.productId, product.name, item.quantity, item.unitCost, subtotal, netUnitCost, item.expiredDate || null, batchId]
        );

        if (d.autoReceive) {
          // ---- MOVING AVERAGE COST (MAC) CALCULATION ----
          // Use netUnitCost for MAC!
          const oldStock = Number(product.stock);
          const oldBuyPrice = Number(product.buy_price);
          const newQty = item.quantity;
          const newBuyPriceNet = netUnitCost;

          let finalBuyPrice: number;
          if (oldStock + newQty <= 0) {
            finalBuyPrice = newBuyPriceNet;
          } else {
            // MAC = (oldStock * oldBuyPrice + newQty * newBuyPriceNet) / (oldStock + newQty)
            finalBuyPrice = Math.round(
              (oldStock * oldBuyPrice + newQty * newBuyPriceNet) / (oldStock + newQty)
            );
          }
          const newStock = oldStock + newQty;

          // Update product: stock + buy_price (MAC) + expired_date
          const updateFields = [finalBuyPrice, newStock, item.productId];
          let updateQuery = 'UPDATE products SET buy_price = $1, stock = $2';

          if (item.expiredDate) {
            updateQuery += ', expired_date = $4';
            updateFields.push(item.expiredDate as unknown as string);
          }

          updateQuery += ' WHERE id = $3';
          await client.query(updateQuery, updateFields);

          // Record inventory adjustment (we log the netUnitCost as unit_cost here so history is accurate)
          await client.query(
            `INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity_change, unit_cost, total_value, reference_type, reference_id, reason, adjusted_by)
             VALUES ($1, 'purchase', $2, $3, $4, 'purchase_order', $5, $6, $7)`,
            [item.productId, newQty, netUnitCost, netSubtotal, po.id,
             `Barang masuk ${poNumber}`, user.userId]
          );
        }
      }

      return po;
    });

    // Audit trail
    await auditLog(user, 'CREATE', 'purchase_order', result.id, {
      newValues: { poNumber, totalAmount, grandTotal, itemCount: d.items.length },
      description: `Pencatatan barang masuk ${poNumber}`,
      request,
    });

    return apiCreated(mapPurchaseOrderRow(result));
  } catch (error) {
    console.error('[PURCHASES] Create error:', error);
    const message = error instanceof Error ? error.message : 'Gagal mencatat barang masuk';
    return apiInternal(message);
  }
}
