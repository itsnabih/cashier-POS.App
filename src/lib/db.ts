import { Pool, type PoolClient, type QueryResultRow } from 'pg';

// ============================================================
// PostgreSQL Connection Pool Singleton
// Optimized for Mini PC: max 10 connections, strict timeouts
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors (don't crash the process)
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized query and return typed rows.
 * ALWAYS use $1, $2 placeholders — NEVER string interpolation.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
  }

  return result.rows;
}

/**
 * Execute a query and return a single row or null.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Execute multiple queries inside a transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and client release.
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a raw client from the pool (for advanced use cases).
 * IMPORTANT: Always release() the client when done.
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Graceful shutdown: drain pool on process exit.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
