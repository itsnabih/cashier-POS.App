// ============================================================
// Excel Export Utility
//
// Uses ExcelJS in the browser to generate .xlsx files
// with formatted headers, currency columns, and auto-widths.
// ============================================================

import ExcelJS from 'exceljs';

// ---- Format currency for display ----
function fmtRp(cents: number): string {
  return 'Rp ' + (cents / 100).toLocaleString('id-ID');
}

// ---- Trigger download ----
async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Style helpers ----
function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // indigo
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  row.height = 24;
}

function applyCurrencyFormat(cell: ExcelJS.Cell) {
  cell.numFmt = '#,##0';
  cell.alignment = { horizontal: 'right' };
}

// ============================================================
// Export Profit/Loss
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

export async function exportProfitLossExcel(data: ProfitLossData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BabyPOS';
  wb.created = new Date();

  const ws = wb.addWorksheet('Laba Rugi');

  // Title
  ws.mergeCells('A1:E1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Laporan Laba Rugi';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:E2');
  ws.getCell('A2').value = `Periode: ${data.period.from} s/d ${data.period.to}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // Summary
  ws.getCell('A4').value = 'Total Transaksi:';
  ws.getCell('B4').value = data.summary.transactionCount;
  ws.getCell('A5').value = 'Total Omset:';
  ws.getCell('B5').value = data.summary.totalRevenue / 100;
  applyCurrencyFormat(ws.getCell('B5'));
  ws.getCell('A6').value = 'Total HPP:';
  ws.getCell('B6').value = data.summary.totalCogs / 100;
  applyCurrencyFormat(ws.getCell('B6'));
  ws.getCell('A7').value = 'Total Profit:';
  ws.getCell('B7').value = data.summary.totalProfit / 100;
  applyCurrencyFormat(ws.getCell('B7'));
  ws.getCell('B7').font = { bold: true, color: { argb: data.summary.totalProfit >= 0 ? 'FF16A34A' : 'FFDC2626' } };
  ws.getCell('A8').value = 'Margin:';
  ws.getCell('B8').value = `${data.summary.marginPercent}%`;

  // Table header
  const headerRow = ws.addRow([]);
  ws.addRow([]);
  const tableHeader = ws.addRow(['Tanggal', 'Omset (Rp)', 'HPP (Rp)', 'Profit (Rp)', 'Margin (%)']);
  applyHeaderStyle(tableHeader);

  // Table data
  for (const row of data.daily) {
    const r = ws.addRow([
      row.date,
      row.revenue / 100,
      row.cogs / 100,
      row.profit / 100,
      row.marginPercent,
    ]);
    applyCurrencyFormat(r.getCell(2));
    applyCurrencyFormat(r.getCell(3));
    applyCurrencyFormat(r.getCell(4));
    r.getCell(5).numFmt = '0.00"%"';
  }

  // Column widths
  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 12;

  await downloadWorkbook(wb, `laba-rugi_${data.period.from}_${data.period.to}.xlsx`);
}

// ============================================================
// Export Cash Flow
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

export async function exportCashFlowExcel(data: CashFlowData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BabyPOS';

  const ws = wb.addWorksheet('Arus Kas');

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Laporan Arus Kas';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `Periode: ${data.period.from} s/d ${data.period.to}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // Summary by method
  ws.addRow([]);
  const methodHeader = ws.addRow(['Metode Bayar', 'Jumlah Trx', 'Total (Rp)', 'Persentase']);
  applyHeaderStyle(methodHeader);

  for (const m of data.byMethod) {
    const label = m.method === 'cash' ? 'Tunai' : m.method === 'qris' ? 'QRIS' : 'Transfer';
    const r = ws.addRow([label, m.transactionCount, m.totalAmount / 100, `${m.percentage}%`]);
    applyCurrencyFormat(r.getCell(3));
  }

  const totalRow = ws.addRow(['TOTAL', data.summary.transactionCount, data.summary.grandTotal / 100, '100%']);
  totalRow.font = { bold: true };
  applyCurrencyFormat(totalRow.getCell(3));

  // Daily breakdown
  ws.addRow([]);
  ws.addRow([]);
  const dailyHeader = ws.addRow(['Tanggal', 'Jumlah Trx', 'Total (Rp)', 'Tunai (Rp)', 'QRIS (Rp)', 'Transfer (Rp)']);
  applyHeaderStyle(dailyHeader);

  for (const row of data.daily) {
    const r = ws.addRow([
      row.date, row.transactionCount,
      row.totalAmount / 100, row.cashAmount / 100,
      row.qrisAmount / 100, row.transferAmount / 100,
    ]);
    for (let i = 3; i <= 6; i++) applyCurrencyFormat(r.getCell(i));
  }

  ws.getColumn(1).width = 16;
  for (let i = 2; i <= 6; i++) ws.getColumn(i).width = 16;

  await downloadWorkbook(wb, `arus-kas_${data.period.from}_${data.period.to}.xlsx`);
}

// ============================================================
// Export Best Sellers
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

export async function exportBestSellersExcel(data: BestSellersData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BabyPOS';

  const ws = wb.addWorksheet('Best Seller');

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Laporan Penjualan per Barang (Best Seller)';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `Periode: ${data.period.from} s/d ${data.period.to}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.addRow([]);
  const header = ws.addRow(['#', 'Nama Produk', 'SKU', 'Qty Terjual', 'Total Penjualan (Rp)', 'Jumlah Trx']);
  applyHeaderStyle(header);

  for (const p of data.products) {
    const r = ws.addRow([p.rank, p.productName, p.productSku || '-', p.totalQuantity, p.totalRevenue / 100, p.transactionCount]);
    applyCurrencyFormat(r.getCell(5));
  }

  const totalRow = ws.addRow(['', 'TOTAL', '', data.summary.totalQuantity, data.summary.totalRevenue / 100, data.summary.transactionCount]);
  totalRow.font = { bold: true };
  applyCurrencyFormat(totalRow.getCell(5));

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 14;

  await downloadWorkbook(wb, `best-seller_${data.period.from}_${data.period.to}.xlsx`);
}
