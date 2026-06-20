import { useState, useEffect, useRef } from 'react';
import { type ProductCashierView } from '@/types/product';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

interface ProductSearchProps {
  onAddProduct: (product: ProductCashierView) => void;
  /** Whether the app is online. If false, uses searchOffline. */
  isOnline?: boolean;
  /** Offline search function from useCatalogSync. */
  searchOffline?: (query: string) => Promise<ProductCashierView[]>;
}

export function ProductSearch({ onAddProduct, isOnline = true, searchOffline }: ProductSearchProps) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductCashierView[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Scroll into view when selectedIndex changes
  useEffect(() => {
    const selectedEl = itemRefs.current[selectedIndex];
    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Fetch products (online or offline)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (!isOnline && searchOffline) {
          // Offline: search from IndexedDB
          const results = await searchOffline(search);
          setProducts(results);
          setSelectedIndex(0);
        } else {
          // Online: fetch from API
          const params = new URLSearchParams({ limit: '20' });
          if (search) params.set('search', search);
          const res = await fetch(`/api/products?${params}`);
          const data = await res.json();
          if (data.success) {
            setProducts(data.data);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch products', err);
        // If API fails, try offline fallback
        if (searchOffline) {
          try {
            const results = await searchOffline(search);
            setProducts(results);
            setSelectedIndex(0);
          } catch {
            // IndexedDB also failed
          }
        }
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeout);
  }, [search, isOnline, searchOffline]);

  // Handle Keyboard navigation within the product list
  useKeyboardShortcut([
    {
      options: { key: 'ArrowDown', preventDefault: true },
      handler: () => {
        setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1));
      },
    },
    {
      options: { key: 'ArrowUp', preventDefault: true },
      handler: () => {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      },
    },
    {
      options: { key: 'Enter', preventDefault: true },
      handler: () => {
        // If searching and hit enter, add the selected product
        if (products.length > 0 && products[selectedIndex]) {
          onAddProduct(products[selectedIndex]);
        }
      },
    },
    {
      options: { key: 'Escape' },
      handler: () => {
        setSearch('');
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
    },
  ]);

  // Ensure search input stays focused or can be easily focused
  // In a true mouseless POS, we want typing to automatically focus search
  // We can attach a global keydown for alphanumeric keys if nothing else is focused
  useEffect(() => {
    const handleGlobalTyping = (e: KeyboardEvent) => {
      // Ignore if pressing modifiers, function keys, or if currently in an input
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalTyping);
    return () => window.removeEventListener('keydown', handleGlobalTyping);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4">
      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama, SKU, atau barcode produk..."
            className="w-full px-4 py-3 text-lg border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white pr-24"
            autoFocus
          />
          {!isOnline && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200">
              Offline Mode
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-2 flex gap-4">
          <span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">↑</kbd> <kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">↓</kbd> Navigasi</span>
          <span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">Enter</kbd> Tambah</span>
          <span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">Esc</kbd> Bersihkan</span>
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200">
        {loading && products.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Mencari produk...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Produk tidak ditemukan.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {products.map((product, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <li
                  key={product.id}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                  onClick={() => {
                    setSelectedIndex(idx);
                    onAddProduct(product);
                  }}
                >
                  <div>
                    <h3 className={`font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.barcode && <span>Barcode: {product.barcode}</span>}
                      <span>Stok: <span className={product.stock <= 0 ? 'text-red-500 font-bold' : ''}>{product.stock}</span> {product.unit}</span>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                    Rp {(product.sellPrice / 100).toLocaleString('id-ID')}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
