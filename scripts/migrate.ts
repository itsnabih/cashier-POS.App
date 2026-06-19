import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/babypos';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Menjalankan migrasi database...\n');

    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Mengeksekusi migrasi: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        await pool.query(sql);
        console.log(`[OK] ${file} berhasil dieksekusi.\n`);
      }
    }

    console.log('Semua migrasi berhasil dijalankan!');
  } catch (error) {
    console.error('[ERROR] Migrasi gagal:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
