import StockOpnameTable from '@/components/inventory/StockOpnameTable';

export default function NewStockOpnamePage() {
  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Stok Opname Baru</h2>
        <p className="text-xs text-slate-500 mt-0.5">Bandingkan stok sistem dengan stok fisik. Selisih akan dicatat sebagai penyusutan.</p>
      </div>
      <StockOpnameTable />
    </div>
  );
}
