import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString } from '@/lib/sanitize';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiForbidden, apiInternal, apiCreated } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type UserRow, mapUserRow } from '@/types/user';

// ============================================================
// GET /api/users — List all users (admin/owner only)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.USER_VIEW)) return apiForbidden();

    const rows = await query<UserRow>(
      `SELECT id, username, password_hash, full_name, role, is_active, last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    return apiSuccess(rows.map(mapUserRow));
  } catch (error) {
    console.error('[USERS] List error:', error);
    return apiInternal('Gagal mengambil data pengguna');
  }
}

// ============================================================
// POST /api/users — Create a new user
// ============================================================

const CreateUserSchema = z.object({
  username: z.string().min(3, 'User ID minimal 3 karakter').max(50).transform(sanitizeString),
  pin: z.string().length(6, 'PIN harus 6 digit').regex(/^\d{6}$/, 'PIN harus berupa 6 digit angka'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(100).transform(sanitizeString),
  role: z.enum(['owner', 'admin', 'kasir']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.USER_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    // Only owner can create owner/admin.
    if (d.role !== 'kasir' && user.role !== 'owner') {
      return apiForbidden('Hanya Owner yang dapat membuat akun Owner atau Admin');
    }

    // Check duplicate User ID
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [d.username]);
    if (existing) return apiBadRequest('User ID sudah digunakan');

    const hashedPin = await hashPassword(d.pin);

    const row = await queryOne<UserRow>(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, password_hash, full_name, role, is_active, last_login_at, created_at, updated_at`,
      [d.username, hashedPin, d.fullName, d.role]
    );

    if (!row) return apiInternal('Gagal membuat pengguna');

    // Audit trail
    await auditLog(user, 'CREATE', 'user', row.id, {
      newValues: { username: d.username, fullName: d.fullName, role: d.role },
      request,
    });

    return apiCreated(mapUserRow(row));
  } catch (error) {
    console.error('[USERS] Create error:', error);
    return apiInternal('Gagal membuat pengguna');
  }
}
