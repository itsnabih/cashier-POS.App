// ============================================================
// Product Batch Types (Lot & Expiry Management)
// ============================================================

export interface ProductBatch {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string | null;
  productBarcode?: string | null;
  poId: string | null;
  poNumber?: string | null;
  batchNumber: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  expiredDate: string | null;
  receivedAt: string;
  status: 'active' | 'depleted' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface ProductBatchRow {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string | null;
  product_barcode?: string | null;
  po_id: string | null;
  po_number?: string | null;
  batch_number: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: string;
  expired_date: string | null;
  received_at: string;
  status: 'active' | 'depleted' | 'expired';
  created_at: string;
  updated_at: string;
}

export function mapProductBatchRow(row: ProductBatchRow): ProductBatch {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    productBarcode: row.product_barcode,
    poId: row.po_id,
    poNumber: row.po_number,
    batchNumber: row.batch_number,
    quantityReceived: row.quantity_received,
    quantityRemaining: row.quantity_remaining,
    unitCost: Number(row.unit_cost || 0),
    expiredDate: row.expired_date,
    receivedAt: row.received_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
