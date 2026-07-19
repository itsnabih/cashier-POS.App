export interface CartItem {
  id: string; // unique ID for cart item
  productId: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  unitPrice: number;
  originalPrice: number;
  discount: number; // in monetary amount per item, e.g. 5000
  quantity: number;
  stock: number; // to validate max qty
  unit: string;
}

export interface POSCart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
}
