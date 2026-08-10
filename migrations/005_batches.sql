-- Product Batches (Lot & Expiry Management)
CREATE TABLE IF NOT EXISTS product_batches (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  po_id              UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  batch_number       VARCHAR(50) NOT NULL,
  quantity_received  INT NOT NULL CHECK (quantity_received >= 0),
  quantity_remaining INT NOT NULL CHECK (quantity_remaining >= 0),
  unit_cost          BIGINT NOT NULL DEFAULT 0,
  expired_date       DATE,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'depleted', 'expired')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_po ON product_batches(po_id);
CREATE INDEX IF NOT EXISTS idx_batches_expired ON product_batches(expired_date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON product_batches(status);

DROP TRIGGER IF EXISTS trg_batches_updated_at ON product_batches;
CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON product_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Link PO Items & Transaction Items to specific batches
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
