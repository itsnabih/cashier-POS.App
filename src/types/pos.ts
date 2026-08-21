export interface CartItem {
  id: string; // unique ID for cart item
  productId: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  unitPrice: number;
  originalPrice: number;
  discount: number; // total discount per item (auto + manual), in monetary amount
  autoDiscount: number; // system-generated discount (near-expiry / slow-moving)
  manualDiscount: number; // manual discount applied by cashier, in monetary amount per item
  manualDiscountType: 'nominal' | 'percent'; // how the cashier specified the manual discount
  manualDiscountValue: number; // raw value entered by cashier (e.g. 5000 or 10)
  quantity: number;
  stock: number; // to validate max qty
  unit: string;
}

export interface POSCart {
  items: CartItem[];
  subtotal: number;
  discount: number; // total item-level discount
  manualCartDiscount: number; // manual cart-level discount applied by cashier
  manualCartDiscountType: 'nominal' | 'percent'; // how the cashier specified it
  manualCartDiscountValue: number; // raw value entered by cashier
  total: number;
}
