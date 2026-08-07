-- ============================================================
-- BabyPOS Seed Data
-- Default users for initial setup
--
-- IMPORTANT: Run this AFTER 001_init.sql
-- Default PIN (ganti setelah login pertama!):
--   owner  → PIN: 123456
--   admin  → PIN: 123456
--   kasir  → PIN: 123456
--
-- PIN hashes generated with bcrypt (10 rounds)
-- ============================================================

-- Owner (akses penuh)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'owner',
  '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07Xd00DMxs.AQubh4a',
  'Pemilik Toko',
  'owner'
) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Admin (inventaris)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'admin',
  '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07Xd00DMxs.AQubh4a',
  'Administrator',
  'admin'
) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Kasir (POS only)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'kasir',
  '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07Xd00DMxs.AQubh4a',
  'Kasir 1',
  'kasir'
) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ============================================================
-- Sample Categories
-- ============================================================

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
