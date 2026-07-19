import { useState, useEffect, useRef } from 'react';
import { type ProductCashierView } from '@/types/product';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { calculateProductDiscount } from '@/lib/discount';

interface ProductSearchProps {
  onAddProduct: (product: ProductCashierView) => void;
  /** Whether the app is online. If false, uses searchOffline. */
  isOnline?: boolean;
  /** Offline search function from useCatalogSync. */
  searchOffline?: (query: string, categoryId?: string) => Promise<ProductCashierView[]>;
  /** Whether to disable global keyboard listeners (e.g. when a modal is open) */
  disabled?: boolean;
  /** Application settings for discount logic */
  settings?: Record<string, string>;
}

export function ProductSearch({ onAddProduct, isOnline = true, searchOffline, disabled = false, settings = {} }: ProductSearchProps) {
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductCashierView[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySelectedIndex, setCategorySelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const categoryItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories?all=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch(() => { });
  }, []);

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

  // Scroll into view when categorySelectedIndex changes
  useEffect(() => {
    if (isCategoryOpen) {
      const selectedEl = categoryItemRefs.current[categorySelectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [categorySelectedIndex, isCategoryOpen]);

  // Fetch products (online or offline)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (!isOnline && searchOffline) {
          // Offline: search from IndexedDB
          const results = await searchOffline(search, selectedCategory);
          setProducts(results);
          setSelectedIndex(0);
        } else {
          // Online: fetch from API
          const params = new URLSearchParams({ limit: '20' });
          if (search) params.set('search', search);
          if (selectedCategory) params.set('category', selectedCategory);
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
            const results = await searchOffline(search, selectedCategory);
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
  }, [search, selectedCategory, isOnline, searchOffline]);

  // Handle Keyboard navigation
  useKeyboardShortcut([
    {
      options: { key: 'ArrowDown', preventDefault: true, enabled: !disabled },
      handler: () => {
        if (isCategoryOpen) {
          setCategorySelectedIndex((prev) => Math.min(prev + 1, categories.length)); // +1 for "Semua Kategori"
        } else {
          setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1));
        }
      },
    },
    {
      options: { key: 'ArrowUp', preventDefault: true, enabled: !disabled },
      handler: () => {
        if (isCategoryOpen) {
          setCategorySelectedIndex((prev) => Math.max(prev - 1, 0));
        } else {
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        }
      },
    },
    {
      options: { key: 'Enter', preventDefault: true, enabled: !disabled },
      handler: () => {
        if (isCategoryOpen) {
          // Select category
          const newCatId = categorySelectedIndex === 0 ? '' : categories[categorySelectedIndex - 1].id;
          setSelectedCategory(newCatId);
          setIsCategoryOpen(false);
          setSelectedIndex(0); // Reset product selection
          searchInputRef.current?.focus();
        } else {
          // Add product
          if (products.length > 0 && products[selectedIndex]) {
            onAddProduct(products[selectedIndex]);
          }
        }
      },
    },
    {
      options: { key: 'Escape', enabled: !disabled },
      handler: () => {
        if (isCategoryOpen) {
          setIsCategoryOpen(false);
          searchInputRef.current?.focus();
        } else {
          setSearch('');
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }
      },
    },
  ]);

  // Ensure search input stays focused or can be easily focused
  // In a true mouseless POS, we want typing to automatically focus search
  // We can attach a global keydown for alphanumeric keys if nothing else is focused
  useEffect(() => {
    const handleGlobalTyping = (e: KeyboardEvent) => {
      if (disabledRef.current) return;

      // If pressing Shift, toggle focus between category dropdown and search input
      if (e.key === 'Shift') {
        e.preventDefault();
        setIsCategoryOpen((prev) => {
          const nextState = !prev;
          if (nextState) {
            // About to open, sync selection index
            const currentIdx = selectedCategory === '' ? 0 : categories.findIndex(c => c.id === selectedCategory) + 1;
            setCategorySelectedIndex(currentIdx >= 0 ? currentIdx : 0);
          } else {
            // Closing, return focus to search
            searchInputRef.current?.focus();
          }
          return nextState;
        });
        return;
      }

      // If category dropdown is open, do not handle global typing (let them navigate)
      if (isCategoryOpen) return;

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
    <div className="flex flex-col h-full bg-transparent">
      {/* Search Bar & Category */}
      <div className="p-4 bg-transparent shrink-0 space-y-4">
        <div className="flex gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="px-3 py-2.5 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-sky bg-white shadow-sm min-w-[140px] text-sm font-semibold text-slate-700 text-left flex justify-between items-center h-full transition-all hover-lift"
            >
              <span className="truncate pr-2">
                {selectedCategory === '' ? 'Semua Kategori' : categories.find(c => c.id === selectedCategory)?.name || 'Kategori'}
              </span>
              <svg className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Custom Category Dropdown Menu */}
            {isCategoryOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white/90 backdrop-blur-xl border border-sky-100 shadow-2xl rounded-xl z-50 py-2 max-h-[300px] overflow-y-auto animate-in">
                <div
                  ref={(el) => { categoryItemRefs.current[0] = el; }}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors ${categorySelectedIndex === 0 ? 'bg-brand-sky-light text-brand-blue font-bold' : 'text-slate-600 hover:bg-sky-50'}`}
                  onClick={() => {
                    setSelectedCategory('');
                    setIsCategoryOpen(false);
                    setSelectedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                >
                  Semua Kategori
                </div>
                {categories.map((c, idx) => {
                  const isActive = categorySelectedIndex === idx + 1;
                  return (
                    <div
                      key={c.id}
                      ref={(el) => { categoryItemRefs.current[idx + 1] = el; }}
                      className={`px-4 py-2 text-sm cursor-pointer transition-colors ${isActive ? 'bg-brand-sky-light text-brand-blue font-bold' : 'text-slate-600 hover:bg-sky-50'}`}
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setIsCategoryOpen(false);
                        setSelectedIndex(0);
                        searchInputRef.current?.focus();
                      }}
                    >
                      {c.name}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Ketik nama, SKU, atau barcode produk..."
              className="w-full px-4 py-2.5 pl-4 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-sky shadow-sm text-slate-800 bg-white placeholder-slate-400 font-medium transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={() => setIsCategoryOpen(false)}
            />
          </div>
        </div>
        <div className="flex gap-4 text-[11px] text-slate-400 font-semibold px-1">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded shadow-sm bg-white border border-slate-200 text-slate-600 font-sans font-bold">Shift</kbd> Kategori
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded shadow-sm bg-white border border-slate-200 text-slate-600 font-sans font-bold">↑</kbd>
            <kbd className="px-2 py-0.5 rounded shadow-sm bg-white border border-slate-200 text-slate-600 font-sans font-bold">↓</kbd> Navigasi
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded shadow-sm bg-white border border-slate-200 text-slate-600 font-sans font-bold">Enter</kbd> Tambah
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded shadow-sm bg-white border border-slate-200 text-slate-600 font-sans font-bold">Esc</kbd> Bersihkan
          </span>
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-sm rounded-xl shadow-sm border border-sky-50 mt-2">
        {loading && products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Mencari produk...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Produk tidak ditemukan.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((product, idx) => {
              const isSelected = idx === selectedIndex;
              const discountPct = calculateProductDiscount(product, settings);
              const hasDiscount = discountPct > 0;
              const discountAmount = hasDiscount ? Math.floor(product.sellPrice * (discountPct / 100)) : 0;
              const finalPrice = product.sellPrice - discountAmount;

              return (
                <li
                  key={product.id}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-all duration-200 mx-2 my-1 rounded-xl relative ${isSelected ? 'bg-brand-sky-light/40 border border-brand-sky-light shadow-sm scale-[1.01]' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  onClick={() => {
                    setSelectedIndex(idx);
                    onAddProduct(product);
                  }}
                >
                  {hasDiscount && (
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-in zoom-in">
                      -{discountPct}%
                    </div>
                  )}
                  <div>
                    <h3 className={`font-bold flex items-center gap-2 ${isSelected ? 'text-brand-blue' : 'text-slate-800'}`}>
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.barcode && <span>Barcode: {product.barcode}</span>}
                      <span>Stok: <span className={product.stock <= 0 ? 'text-red-500 font-bold' : 'text-slate-700 font-bold'}>{product.stock}</span> {product.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasDiscount && (
                      <div className="text-[10px] text-slate-400 line-through">
                        Rp {(product.sellPrice / 100).toLocaleString('id-ID')}
                      </div>
                    )}
                    <div className={`text-lg font-bold ${isSelected ? 'text-brand-blue-dark' : 'text-slate-700'}`}>
                      Rp {(finalPrice / 100).toLocaleString('id-ID')}
                    </div>
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
