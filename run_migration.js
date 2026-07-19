const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/babypos'
});

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '002_add_suppliers.sql'), 'utf-8');
  try {
    await pool.query(sql);
    console.log('Migration ran successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
