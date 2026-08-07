import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString } from '@/lib/sanitize';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiForbidden, apiInternal, apiNotFound } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type UserRow, mapUserRow } from '@/types/user';

// ============================================================
// PUT /api/users/[id] — Update a user
// ============================================================

const UpdateUserSchema = z.object({
  fullName: z.string().min(1, 'Nama lengkap wajib diisi').max(100).transform(sanitizeString).optional(),
  pin: z.string().length(6, 'PIN harus 6 digit').regex(/^\d{6}$/, 'PIN harus berupa 6 digit angka').optional().or(z.literal('')),
  role: z.enum(['owner', 'admin', 'kasir']).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.USER_EDIT)) return apiForbidden();

    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;

    const existingUser = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    if (!existingUser) return apiNotFound('Pengguna tidak ditemukan');

    // Only owner can update owner/admin roles.
    if (d.role && d.role !== 'kasir' && user.role !== 'owner') {
      return apiForbidden('Hanya Owner yang dapat mengubah role menjadi Owner atau Admin');
    }
    // Prevent non-owners from editing owner accounts
    if (existingUser.role === 'owner' && user.role !== 'owner') {
      return apiForbidden('Hanya Owner yang dapat mengubah akun Owner lainnya');
    }
    // Prevent self role demotion or deactivation? Optional, but good practice.
    if (existingUser.id === user.userId && (d.role && d.role !== user.role || d.isActive === false)) {
        return apiBadRequest('Anda tidak dapat mengubah role atau menonaktifkan akun Anda sendiri');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (d.fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(d.fullName);
    }
    if (d.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(d.role);
    }
    if (d.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(d.isActive);
    }
    if (d.pin) {
      updates.push(`password_hash = $${paramIndex++}`);
      const hashedPin = await hashPassword(d.pin);
      values.push(hashedPin);
    }

    if (updates.length === 0) {
      return apiSuccess(mapUserRow(existingUser));
    }

    values.push(id);
    const updatedRow = await queryOne<UserRow>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!updatedRow) return apiInternal('Gagal memperbarui pengguna');

    await auditLog(user, 'UPDATE', 'user', id, {
      oldValues: { fullName: existingUser.full_name, role: existingUser.role, isActive: existingUser.is_active },
      newValues: { fullName: updatedRow.full_name, role: updatedRow.role, isActive: updatedRow.is_active },
      request,
    });

    return apiSuccess(mapUserRow(updatedRow));
  } catch (error) {
    console.error('[USERS] Update error:', error);
    return apiInternal('Gagal memperbarui pengguna');
  }
}

// ============================================================
// DELETE /api/users/[id] — Deactivate a user
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.USER_DELETE)) return apiForbidden();

    if (id === user.userId) {
      return apiBadRequest('Anda tidak dapat menonaktifkan akun Anda sendiri');
    }

    const existingUser = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    if (!existingUser) return apiNotFound('Pengguna tidak ditemukan');

    if (existingUser.role === 'owner' && user.role !== 'owner') {
      return apiForbidden('Hanya Owner yang dapat menonaktifkan akun Owner lainnya');
    }

    const updatedRow = await queryOne<UserRow>(
      `UPDATE users SET is_active = false WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!updatedRow) return apiInternal('Gagal menonaktifkan pengguna');

    await auditLog(user, 'DELETE', 'user', id, {
      description: `Menonaktifkan pengguna ${updatedRow.username}`,
      request,
    });

    return apiSuccess({ message: 'Pengguna dinonaktifkan' });
  } catch (error) {
    console.error('[USERS] Delete error:', error);
    return apiInternal('Gagal menonaktifkan pengguna');
  }
}
