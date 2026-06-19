-- ============================================================
-- BabyPOS Database Schema v1.0
-- PostgreSQL 15+
-- Harga disimpan dalam BIGINT (satuan sen): Rp 15.000 = 1500000
-- ============================================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS & RBAC
-- Roles: owner (akses penuh), admin (inventaris), kasir (POS only)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'kasir'
                CHECK (role IN ('owner', 'admin', 'kasir')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  icon        VARCHAR(50),
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

-- ============================================================
-- 3. PRODUCTS
-- buy_price: harga modal (hanya owner yang boleh lihat)
-- sell_price: harga jual
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku           VARCHAR(50) UNIQUE,
  barcode       VARCHAR(50) UNIQUE,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  buy_price     BIGINT NOT NULL DEFAULT 0,
  sell_price    BIGINT NOT NULL DEFAULT 0,
  stock         INT NOT NULL DEFAULT 0,
  min_stock     INT NOT NULL DEFAULT 5,
  unit          VARCHAR(20) NOT NULL DEFAULT 'pcs',
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('indonesian', name));

-- ============================================================
-- 4. TRANSACTIONS (header)
-- ============================================================
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number  VARCHAR(30) UNIQUE NOT NULL,
  cashier_id      UUID NOT NULL REFERENCES users(id),
  subtotal        BIGINT NOT NULL DEFAULT 0,
  discount        BIGINT NOT NULL DEFAULT 0,
  tax             BIGINT NOT NULL DEFAULT 0,
  total           BIGINT NOT NULL DEFAULT 0,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'cash'
                  CHECK (payment_method IN ('cash', 'qris', 'transfer')),
  payment_amount  BIGINT NOT NULL DEFAULT 0,
  change_amount   BIGINT NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('completed', 'voided', 'pending')),
  notes           TEXT,
  voided_by       UUID REFERENCES users(id),
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,
  synced_from     VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_date ON transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_receipt ON transactions(receipt_number);

-- ============================================================
-- 5. TRANSACTION ITEMS (detail)
-- Snapshot harga pada saat transaksi (immutable)
-- ============================================================
CREATE TABLE transaction_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    VARCHAR(200) NOT NULL,
  product_sku     VARCHAR(50),
  quantity        INT NOT NULL CHECK (quantity > 0),
  unit_price      BIGINT NOT NULL,
  discount        BIGINT NOT NULL DEFAULT 0,
  subtotal        BIGINT NOT NULL
);

CREATE INDEX idx_tx_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_tx_items_product ON transaction_items(product_id);

-- ============================================================
-- 6. AUDIT TRAIL
-- Mencatat setiap aktivitas CRUD: Siapa, Jam Berapa, Aksi Apa
-- Untuk mencegah kecurangan internal
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  username    VARCHAR(50) NOT NULL,
  user_role   VARCHAR(20) NOT NULL,
  action      VARCHAR(20) NOT NULL
              CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VOID', 'LOGIN', 'LOGOUT')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id   VARCHAR(100),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);

-- ============================================================
-- 7. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. VIEWS
-- View produk tanpa harga modal (untuk kasir)
-- ============================================================
CREATE VIEW products_cashier_view AS
SELECT
  id, category_id, sku, barcode, name, description,
  sell_price, stock, min_stock, unit, image_url,
  is_active, created_at, updated_at
FROM products;

-- ============================================================
-- 9. PARTITION AUDIT LOGS BY MONTH (opsional, untuk skala besar)
-- Uncomment jika diperlukan
-- ============================================================
-- CREATE TABLE audit_logs_partitioned (
--   LIKE audit_logs INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);
