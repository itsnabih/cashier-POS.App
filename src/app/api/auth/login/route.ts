import { NextRequest } from 'next/server';
import { z } from 'zod';
import { queryOne, query } from '@/lib/db';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth';
import { sanitizeString } from '@/lib/sanitize';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiInternal } from '@/lib/api-response';
import { auditAuthEvent } from '@/lib/audit';
import type { UserRow } from '@/types/user';

// ============================================================
// POST /api/auth/login
// Authenticates user, creates JWT, sets httpOnly cookie
// ============================================================

const LoginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username wajib diisi')
    .max(50, 'Username maksimal 50 karakter')
    .transform(sanitizeString),
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .max(100, 'Password terlalu panjang'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse & validate input
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const { username, password } = parsed.data;

    // 2. Find user by username (parameterized query)
    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (!user) {
      return apiUnauthorized('Username atau password salah');
    }

    // 3. Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return apiUnauthorized('Username atau password salah');
    }

    // 4. Create JWT token
    const token = await createToken({
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role as 'owner' | 'admin' | 'kasir',
    });

    // 5. Set httpOnly cookie
    await setSessionCookie(token);

    // 6. Update last_login_at
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // 7. Audit trail: record login
    await auditAuthEvent('LOGIN', user.id, user.username, user.role, request);

    // 8. Return user info (never return password_hash)
    return apiSuccess({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return apiInternal('Gagal memproses login');
  }
}
