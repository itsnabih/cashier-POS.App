/**
 * BabyPOS Database Seed Script
 *
 * Creates default users with proper bcrypt password hashes
 * and sample categories.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires DATABASE_URL environment variable.
 */

import { Pool } from 'pg';
import { hash } from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/babypos';

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Seeding BabyPOS database...\n');

    // ---- Generate password hashes ----
    console.log('Generating password hashes...');
    const ownerHash = await hash('owner123', 10);
    const adminHash = await hash('admin123', 10);
    const kasirHash = await hash('kasir123', 10);

    // ---- Seed Users ----
    console.log('Creating default users...');

    const users = [
      { username: 'owner', hash: ownerHash, fullName: 'Pemilik Toko', role: 'owner' },
      { username: 'admin', hash: adminHash, fullName: 'Administrator', role: 'admin' },
      { username: 'kasir', hash: kasirHash, fullName: 'Kasir 1', role: 'kasir' },
    ];

    for (const user of users) {
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO UPDATE SET password_hash = $2
         RETURNING id, username, role`,
        [user.username, user.hash, user.fullName, user.role]
      );
      const row = result.rows[0];
      console.log(`   [OK] ${row.role.toUpperCase().padEnd(6)} -> ${row.username} (${row.id})`);
    }

    // ---- Seed Categories ----
    console.log('\nCreating categories...');

    const categories = [
      { name: 'Susu & Formula', slug: 'susu-formula', color: '#6366f1', icon: 'milk', order: 1 },
      { name: 'Popok & Diapers', slug: 'popok-diapers', color: '#8b5cf6', icon: 'baby', order: 2 },
      { name: 'Makanan Bayi', slug: 'makanan-bayi', color: '#10b981', icon: 'utensils', order: 3 },
      { name: 'Perlengkapan Mandi', slug: 'perlengkapan-mandi', color: '#06b6d4', icon: 'bath', order: 4 },
      { name: 'Pakaian Bayi', slug: 'pakaian-bayi', color: '#f43f5e', icon: 'shirt', order: 5 },
      { name: 'Mainan', slug: 'mainan', color: '#f59e0b', icon: 'gamepad-2', order: 6 },
      { name: 'Kesehatan', slug: 'kesehatan', color: '#22c55e', icon: 'heart-pulse', order: 7 },
      { name: 'Lainnya', slug: 'lainnya', color: '#64748b', icon: 'package', order: 8 },
    ];

    for (const cat of categories) {
      await pool.query(
        `INSERT INTO categories (name, slug, color, icon, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug, cat.color, cat.icon, cat.order]
      );
      console.log(`   [OK] ${cat.name}`);
    }

    // ---- Seed Sample Products ----
    console.log('\nCreating sample products...');

    // Get category IDs
    const catRows = await pool.query('SELECT id, slug FROM categories');
    const catMap: Record<string, string> = {};
    for (const row of catRows.rows) {
      catMap[row.slug] = row.id;
    }

    const products = [
      { name: 'SGM Bunda 200g', sku: 'SGM-B-200', barcode: '8999999100001', cat: 'susu-formula', buy: 2500000, sell: 3200000, stock: 24 },
      { name: 'Bebelac Gold 1 400g', sku: 'BBL-G1-400', barcode: '8999999100002', cat: 'susu-formula', buy: 9800000, sell: 12500000, stock: 12 },
      { name: 'Morinaga Chil Kid 800g', sku: 'MRN-CK-800', barcode: '8999999100003', cat: 'susu-formula', buy: 15000000, sell: 18500000, stock: 8 },
      { name: 'Pampers Premium S 48', sku: 'PMP-PS-48', barcode: '8999999200001', cat: 'popok-diapers', buy: 8500000, sell: 10900000, stock: 30 },
      { name: 'MamyPoko Pants M 34', sku: 'MMP-PM-34', barcode: '8999999200002', cat: 'popok-diapers', buy: 6000000, sell: 7800000, stock: 25 },
      { name: 'Milna Bubur Bayi Beras Merah', sku: 'MLN-BB-BM', barcode: '8999999300001', cat: 'makanan-bayi', buy: 1500000, sell: 2100000, stock: 40 },
      { name: 'Promina Puffs Pisang', sku: 'PRM-PF-PS', barcode: '8999999300002', cat: 'makanan-bayi', buy: 1800000, sell: 2500000, stock: 35 },
      { name: 'Zwitsal Baby Bath 200ml', sku: 'ZWT-BB-200', barcode: '8999999400001', cat: 'perlengkapan-mandi', buy: 2000000, sell: 2800000, stock: 20 },
      { name: 'Johnson Baby Shampoo 100ml', sku: 'JNS-BS-100', barcode: '8999999400002', cat: 'perlengkapan-mandi', buy: 1800000, sell: 2400000, stock: 18 },
      { name: 'Baju Bayi Newborn Set 3pcs', sku: 'BBY-NB-S3', barcode: '8999999500001', cat: 'pakaian-bayi', buy: 4500000, sell: 6500000, stock: 15 },
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products (name, sku, barcode, category_id, buy_price, sell_price, stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (sku) DO NOTHING`,
        [p.name, p.sku, p.barcode, catMap[p.cat], p.buy, p.sell, p.stock]
      );
      console.log(`   [OK] ${p.name}`);
    }

    console.log('\n========================================');
    console.log('[OK] Seed completed successfully!');
    console.log('========================================');
    console.log('\nDefault login credentials:');
    console.log('  Owner → owner / owner123');
    console.log('  Admin → admin / admin123');
    console.log('  Kasir → kasir / kasir123');
    console.log('\n[WARNING] GANTI PASSWORD setelah login pertama!');

  } catch (error) {
    console.error('[ERROR] Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
