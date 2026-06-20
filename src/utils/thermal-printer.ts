// ============================================================
// Thermal Printer Utility (ESC/POS via WebUSB)
//
// Connects to thermal receipt printers (58mm/80mm) via WebUSB
// and sends ESC/POS binary commands directly — no print dialog.
//
// Fallback: If WebUSB is not available, opens browser print
// with CSS optimized for thermal paper.
// ============================================================

// ---- ESC/POS Command Constants ----

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],                      // Initialize printer
  BOLD_ON: [ESC, 0x45, 0x01],             // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00],            // Bold off
  ALIGN_LEFT: [ESC, 0x61, 0x00],          // Align left
  ALIGN_CENTER: [ESC, 0x61, 0x01],        // Align center
  ALIGN_RIGHT: [ESC, 0x61, 0x02],         // Align right
  FONT_NORMAL: [ESC, 0x21, 0x00],         // Normal size
  FONT_DOUBLE_HEIGHT: [ESC, 0x21, 0x10],  // Double height
  FONT_DOUBLE_WIDTH: [ESC, 0x21, 0x20],   // Double width
  FONT_DOUBLE: [ESC, 0x21, 0x30],         // Double height+width
  LINE_FEED: [0x0a],                       // Line feed
  CUT_PAPER: [GS, 0x56, 0x00],            // Full cut
  CUT_PARTIAL: [GS, 0x56, 0x01],          // Partial cut
  FEED_AND_CUT: [GS, 0x56, 0x42, 0x03],  // Feed 3 lines then cut
} as const;

// ---- Types ----

export interface ReceiptData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptNumber: string;
  cashierName: string;
  date: string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
}

interface PrinterConnection {
  device: USBDevice;
  interfaceNumber: number;
  endpointNumber: number;
}

// ---- WebUSB Printer Connection ----

let cachedConnection: PrinterConnection | null = null;

/**
 * Check if WebUSB is available in this browser.
 */
export function isWebUSBAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * Request and connect to a USB thermal printer.
 * Must be called from a user gesture (click event).
 */
export async function connectPrinter(): Promise<PrinterConnection> {
  if (!isWebUSBAvailable()) {
    throw new Error('WebUSB is not supported in this browser');
  }

  try {
    // Common thermal printer vendor IDs
    const device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: 0x0483 }, // STMicroelectronics (common for POS)
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0525 }, // Netchip Technology (Linux USB gadget)
        { vendorId: 0x0dd4 }, // Custom Engineering
        { vendorId: 0x0fe6 }, // ICS Electronics (Xprinter, etc)
        { vendorId: 0x1fc9 }, // NXP (some POS printers)
        { vendorId: 0x20d1 }, // Chinese POS printers
        { vendorId: 0x1a86 }, // QinHeng Electronics (CH340)
        { vendorId: 0x0416 }, // Winbond (some thermal)
      ],
    });

    await device.open();
    await device.selectConfiguration(1);

    // Find the first OUT endpoint on a bulk transfer interface
    let interfaceNumber = -1;
    let endpointNumber = -1;

    for (const iface of device.configuration!.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            interfaceNumber = iface.interfaceNumber;
            endpointNumber = ep.endpointNumber;
            break;
          }
        }
        if (endpointNumber >= 0) break;
      }
      if (endpointNumber >= 0) break;
    }

    if (interfaceNumber < 0 || endpointNumber < 0) {
      throw new Error('No suitable OUT endpoint found on this USB device');
    }

    await device.claimInterface(interfaceNumber);

    cachedConnection = { device, interfaceNumber, endpointNumber };
    return cachedConnection;
  } catch (err: any) {
    throw new Error(`Failed to connect printer: ${err.message}`);
  }
}

/**
 * Get cached connection, or null if not connected.
 */
export function getConnection(): PrinterConnection | null {
  if (cachedConnection && cachedConnection.device.opened) {
    return cachedConnection;
  }
  cachedConnection = null;
  return null;
}

/**
 * Disconnect the printer.
 */
export async function disconnectPrinter(): Promise<void> {
  if (cachedConnection) {
    try {
      await cachedConnection.device.releaseInterface(cachedConnection.interfaceNumber);
      await cachedConnection.device.close();
    } catch {
      // Ignore errors during disconnect
    }
    cachedConnection = null;
  }
}

// ---- ESC/POS Command Builder ----

class ReceiptBuilder {
  private data: number[] = [];

  constructor() {
    this.data.push(...CMD.INIT);
  }

  text(str: string): this {
    const encoder = new TextEncoder();
    this.data.push(...encoder.encode(str));
    return this;
  }

  newline(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.data.push(...CMD.LINE_FEED);
    }
    return this;
  }

  alignLeft(): this { this.data.push(...CMD.ALIGN_LEFT); return this; }
  alignCenter(): this { this.data.push(...CMD.ALIGN_CENTER); return this; }
  alignRight(): this { this.data.push(...CMD.ALIGN_RIGHT); return this; }
  boldOn(): this { this.data.push(...CMD.BOLD_ON); return this; }
  boldOff(): this { this.data.push(...CMD.BOLD_OFF); return this; }
  fontNormal(): this { this.data.push(...CMD.FONT_NORMAL); return this; }
  fontDouble(): this { this.data.push(...CMD.FONT_DOUBLE); return this; }

  separator(char: string = '-', width: number = 32): this {
    this.text(char.repeat(width));
    return this.newline();
  }

  leftRight(left: string, right: string, width: number = 32): this {
    const gap = width - left.length - right.length;
    const spaces = gap > 0 ? ' '.repeat(gap) : ' ';
    this.text(left + spaces + right);
    return this.newline();
  }

  cut(): this {
    this.newline(3);
    this.data.push(...CMD.FEED_AND_CUT);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.data);
  }
}

