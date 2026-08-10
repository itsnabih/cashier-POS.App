// ============================================================
// PDF Export Utility
//
// Uses pdfmake in the browser to generate PDF files
// with formatted tables, headers, and currency formatting.
// ============================================================

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Register fonts
if (typeof window !== 'undefined') {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;
}

// ---- Format currency ----
function fmtRp(cents: number): string {
  return 'Rp ' + (cents / 100).toLocaleString('id-ID');
}

// ---- Format date to dd/mm/yyyy ----
function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

// ---- Common styles ----
const STYLES = {
  header: { fontSize: 16, bold: true, alignment: 'center' as const, margin: [0, 0, 0, 4] as [number, number, number, number] },
  subheader: { fontSize: 10, alignment: 'center' as const, color: '#666666', margin: [0, 0, 0, 16] as [number, number, number, number] },
  tableHeader: { bold: true, fontSize: 9, color: '#FFFFFF', fillColor: '#4F46E5' },
  tableCell: { fontSize: 9 },
  tableCellRight: { fontSize: 9, alignment: 'right' as const },
  summaryLabel: { fontSize: 10, bold: true },
  summaryValue: { fontSize: 10 },
};

function generateFooter(): any {
  return {
    text: `Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB — Sumber Baby shop`,
    alignment: 'center',
    fontSize: 7,
    color: '#999999',
    margin: [0, 8, 0, 0],
  };
}

// ============================================================
// Export Profit/Loss PDF
// ============================================================

interface ProfitLossData {
  period: { from: string; to: string };
  summary: {
    transactionCount: number;
    totalRevenue: number;
    totalCogs: number;
    totalProfit: number;
    marginPercent: number;
  };
  daily: Array<{
    date: string;
    revenue: number;
    cogs: number;
    profit: number;
    marginPercent: number;
  }>;
}

export function exportProfitLossPDF(data: ProfitLossData) {
  const tableBody = [
    [
      { text: 'Tanggal', style: 'tableHeader' },
      { text: 'Omset', style: 'tableHeader', alignment: 'right' as const },
      { text: 'HPP', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Profit', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Margin', style: 'tableHeader', alignment: 'right' as const },
    ],
    ...data.daily.map((row) => [
      { text: fmtDate(row.date), style: 'tableCell' },
      { text: fmtRp(row.revenue), style: 'tableCellRight' },
      { text: fmtRp(row.cogs), style: 'tableCellRight' },
      { text: fmtRp(row.profit), style: 'tableCellRight', color: row.profit >= 0 ? '#16A34A' : '#DC2626' },
      { text: `${row.marginPercent}%`, style: 'tableCellRight' },
    ]),
  ];

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: 'Laporan Laba Rugi', style: 'header' },
      { text: `Periode: ${data.period.from} s/d ${data.period.to}`, style: 'subheader' },

      // Summary cards
      {
        columns: [
          { text: [{ text: 'Total Omset\n', style: 'summaryLabel' }, { text: fmtRp(data.summary.totalRevenue), fontSize: 12, bold: true }] },
          { text: [{ text: 'Total HPP\n', style: 'summaryLabel' }, { text: fmtRp(data.summary.totalCogs), fontSize: 12 }] },
          { text: [{ text: 'Total Profit\n', style: 'summaryLabel' }, { text: fmtRp(data.summary.totalProfit), fontSize: 12, bold: true, color: data.summary.totalProfit >= 0 ? '#16A34A' : '#DC2626' }] },
          { text: [{ text: 'Margin\n', style: 'summaryLabel' }, { text: `${data.summary.marginPercent}%`, fontSize: 12 }] },
        ],
        margin: [0, 0, 0, 16],
      },

      // Table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#E2E8F0',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },

      generateFooter(),
    ],
    styles: STYLES,
  };

  pdfMake.createPdf(docDefinition).download(`laba-rugi_${data.period.from}_${data.period.to}.pdf`);
}

// ============================================================
// Export Cash Flow PDF
// ============================================================

interface CashFlowData {
  period: { from: string; to: string };
  summary: { grandTotal: number; transactionCount: number };
  byMethod: Array<{
    method: string;
    transactionCount: number;
    totalAmount: number;
    percentage: number;
  }>;
  daily: Array<{
    date: string;
    transactionCount: number;
    totalAmount: number;
    cashAmount: number;
    qrisAmount: number;
    transferAmount: number;
  }>;
}

