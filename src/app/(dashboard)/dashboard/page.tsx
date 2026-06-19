import ExpiryAlertWidget from '@/components/inventory/ExpiryAlertWidget';

export default function DashboardPage() {
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

        {/* Placeholder: Quick stats — will be populated in later phases */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Statistik Hari Ini</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Transaksi" value="-" />
            <StatCard label="Pendapatan" value="-" />
            <StatCard label="Produk Aktif" value="-" />
            <StatCard label="Stok Rendah" value="-" />
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
