import ReceiveGoodsForm from '@/components/inventory/ReceiveGoodsForm';

export default function NewPurchasePage() {
  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Penerimaan Barang</h2>
        <p className="text-xs text-slate-500 mt-0.5">Catat barang masuk dari supplier dengan kalkulasi Moving Average Cost</p>
      </div>
      <ReceiveGoodsForm />
    </div>
  );
}