export function exportCashFlowPDF(data: CashFlowData) {
  const methodLabel = (m: string) => m === 'cash' ? 'Tunai' : m === 'qris' ? 'QRIS' : 'Transfer';

  const methodBody = [
    [
      { text: 'Metode', style: 'tableHeader' },
      { text: 'Jumlah Trx', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Total', style: 'tableHeader', alignment: 'right' as const },
      { text: '%', style: 'tableHeader', alignment: 'right' as const },
    ],
    ...data.byMethod.map((m) => [
      { text: methodLabel(m.method), style: 'tableCell' },
      { text: String(m.transactionCount), style: 'tableCellRight' },
      { text: fmtRp(m.totalAmount), style: 'tableCellRight' },
      { text: `${m.percentage}%`, style: 'tableCellRight' },
    ]),
  ];

  const dailyBody = [
    [
      { text: 'Tanggal', style: 'tableHeader' },
      { text: 'Trx', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Total', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Tunai', style: 'tableHeader', alignment: 'right' as const },
      { text: 'QRIS', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Transfer', style: 'tableHeader', alignment: 'right' as const },
    ],
    ...data.daily.map((d) => [
      { text: fmtDate(d.date), style: 'tableCell' },
      { text: String(d.transactionCount), style: 'tableCellRight' },
      { text: fmtRp(d.totalAmount), style: 'tableCellRight' },
      { text: fmtRp(d.cashAmount), style: 'tableCellRight' },
      { text: fmtRp(d.qrisAmount), style: 'tableCellRight' },
      { text: fmtRp(d.transferAmount), style: 'tableCellRight' },
    ]),
  ];

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: 'Laporan Arus Kas', style: 'header' },
      { text: `Periode: ${data.period.from} s/d ${data.period.to}`, style: 'subheader' },
      { text: `Grand Total: ${fmtRp(data.summary.grandTotal)}`, fontSize: 12, bold: true, margin: [0, 0, 0, 12] },

      { text: 'Ringkasan per Metode Pembayaran', fontSize: 11, bold: true, margin: [0, 0, 0, 6] },
      {
        table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'], body: methodBody },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#E2E8F0', paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4 },
      },

      { text: 'Detail Harian', fontSize: 11, bold: true, margin: [0, 16, 0, 6] },
      {
        table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'], body: dailyBody },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#E2E8F0', paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4 },
      },

      generateFooter(),
    ],
    styles: STYLES,
  };

  pdfMake.createPdf(docDefinition).download(`arus-kas_${data.period.from}_${data.period.to}.pdf`);
}

// ============================================================
// Export Best Sellers PDF
// ============================================================

interface BestSellersData {
  period: { from: string; to: string };
  summary: { totalQuantity: number; totalRevenue: number; transactionCount: number };
  products: Array<{
    rank: number;
    productName: string;
    productSku: string | null;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
  }>;
}

export function exportBestSellersPDF(data: BestSellersData) {
  const tableBody = [
    [
      { text: '#', style: 'tableHeader' },
      { text: 'Produk', style: 'tableHeader' },
      { text: 'SKU', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Penjualan', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Trx', style: 'tableHeader', alignment: 'right' as const },
    ],
    ...data.products.map((p) => [
      { text: String(p.rank), style: 'tableCell' },
      { text: p.productName, style: 'tableCell' },
      { text: p.productSku || '-', style: 'tableCell' },
      { text: String(p.totalQuantity), style: 'tableCellRight' },
      { text: fmtRp(p.totalRevenue), style: 'tableCellRight' },
      { text: String(p.transactionCount), style: 'tableCellRight' },
    ]),
  ];

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: 'Laporan Penjualan per Barang', style: 'header' },
      { text: `Periode: ${data.period.from} s/d ${data.period.to}`, style: 'subheader' },

      {
        columns: [
          { text: [{ text: 'Total Qty\n', style: 'summaryLabel' }, { text: String(data.summary.totalQuantity), fontSize: 12, bold: true }] },
          { text: [{ text: 'Total Penjualan\n', style: 'summaryLabel' }, { text: fmtRp(data.summary.totalRevenue), fontSize: 12, bold: true }] },
          { text: [{ text: 'Total Transaksi\n', style: 'summaryLabel' }, { text: String(data.summary.transactionCount), fontSize: 12 }] },
        ],
        margin: [0, 0, 0, 16],
      },

      {
        table: { headerRows: 1, widths: [20, '*', 60, 40, 'auto', 30], body: tableBody },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#E2E8F0', paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4 },
      },

      generateFooter(),
    ],
    styles: STYLES,
  };

  pdfMake.createPdf(docDefinition).download(`best-seller_${data.period.from}_${data.period.to}.pdf`);
}

// ============================================================
// Export Receipt PDF (A4 Format)
// ============================================================

export interface ReceiptPDFData {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptNumber: string;
  cashierName?: string;
  timestamp: Date | string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    discount: number;
    subtotal: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalNett: number;
  paymentAmount: number;
  changeAmount: number;
  footerTitle?: string;
  footerSub?: string;
  isVoided?: boolean;
}

