// ============================================================
// Purchase Order Types
// ============================================================

export interface PurchaseOrder {
  id: string;
  poNumber: string;

  receivedBy: string | null;
  receivedByName?: string;
  status: 'draft' | 'received' | 'cancelled';
  totalAmount: number;
  source: string | null;
  referenceNumber: string | null;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number;
  taxType: 'percentage' | 'fixed' | null;
  taxValue: number;
  grandTotal: number;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  netUnitCost: number;
  expiredDate: string | null;
}

export interface PurchaseOrderRow {
  id: string;
  po_number: string;

  received_by: string | null;
  received_by_name?: string;
  status: 'draft' | 'received' | 'cancelled';
  total_amount: string;
  source: string | null;
  reference_number: string | null;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: string | null;
  tax_type: 'percentage' | 'fixed' | null;
  tax_value: string | null;
  grand_total: string | null;
  notes: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemRow {
  id: string;
  po_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: string;
  subtotal: string;
  net_unit_cost: string | null;
  expired_date: string | null;
}

export function mapPurchaseOrderRow(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,

    receivedBy: row.received_by,
    receivedByName: row.received_by_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    source: row.source,
    referenceNumber: row.reference_number,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value || 0),
    taxType: row.tax_type,
    taxValue: Number(row.tax_value || 0),
    grandTotal: Number(row.grand_total || row.total_amount),
    notes: row.notes,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPurchaseOrderItemRow(row: PurchaseOrderItemRow): PurchaseOrderItem {
  return {
    id: row.id,
    poId: row.po_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitCost: Number(row.unit_cost),
    subtotal: Number(row.subtotal),
    netUnitCost: Number(row.net_unit_cost || row.unit_cost),
    expiredDate: row.expired_date,
  };
}
