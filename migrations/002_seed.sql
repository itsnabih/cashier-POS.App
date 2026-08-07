-- Seed Users
INSERT INTO users (username, password_hash, full_name, role)
VALUES
  ('owner', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07Xd00DMxs.AQubh4a', 'Pemilik Toko', 'owner'),
  ('admin', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07Xd00DMxs.AQubh4a', 'Administrator', 'admin'),
  ('kasir', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07Xd00DMxs.AQubh4a', 'Kasir 1', 'kasir')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed Categories
INSERT INTO categories (name, slug, color, icon, sort_order) VALUES
  ('Susu & Formula', 'susu-formula', '#6366f1', 'milk', 1),
  ('Popok & Diapers', 'popok-diapers', '#8b5cf6', 'baby', 2),
  ('Makanan Bayi', 'makanan-bayi', '#10b981', 'utensils', 3),
  ('Perlengkapan Mandi', 'perlengkapan-mandi', '#06b6d4', 'bath', 4),
  ('Pakaian Bayi', 'pakaian-bayi', '#f43f5e', 'shirt', 5),
  ('Mainan', 'mainan', '#f59e0b', 'gamepad', 6),
  ('Kesehatan', 'kesehatan', '#22c55e', 'heart-pulse', 7),
  ('Lainnya', 'lainnya', '#64748b', 'package', 8)
ON CONFLICT (slug) DO NOTHING;
