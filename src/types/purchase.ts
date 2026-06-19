// ============================================================
// Purchase Order Types
// ============================================================

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string | null;
  supplierName?: string;
  receivedBy: string | null;
  receivedByName?: string;
  status: 'draft' | 'received' | 'cancelled';
  totalAmount: number;
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
  expiredDate: string | null;
}

export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  supplier_id: string | null;
  supplier_name?: string;
  received_by: string | null;
  received_by_name?: string;
  status: 'draft' | 'received' | 'cancelled';
  total_amount: string;
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
  expired_date: string | null;
}

export function mapPurchaseOrderRow(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    receivedBy: row.received_by,
    receivedByName: row.received_by_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
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
    expiredDate: row.expired_date,
  };
}
