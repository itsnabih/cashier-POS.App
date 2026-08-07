export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface ReceiptContentProps {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber: string;
  cashierName?: string;
  timestamp: Date | string;
  items: ReceiptItem[];
  subtotal: number;
  itemDiscount?: number;
  cartDiscount?: number;
  totalDiscount: number;
  totalNett: number;
  paymentAmount: number;
  changeAmount: number;
  footerTitle?: string;
  footerSub?: string;
}

export function formatDateTime(d: Date | string): string {
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '-';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return '-';
  }
}

export function formatRupiah(val: number): string {
  const rupiah = Math.round(val / 100);
  return 'Rp ' + rupiah.toLocaleString('id-ID');
}

export function ReceiptContent({
  storeName = 'Sumber Baby Shop',
  storeAddress = 'Jl. Raya Bayi No. 123, Kota Balita',
  storePhone = '0812-3456-7890',
  receiptNumber,
  cashierName = 'Kasir',
  timestamp,
  items,
  subtotal,
  itemDiscount = 0,
  totalDiscount = 0,
  totalNett,
  paymentAmount,
  changeAmount,
  footerTitle = 'TERIMA KASIH',
  footerSub = 'SELAMAT BELANJA KEMBALI',
}: ReceiptContentProps) {
  return (
    <div className="text-xs leading-tight font-mono text-slate-800">
      {/* Header Toko */}
      <div className="text-center mb-3">
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900">{storeName}</h1>
        {storeAddress && (
          <p className="text-[11px] text-slate-600 whitespace-pre-line mt-0.5">{storeAddress}</p>
        )}
        {storePhone && (
          <p className="text-[11px] text-slate-600 mt-0.5">No. HP: {storePhone}</p>
        )}
      </div>

      <div className="border-t border-slate-300 my-2"></div>

      {/* Info Transaksi */}
      <div className="space-y-0.5 text-[11px] mb-2">
        <div className="flex justify-between">
          <span className="text-slate-500">No. Struk</span>
          <span className="font-semibold text-slate-700">{receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Oleh</span>
          <span className="font-medium text-slate-700">{cashierName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tanggal</span>
          <span className="text-slate-700">{formatDateTime(timestamp)}</span>
        </div>
      </div>

      {/* Daftar Barang */}
      <div className="border-t border-b border-dashed border-slate-400 py-2 my-2 space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="font-medium text-slate-900">{item.name}</div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>
                {formatRupiah(item.price)} x {item.quantity}
                {item.discount > 0 && ` (-${formatRupiah(item.discount)})`}
              </span>
              <span className="font-semibold text-slate-800">{formatRupiah(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Rincian Total */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between text-slate-600">
          <span>Sub total</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Total diskon</span>
            <span>-{formatRupiah(totalDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300 text-slate-900">
          <span>Total nett</span>
          <span>{formatRupiah(totalNett)}</span>
        </div>

        <div className="flex justify-between text-slate-700 pt-1">
          <span>Nominal Dibayar</span>
          <span>{formatRupiah(paymentAmount)}</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span>Kembalian</span>
          <span className="font-semibold">{formatRupiah(changeAmount)}</span>
        </div>
      </div>

      <div className="border-t border-slate-300 my-3"></div>

      {/* Footer */}
      <div className="text-center text-[11px] font-bold space-y-0.5 tracking-wide text-slate-900 uppercase">
        <p>{footerTitle || 'TERIMA KASIH'}</p>
        <p>{footerSub || 'SELAMAT BELANJA KEMBALI'}</p>
      </div>
    </div>
  );
}
