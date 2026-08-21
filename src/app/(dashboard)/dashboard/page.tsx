import ExpiryAlertWidget from '@/components/inventory/ExpiryAlertWidget';
import { query, queryOne } from '@/lib/db';
import LowStockStatCard from './LowStockStatCard';
import TopProductsWidget from './TopProducts';

import { Package, Banknote, ShoppingCart, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [trxStats, prodStats, lowStockProducts, topProducts] = await Promise.all([
    queryOne<{ total_transactions: string, total_revenue: string, total_cogs: string }>(`
      SELECT 
        (SELECT COUNT(*) FROM transactions WHERE status = 'completed' AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = DATE(NOW() AT TIME ZONE 'Asia/Jakarta')) as total_transactions,
        (SELECT COALESCE(SUM(total), 0) FROM transactions WHERE status = 'completed' AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = DATE(NOW() AT TIME ZONE 'Asia/Jakarta')) as total_revenue,
        (SELECT COALESCE(SUM(ti.quantity * p.buy_price), 0) 
         FROM transaction_items ti 
         JOIN transactions t ON t.id = ti.transaction_id 
         LEFT JOIN products p ON ti.product_id = p.id 
         WHERE t.status = 'completed' AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = DATE(NOW() AT TIME ZONE 'Asia/Jakarta')) as total_cogs
    `),
    queryOne<{ active_products: string, low_stock_products: string, total_asset_value: string }>(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE is_active = true AND stock <= min_stock) as low_stock_products,
        COALESCE(SUM(stock * buy_price) FILTER (WHERE is_active = true), 0) as total_asset_value
      FROM products
    `),
    query<{ id: string, name: string, sku: string | null, stock: number, min_stock: number }>(`
      SELECT id, name, sku, stock, min_stock
      FROM products
      WHERE is_active = true AND stock <= min_stock
      ORDER BY stock ASC
      LIMIT 100
    `),
    query<{ id: string, name: string, total_sold: string }>(`
      SELECT 
        p.id, 
        p.name, 
        SUM(ti.quantity) as total_sold
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      JOIN products p ON p.id = ti.product_id
      WHERE t.status = 'completed' AND t.created_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta')
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `)
  ]);

  const transactions = parseInt(trxStats?.total_transactions || '0', 10);
  const revenue = parseInt(trxStats?.total_revenue || '0', 10);
  const cogs = parseInt(trxStats?.total_cogs || '0', 10);
  const grossProfit = revenue - cogs;
  
  // Average Order Value (AOV)
  const aov = transactions > 0 ? Math.round(revenue / transactions) : 0;

  const activeProducts = parseInt(prodStats?.active_products || '0', 10);
  const lowStockCount = parseInt(prodStats?.low_stock_products || '0', 10);
  const assetValue = parseInt(prodStats?.total_asset_value || '0', 10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount / 100);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Ringkasan Utama</h2>
        <p className="text-sm text-slate-500 mt-0.5">Pantau kinerja keuangan dan inventaris hari ini</p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Pendapatan (Hari Ini)" 
          value={formatCurrency(revenue)} 
          icon={<Banknote className="w-5 h-5 text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
        <StatCard 
          label="Laba Kotor (Hari Ini)" 
          value={formatCurrency(grossProfit)} 
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard 
          label="Rata-Rata Transaksi (AOV)" 
          value={formatCurrency(aov)} 
          icon={<ShoppingCart className="w-5 h-5 text-purple-600" />}
          bgColor="bg-purple-50"
          subtitle={`${transactions} Transaksi`}
        />
        <StatCard 
          label="Nilai Aset Gudang" 
          value={formatCurrency(assetValue)} 
          icon={<Package className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-50"
          subtitle={`${activeProducts} Produk Aktif`}
        />
      </div>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Alerts) */}
        <div className="lg:col-span-8 space-y-6">
          <ExpiryAlertWidget />
          
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Peringatan Stok</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LowStockStatCard count={lowStockCount} products={lowStockProducts} />
              {/* Future expansion: Out of stock, etc */}
            </div>
          </div>
        </div>

        {/* Right Column (Insights) */}
        <div className="lg:col-span-4 space-y-6">
          <TopProductsWidget products={topProducts.map(p => ({ ...p, total_sold: parseInt(p.total_sold, 10) }))} />
        </div>
        
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, bgColor, subtitle }: { label: string; value: string, icon?: React.ReactNode, bgColor?: string, subtitle?: string }) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl ${bgColor || 'bg-slate-100'}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