// ---- Format Currency ----

function fmtRp(cents: number): string {
  return 'Rp ' + (cents / 100).toLocaleString('id-ID');
}

// ---- Build Receipt Data ----

export function buildReceiptBytes(receipt: ReceiptData): Uint8Array {
  const builder = new ReceiptBuilder();
  const W = 32; // 58mm paper ≈ 32 chars

  // Header
  builder
    .alignCenter()
    .boldOn()
    .fontDouble()
    .text(receipt.storeName)
    .newline()
    .fontNormal()
    .boldOff()
    .text(receipt.storeAddress)
    .newline()
    .text(receipt.storePhone)
    .newline()
    .separator('=', W);

  // Receipt info
  builder
    .alignLeft()
    .leftRight('No:', receipt.receiptNumber, W)
    .leftRight('Tgl:', receipt.date, W)
    .leftRight('Kasir:', receipt.cashierName, W)
    .separator('-', W);

  // Items
  for (const item of receipt.items) {
    builder
      .text(item.name)
      .newline()
      .leftRight(
        `  ${item.qty} x ${fmtRp(item.unitPrice)}`,
        fmtRp(item.subtotal),
        W
      );
  }

  builder.separator('-', W);

  // Totals
  builder
    .leftRight('Subtotal', fmtRp(receipt.subtotal), W);

  if (receipt.discount > 0) {
    builder.leftRight('Diskon', '-' + fmtRp(receipt.discount), W);
  }

  builder
    .boldOn()
    .leftRight('TOTAL', fmtRp(receipt.total), W)
    .boldOff()
    .separator('-', W)
    .leftRight('Bayar (' + receipt.paymentMethod + ')', fmtRp(receipt.paymentAmount), W);

  if (receipt.changeAmount > 0) {
    builder.leftRight('Kembali', fmtRp(receipt.changeAmount), W);
  }

  // Footer
  builder
    .newline()
    .separator('=', W)
    .alignCenter()
    .text('Terima Kasih')
    .newline()
    .text('Selamat Berbelanja!')
    .newline()
    .cut();

  return builder.build();
}

// ---- Print via WebUSB ----

/**
 * Send receipt data to the connected thermal printer.
 */
export async function printReceiptUSB(receipt: ReceiptData): Promise<void> {
  const conn = getConnection();
  if (!conn) {
    throw new Error('Printer not connected. Call connectPrinter() first.');
  }

  const bytes = buildReceiptBytes(receipt);

  // Send in chunks (some printers have small USB buffers)
  const CHUNK_SIZE = 64;
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
    await conn.device.transferOut(conn.endpointNumber, chunk);
  }
}

// ---- Fallback: Browser Print ----

/**
 * Open a browser print dialog with receipt HTML
 * styled for thermal paper. Used when WebUSB is not available.
 */
export function printReceiptBrowser(receipt: ReceiptData): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${receipt.receiptNumber}</title>
  <style>
    @page { margin: 0; size: 58mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      width: 58mm;
      padding: 4mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: 14px; }
    .row { display: flex; justify-content: space-between; }
    .sep { border-top: 1px dashed #000; margin: 4px 0; }
    .sep-double { border-top: 2px solid #000; margin: 4px 0; }
    .item-name { font-size: 10px; }
    .item-detail { font-size: 9px; padding-left: 8px; display: flex; justify-content: space-between; }
    .mt { margin-top: 6px; }
  </style>
</head>
<body>
  <div class="center bold big">${receipt.storeName}</div>
  <div class="center">${receipt.storeAddress}</div>
  <div class="center">${receipt.storePhone}</div>
  <div class="sep-double"></div>
  <div class="row"><span>No:</span><span>${receipt.receiptNumber}</span></div>
  <div class="row"><span>Tgl:</span><span>${receipt.date}</span></div>
  <div class="row"><span>Kasir:</span><span>${receipt.cashierName}</span></div>
  <div class="sep"></div>
  ${receipt.items.map(item => `
    <div class="item-name">${item.name}</div>
    <div class="item-detail">
      <span>${item.qty} x ${fmtRp(item.unitPrice)}</span>
      <span>${fmtRp(item.subtotal)}</span>
    </div>
  `).join('')}
  <div class="sep"></div>
  <div class="row"><span>Subtotal</span><span>${fmtRp(receipt.subtotal)}</span></div>
  ${receipt.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${fmtRp(receipt.discount)}</span></div>` : ''}
  <div class="row bold"><span>TOTAL</span><span>${fmtRp(receipt.total)}</span></div>
  <div class="sep"></div>
  <div class="row"><span>Bayar (${receipt.paymentMethod})</span><span>${fmtRp(receipt.paymentAmount)}</span></div>
  ${receipt.changeAmount > 0 ? `<div class="row"><span>Kembali</span><span>${fmtRp(receipt.changeAmount)}</span></div>` : ''}
  <div class="sep-double mt"></div>
  <div class="center mt">Terima Kasih</div>
  <div class="center">Selamat Berbelanja!</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
