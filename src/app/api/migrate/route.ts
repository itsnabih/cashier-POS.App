import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await query(`
      DO $$ BEGIN
        -- purchase_orders
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

        -- update existing grand_total
        UPDATE purchase_orders SET grand_total = total_amount WHERE grand_total IS NULL;

        -- purchase_order_items
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_items' AND column_name = 'net_unit_cost') THEN
          ALTER TABLE purchase_order_items ADD COLUMN net_unit_cost BIGINT;
        END IF;

        -- update existing net_unit_cost
        UPDATE purchase_order_items SET net_unit_cost = unit_cost WHERE net_unit_cost IS NULL;

      END $$;
    `);

    return NextResponse.json({ success: true, message: 'Purchases schema updated for discount and tax' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
