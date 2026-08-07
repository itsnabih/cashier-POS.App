-- ============================================================
-- BabyPOS Migration 004: App Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES 
('inventory.near_expiry_days', '180', 'Batas hari produk mendekati kedaluwarsa'),
('inventory.slow_moving_days', '60', 'Batas hari produk lambat terjual'),
('discount.near_expiry_pct', '10', 'Persentase diskon untuk produk mendekati kedaluwarsa'),
('discount.slow_moving_pct', '5', 'Persentase diskon untuk produk lambat terjual'),
('store.name', '"Sumber Baby Shop"', 'Nama Toko'),
('store.address', '"Jl. Raya Bayi No. 123, Kota Balita"', 'Alamat Toko'),
('store.phone', '"0812-3456-7890"', 'Nomor HP Toko'),
('receipt.footer_title', '"TERIMA KASIH"', 'Pesan Footer Struk 1'),
('receipt.footer_sub', '"SELAMAT BELANJA KEMBALI"', 'Pesan Footer Struk 2')
ON CONFLICT (key) DO NOTHING;
