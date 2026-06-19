import { NextRequest } from 'next/server';
import { deleteSessionCookie, verifyAuthFromRequest } from '@/lib/auth';
import { apiSuccess, apiInternal } from '@/lib/api-response';
import { auditAuthEvent } from '@/lib/audit';

// ============================================================
// POST /api/auth/logout
// Clears session cookie and records logout in audit trail
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Get current user info before clearing cookie (for audit)
    const user = await verifyAuthFromRequest(request);

    // Clear session cookie
    await deleteSessionCookie();

    // Audit trail: record logout
    if (user) {
      await auditAuthEvent('LOGOUT', user.userId, user.username, user.role, request);
    }

    return apiSuccess({ message: 'Berhasil logout' });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    return apiInternal('Gagal memproses logout');
  }
}