export function exportReceiptPDF(data: ReceiptPDFData) {
  const storeName = data.storeName || 'Sumber Baby Shop';
  const storeAddress = data.storeAddress || 'Jl. Raya Bayi No. 123, Kota Balita';
  const storePhone = data.storePhone || '0812-3456-7890';
  const cashierName = data.cashierName || 'Kasir';
  const footerTitle = data.footerTitle || 'TERIMA KASIH';
  const footerSub = data.footerSub || 'SELAMAT BELANJA KEMBALI';

  let dateFormatted = '-';
  try {
    const d = typeof data.timestamp === 'string' ? new Date(data.timestamp) : data.timestamp;
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    }
  } catch {
    dateFormatted = String(data.timestamp);
  }

  const tableBody = [
    [
      { text: '#', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Nama Produk', style: 'tableHeader' },
      { text: 'Harga Satuan', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Diskon', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Subtotal', style: 'tableHeader', alignment: 'right' as const },
    ],
    ...data.items.map((item, idx) => [
      { text: String(idx + 1), style: 'tableCell', alignment: 'center' as const },
      { text: item.name, style: 'tableCell' },
      { text: fmtRp(item.price), style: 'tableCellRight' },
      { text: String(item.quantity), style: 'tableCell', alignment: 'center' as const },
      { text: item.discount > 0 ? `-${fmtRp(item.discount * item.quantity)}` : '-', style: 'tableCellRight', color: item.discount > 0 ? '#16A34A' : '#666666' },
      { text: fmtRp(item.subtotal), style: 'tableCellRight', bold: true },
    ]),
  ];

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: storeName.toUpperCase(), style: 'header' },
      { text: `${storeAddress}${storePhone ? ' | Telp: ' + storePhone : ''}`, style: 'subheader' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#4F46E5' }] },
      
      { text: data.isVoided ? '*** STRUK DIBATALKAN (VOIDED) ***' : 'STRUK PEMBAYARAN', fontSize: 13, bold: true, alignment: 'center', color: data.isVoided ? '#DC2626' : '#1E293B', margin: [0, 12, 0, 12] },

      // Transaction Metadata Box
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: [{ text: 'No. Struk: ', bold: true }, data.receiptNumber], fontSize: 9 },
              { text: [{ text: 'Tanggal: ', bold: true }, dateFormatted], fontSize: 9, alignment: 'right' as const },
            ],
            [
              { text: [{ text: 'Kasir: ', bold: true }, cashierName], fontSize: 9 },
              { text: [{ text: 'Status: ', bold: true }, data.isVoided ? 'VOIDED' : 'LUNAS'], fontSize: 9, alignment: 'right' as const, color: data.isVoided ? '#DC2626' : '#16A34A' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 16],
      },

      // Items Table
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 80, 35, 75, 85],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#4F46E5' : '#E2E8F0',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 16],
      },

      // Summary Breakdown
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Subtotal:', fontSize: 9, color: '#475569' }, { text: fmtRp(data.subtotal), fontSize: 9, alignment: 'right' as const }],
                ...(data.totalDiscount > 0
                  ? [[{ text: 'Total Diskon:', fontSize: 9, color: '#16A34A' }, { text: `-${fmtRp(data.totalDiscount)}`, fontSize: 9, alignment: 'right' as const, color: '#16A34A' }]]
                  : []),
                [{ text: 'Total Nett:', fontSize: 10, bold: true, color: '#0F172A' }, { text: fmtRp(data.totalNett), fontSize: 10, bold: true, alignment: 'right' as const, color: '#4F46E5' }],
                [{ text: 'Nominal Dibayar:', fontSize: 9, color: '#475569' }, { text: fmtRp(data.paymentAmount), fontSize: 9, alignment: 'right' as const }],
                [{ text: 'Kembalian:', fontSize: 9, bold: true, color: '#0F172A' }, { text: fmtRp(data.changeAmount), fontSize: 9, bold: true, alignment: 'right' as const }],
              ],
            },
            layout: {
              hLineWidth: (i: number) => i === 2 ? 1 : 0,
              vLineWidth: () => 0,
              hLineColor: () => '#CBD5E1',
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },
        ],
        margin: [0, 0, 0, 24],
      },

      // Footer
      {
        text: `${footerTitle}\n${footerSub}`,
        alignment: 'center',
        fontSize: 10,
        bold: true,
        color: '#334155',
        margin: [0, 12, 0, 0],
      },

      generateFooter(),
    ],
    styles: STYLES,
  };

  pdfMake.createPdf(docDefinition).download(`struk_${data.receiptNumber}.pdf`);
}

