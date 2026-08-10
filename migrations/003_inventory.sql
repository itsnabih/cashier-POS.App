-- Products (expired date)
ALTER TABLE products ADD COLUMN IF NOT EXISTS expired_date DATE;

CREATE INDEX IF NOT EXISTS idx_products_expired ON products(expired_date)
  WHERE expired_date IS NOT NULL;

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(200) NOT NULL,
  phone          VARCHAR(30),
  address        TEXT,
  contact_person VARCHAR(100),
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       VARCHAR(30) UNIQUE NOT NULL,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  received_by     UUID REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'received', 'cancelled')),
  total_amount    BIGINT NOT NULL DEFAULT 0,
  source          VARCHAR(255),
  reference_number VARCHAR(100),
  discount_type   VARCHAR(20),
  discount_value  BIGINT DEFAULT 0,
  tax_type        VARCHAR(20),
  tax_value       BIGINT DEFAULT 0,
  grand_total     BIGINT,
  notes           TEXT,
  received_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(created_at DESC);

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    VARCHAR(200) NOT NULL,
  quantity        INT NOT NULL CHECK (quantity > 0),
  unit_cost       BIGINT NOT NULL,
  subtotal        BIGINT NOT NULL,
  net_unit_cost   BIGINT,
  expired_date    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);

-- Stock Opnames
CREATE TABLE IF NOT EXISTS stock_opnames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_number   VARCHAR(30) UNIQUE NOT NULL,
  conducted_by    UUID NOT NULL REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'finalized', 'cancelled')),
  total_shrinkage BIGINT NOT NULL DEFAULT 0,
  total_surplus   BIGINT NOT NULL DEFAULT 0,
  notes           TEXT,
  finalized_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opname_status ON stock_opnames(status);
CREATE INDEX IF NOT EXISTS idx_opname_date ON stock_opnames(created_at DESC);

DROP TRIGGER IF EXISTS trg_stock_opnames_updated_at ON stock_opnames;
CREATE TRIGGER trg_stock_opnames_updated_at
  BEFORE UPDATE ON stock_opnames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stock Opname Items
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id       UUID NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    VARCHAR(200) NOT NULL,
  system_stock    INT NOT NULL,
  physical_stock  INT NOT NULL,
  difference      INT NOT NULL,
  unit_cost       BIGINT NOT NULL DEFAULT 0,
  loss_value      BIGINT NOT NULL DEFAULT 0,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opname_items_opname ON stock_opname_items(opname_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_product ON stock_opname_items(product_id);

-- Inventory Adjustments
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  adjustment_type VARCHAR(20) NOT NULL
                  CHECK (adjustment_type IN ('shrinkage', 'surplus', 'correction', 'purchase')),
  quantity_change INT NOT NULL,
  unit_cost       BIGINT NOT NULL DEFAULT 0,
  total_value     BIGINT NOT NULL DEFAULT 0,
  reference_type  VARCHAR(30),
  reference_id    UUID,
  reason          TEXT,
  adjusted_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adj_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_adj_type ON inventory_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_adj_date ON inventory_adjustments(created_at DESC);
