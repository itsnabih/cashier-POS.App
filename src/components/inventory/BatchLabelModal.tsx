'use client';

import { useState } from 'react';
import { Printer, X, Tag } from 'lucide-react';

interface BatchLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    productName: string;
    productSku?: string | null;
    barcode?: string | null;
    batchNumber: string;
    expiredDate?: string | null;
    sellPrice?: number;
    quantity: number;
  }>;
}

export function BatchLabelModal({ isOpen, onClose, items }: BatchLabelModalProps) {
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'50x30' | '40x20'>('50x30');

  if (!isOpen || items.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val / 100);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md print:bg-transparent print:p-0">
      
      {/* SCREEN UI */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 print:hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-baby-50 text-baby-600 flex items-center justify-center font-semibold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cetak Label Barcode Batch</h3>
              <p className="text-xs text-slate-500">Cetak stiker barcode untuk barang masuk</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700">Ukuran Label:</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as '50x30' | '40x20')}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white font-medium"
            >
              <option value="50x30">50mm x 30mm (Standar)</option>
              <option value="40x20">40mm x 20mm (Kecil)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700">Jml Cetak per Item:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={copiesPerItem}
              onChange={(e) => setCopiesPerItem(Math.max(1, Number(e.target.value)))}
              className="w-16 px-2 py-1 border border-slate-300 rounded text-center bg-white font-bold"
            />
            <span className="text-slate-500">stiker</span>
          </div>
        </div>

        {/* Label Preview Grid */}
        <div className="p-6 overflow-y-auto max-h-[50vh] bg-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-3 border border-slate-300 rounded-lg shadow-sm font-mono text-center flex flex-col justify-between items-center h-32 text-black"
              >
                <div className="w-full">
                  <p className="text-[10px] font-bold truncate leading-tight">{item.productName}</p>
                  <p className="text-[9px] text-slate-500">SKU: {item.productSku || '-'}</p>
                </div>

                {/* Barcode Visual Representation */}
                <div className="my-1 text-center">
                  <div className="tracking-[2px] font-bold text-xs uppercase px-1 py-0.5 border border-dashed border-slate-400 bg-slate-50 rounded">
                    |||| || |||||| | |||
                  </div>
                  <p className="text-[9px] font-bold mt-0.5 tracking-wider">{item.barcode || item.productSku || 'BARCODE'}</p>
                </div>

                <div className="w-full flex justify-between items-center text-[8px] border-t border-slate-200 pt-1 text-slate-700">
                  <span>No: <strong className="font-mono">{item.batchNumber}</strong></span>
                  {item.expiredDate && (
                    <span>EXP: <strong>{item.expiredDate}</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 text-xs transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-baby-600 text-white font-bold rounded-xl hover:bg-baby-700 text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Label Stiker</span>
          </button>
        </div>
      </div>

      {/* PRINT-ONLY STICKER LAYOUT */}
      <div className="hidden print:block w-full bg-white text-black p-0 m-0">
        <div className="flex flex-wrap gap-2">
          {items.flatMap((item, idx) =>
            Array.from({ length: copiesPerItem || 1 }).map((_, copyIdx) => (
              <div
                key={`${idx}-${copyIdx}`}
                className={`border border-black text-center flex flex-col justify-between items-center p-1 font-mono break-inside-avoid ${
                  labelSize === '50x30' ? 'w-[50mm] h-[30mm]' : 'w-[40mm] h-[20mm]'
                }`}
              >
                <p className="text-[9px] font-bold truncate w-full">{item.productName}</p>
                <div className="text-[10px] tracking-widest font-bold my-0.5">
                  |||| || |||||| | |||
                </div>
                <p className="text-[8px] font-bold tracking-wider">{item.barcode || item.productSku || item.batchNumber}</p>
                <div className="w-full flex justify-between text-[7px]">
                  <span>LOT: {item.batchNumber}</span>
                  {item.expiredDate && <span>EXP: {item.expiredDate}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
