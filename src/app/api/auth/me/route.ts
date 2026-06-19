import { getCurrentUser } from '@/lib/auth';
import { getPermissions } from '@/lib/rbac';
import { apiSuccess, apiUnauthorized, apiInternal } from '@/lib/api-response';

// ============================================================
// GET /api/auth/me
// Returns current authenticated user info + permissions
// ============================================================

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiUnauthorized();
    }

    return apiSuccess({
      user: {
        id: user.userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      permissions: getPermissions(user.role),
    });
  } catch (error) {
    console.error('[AUTH] Me error:', error);
    return apiInternal('Gagal mengambil data user');
  }
}
