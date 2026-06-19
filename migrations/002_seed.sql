-- ============================================================
-- BabyPOS Seed Data
-- Default users for initial setup
--
-- IMPORTANT: Run this AFTER 001_init.sql
-- Default passwords (change after first login!):
--   owner  → owner123
--   admin  → admin123
--   kasir  → kasir123
--
-- Password hashes generated with bcrypt (10 rounds)
-- ============================================================

-- Owner (akses penuh)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'owner',
  '$2a$10$8KzQ5x5G5v5X5Z5Y5W5V5.5U5T5S5R5Q5P5O5N5M5L5K5J5I5H5G5',
  'Pemilik Toko',
  'owner'
) ON CONFLICT (username) DO NOTHING;

-- Admin (inventaris)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'admin',
  '$2a$10$placeholder_admin_hash',
  'Administrator',
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- Kasir (POS only)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'kasir',
  '$2a$10$placeholder_kasir_hash',
  'Kasir 1',
  'kasir'
) ON CONFLICT (username) DO NOTHING;

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
