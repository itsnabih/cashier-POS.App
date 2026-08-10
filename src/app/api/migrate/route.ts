import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    const executed: string[] = [];

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await query(sql);
        executed.push(file);
      }
    }

    // Also run columns verification
    await query(`
      DO $$ BEGIN
        -- purchase_orders: columns added in 003_inventory.sql revision
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'source') THEN
          ALTER TABLE purchase_orders ADD COLUMN source VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'reference_number') THEN
          ALTER TABLE purchase_orders ADD COLUMN reference_number VARCHAR(100);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'discount_type') THEN
          ALTER TABLE purchase_orders ADD COLUMN discount_type VARCHAR(20);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'discount_value') THEN
          ALTER TABLE purchase_orders ADD COLUMN discount_value BIGINT DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'tax_type') THEN
          ALTER TABLE purchase_orders ADD COLUMN tax_type VARCHAR(20);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'tax_value') THEN
          ALTER TABLE purchase_orders ADD COLUMN tax_value BIGINT DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'grand_total') THEN
          ALTER TABLE purchase_orders ADD COLUMN grand_total BIGINT;
        END IF;

        UPDATE purchase_orders SET grand_total = total_amount WHERE grand_total IS NULL;

        -- purchase_order_items
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'net_unit_cost') THEN
          ALTER TABLE purchase_order_items ADD COLUMN net_unit_cost BIGINT;
        END IF;

        UPDATE purchase_order_items SET net_unit_cost = unit_cost WHERE net_unit_cost IS NULL;
      END $$;
    `);

    return NextResponse.json({
      success: true,
      message: 'Migrasi database berhasil dijalankan',
      executedFiles: executed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[MIGRATE_API] Error executing migrations:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
