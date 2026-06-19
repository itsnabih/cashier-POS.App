// ============================================================
// Product Types
// ============================================================

export interface Product {
  id: string;
  categoryId: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  buyPrice: number;     // harga modal (BIGINT sen) — owner only
  sellPrice: number;    // harga jual (BIGINT sen)
  stock: number;
  minStock: number;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  expiredDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Product without buy_price — for kasir role */
export type ProductCashierView = Omit<Product, 'buyPrice'>;

export interface ProductRow {
  id: string;
  category_id: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  buy_price: string;   // BIGINT comes as string from pg
  sell_price: string;
  stock: number;
  min_stock: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  expired_date: string | null;
  created_at: string;
  updated_at: string;
}

/** Convert DB row → full product (for owner) */
export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    description: row.description,
    buyPrice: Number(row.buy_price),
    sellPrice: Number(row.sell_price),
    stock: row.stock,
    minStock: row.min_stock,
    unit: row.unit,
    imageUrl: row.image_url,
    isActive: row.is_active,
    expiredDate: row.expired_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert DB row → cashier view (WITHOUT buy_price) */
export function mapProductRowCashier(row: ProductRow): ProductCashierView {
  return {
    id: row.id,
    categoryId: row.category_id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    description: row.description,
    sellPrice: Number(row.sell_price),
    stock: row.stock,
    minStock: row.min_stock,
    unit: row.unit,
    imageUrl: row.image_url,
    isActive: row.is_active,
    expiredDate: row.expired_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
