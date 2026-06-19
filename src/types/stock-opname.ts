// ============================================================
// Stock Opname Types
// ============================================================

export interface StockOpname {
  id: string;
  opnameNumber: string;
  conductedBy: string;
  conductedByName?: string;
  status: 'in_progress' | 'finalized' | 'cancelled';
  totalShrinkage: number;
  totalSurplus: number;
  notes: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: StockOpnameItem[];
}

export interface StockOpnameItem {
  id: string;
  opnameId: string;
  productId: string;
  productName: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  unitCost: number;
  lossValue: number;
  reason: string | null;
}

export interface StockOpnameRow {
  id: string;
  opname_number: string;
  conducted_by: string;
  conducted_by_name?: string;
  status: 'in_progress' | 'finalized' | 'cancelled';
  total_shrinkage: string;
  total_surplus: string;
  notes: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockOpnameItemRow {
  id: string;
  opname_id: string;
  product_id: string;
  product_name: string;
  system_stock: number;
  physical_stock: number;
  difference: number;
  unit_cost: string;
  loss_value: string;
  reason: string | null;
}

export function mapStockOpnameRow(row: StockOpnameRow): StockOpname {
  return {
    id: row.id,
    opnameNumber: row.opname_number,
    conductedBy: row.conducted_by,
    conductedByName: row.conducted_by_name,
    status: row.status,
    totalShrinkage: Number(row.total_shrinkage),
    totalSurplus: Number(row.total_surplus),
    notes: row.notes,
    finalizedAt: row.finalized_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapStockOpnameItemRow(row: StockOpnameItemRow): StockOpnameItem {
  return {
    id: row.id,
    opnameId: row.opname_id,
    productId: row.product_id,
    productName: row.product_name,
    systemStock: row.system_stock,
    physicalStock: row.physical_stock,
    difference: row.difference,
    unitCost: Number(row.unit_cost),
    lossValue: Number(row.loss_value),
    reason: row.reason,
  };
}
