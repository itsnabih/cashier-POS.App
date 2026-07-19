import { useState, useCallback } from 'react';
import { type CartItem, type POSCart } from '@/types/pos';
import { type ProductCashierView } from '@/types/product';
import { calculateProductDiscount } from '@/lib/discount';

const MAX_TABS = 5;

const createEmptyCart = (): POSCart => ({
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,
});

export function usePOS(settings: Record<string, string> = {}) {
  const [tabs, setTabs] = useState<POSCart[]>(Array(MAX_TABS).fill(null).map(createEmptyCart));
  const [activeTab, setActiveTab] = useState<number>(0);

  const switchTab = useCallback((index: number) => {
    if (index >= 0 && index < MAX_TABS) {
      setActiveTab(index);
    }
  }, []);

  const calculateCart = (items: CartItem[]): POSCart => {
    // subtotal = original price * quantity
    const subtotal = items.reduce((acc, item) => acc + item.originalPrice * item.quantity, 0);
    // discount = total discount per item * quantity
    const discount = items.reduce((acc, item) => acc + item.discount * item.quantity, 0);
    const total = subtotal - discount;
    return { items, subtotal, discount, total };
  };

  const updateCurrentTab = useCallback((updater: (cart: POSCart) => CartItem[]) => {
    setTabs((prev) => {
      const newTabs = [...prev];
      const currentCart = newTabs[activeTab];
      const newItems = updater(currentCart);
      newTabs[activeTab] = calculateCart(newItems);
      return newTabs;
    });
  }, [activeTab]);

  const addToCart = useCallback((product: ProductCashierView) => {
    updateCurrentTab((cart) => {
      const existing = cart.items.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          // Cannot add more than stock
          return cart.items;
        }
        return cart.items.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        if (product.stock <= 0) return cart.items;
        
        // Calculate dynamic discount based on parameters
        const discountPct = calculateProductDiscount(product, settings);
        const discountAmount = Math.floor(product.sellPrice * (discountPct / 100));
        const finalPrice = product.sellPrice - discountAmount;

        return [
          ...cart.items,
          {
            id: crypto.randomUUID(),
            productId: product.id,
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            originalPrice: product.sellPrice,
            unitPrice: finalPrice,
            discount: discountAmount,
            quantity: 1,
            stock: product.stock,
            unit: product.unit,
          },
        ];
      }
    });
  }, [updateCurrentTab, settings]);

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    updateCurrentTab((cart) => {
      return cart.items.map((item) => {
        if (item.id === cartItemId) {
          const newQ = item.quantity + delta;
          if (newQ > 0 && newQ <= item.stock) {
            return { ...item, quantity: newQ };
          }
        }
        return item;
      });
    });
  }, [updateCurrentTab]);

  const setQuantity = useCallback((cartItemId: string, quantity: number) => {
    updateCurrentTab((cart) => {
      return cart.items.map((item) => {
        if (item.id === cartItemId) {
          if (quantity > 0 && quantity <= item.stock) {
            return { ...item, quantity };
          }
        }
        return item;
      });
    });
  }, [updateCurrentTab]);

  const removeFromCart = useCallback((cartItemId: string) => {
    updateCurrentTab((cart) => cart.items.filter((i) => i.id !== cartItemId));
  }, [updateCurrentTab]);

  const clearTab = useCallback((index: number) => {
    setTabs((prev) => {
      const newTabs = [...prev];
      newTabs[index] = createEmptyCart();
      return newTabs;
    });
  }, []);

  const clearCurrentTab = useCallback(() => {
    clearTab(activeTab);
  }, [activeTab, clearTab]);

  return {
    tabs,
    activeTab,
    currentCart: tabs[activeTab],
    switchTab,
    addToCart,
    updateQuantity,
    setQuantity,
    removeFromCart,
    clearCurrentTab,
    clearTab,
  };
}
