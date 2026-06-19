// ============================================================
// Transaction Types
// ============================================================

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  cashierId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'qris' | 'transfer';
  paymentAmount: number;
  changeAmount: number;
  status: 'completed' | 'voided' | 'pending';
  notes: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  syncedFrom: string | null;
  createdAt: string;
  items?: TransactionItem[];
}

export interface TransactionRow {
  id: string;
  receipt_number: string;
  cashier_id: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment_method: 'cash' | 'qris' | 'transfer';
  payment_amount: string;
  change_amount: string;
  status: 'completed' | 'voided' | 'pending';
  notes: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  synced_from: string | null;
  created_at: string;
}

export interface TransactionItemRow {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: string;
  discount: string;
  subtotal: string;
}

export function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    cashierId: row.cashier_id,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentAmount: Number(row.payment_amount),
    changeAmount: Number(row.change_amount),
    status: row.status,
    notes: row.notes,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    syncedFrom: row.synced_from,
    createdAt: row.created_at,
  };
}

export function mapTransactionItemRow(row: TransactionItemRow): TransactionItem {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    discount: Number(row.discount),
    subtotal: Number(row.subtotal),
  };
}
