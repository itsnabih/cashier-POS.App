import ExpiryAlertWidget from '@/components/inventory/ExpiryAlertWidget';
import { query, queryOne } from '@/lib/db';
import LowStockStatCard from './LowStockStatCard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [trxStats, prodStats, lowStockProducts] = await Promise.all([
    queryOne<{ total_transactions: string, total_revenue: string }>(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(total), 0) as total_revenue
      FROM transactions 
      WHERE status = 'completed' AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = DATE(NOW() AT TIME ZONE 'Asia/Jakarta')
    `),
    queryOne<{ active_products: string, low_stock_products: string }>(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE is_active = true AND stock <= min_stock) as low_stock_products
      FROM products
    `),
    query<{ id: string, name: string, sku: string | null, stock: number, min_stock: number }>(`
      SELECT id, name, sku, stock, min_stock
      FROM products
      WHERE is_active = true AND stock <= min_stock
      ORDER BY stock ASC
      LIMIT 100
    `)
  ]);

  const transactions = parseInt(trxStats?.total_transactions || '0', 10);
  const revenue = parseInt(trxStats?.total_revenue || '0', 10);
  const activeProducts = parseInt(prodStats?.active_products || '0', 10);
  const lowStockCount = parseInt(prodStats?.low_stock_products || '0', 10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Ringkasan</h2>
        <p className="text-sm text-slate-500 mt-0.5">Pantau kondisi inventaris dan operasional toko</p>
      </div>

      {/* Widgets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Alert */}
        <ExpiryAlertWidget />

        {/* Quick stats */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Statistik Hari Ini</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Transaksi" value={transactions.toString()} />
            <StatCard label="Pendapatan" value={formatCurrency(revenue)} />
            <StatCard label="Produk Aktif" value={activeProducts.toString()} />
            <LowStockStatCard count={lowStockCount} products={lowStockProducts} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-md">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-800 mt-1 tabular-nums">{value}</p>
    </div>
  );
}
