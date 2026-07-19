import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { apiSuccess, apiUnauthorized, apiForbidden, apiInternal } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';

// ============================================================
// GET /api/settings
// Fetch all application settings
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();

    const rows = await query<{ key: string; value: any; description: string }>('SELECT key, value, description FROM app_settings');
    
    // Convert to a dictionary for easier consumption
    const settings: Record<string, any> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return apiSuccess(settings);
  } catch (error) {
    console.error('[SETTINGS] Fetch error:', error);
    return apiInternal('Gagal mengambil pengaturan');
  }
}

// ============================================================
// PUT /api/settings
// Update multiple application settings
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    // Assuming only admins or owners can update settings
    if (user.role === 'kasir') return apiForbidden('Hanya admin yang dapat mengubah pengaturan');

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return apiInternal('Format request tidak valid');
    }

    // Process each setting
    const entries = Object.entries(body);
    
    for (const [key, value] of entries) {
      // Upsert the setting
      await queryOne(
        `INSERT INTO app_settings (key, value, updated_by, updated_at) 
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET 
         value = EXCLUDED.value, 
         updated_by = EXCLUDED.updated_by, 
         updated_at = NOW()`,
        [key, JSON.stringify(value), user.userId]
      );
    }

    // Audit log
    await auditLog(user, 'UPDATE', 'settings', 'global', {
      newValues: body,
      request,
    });

    return apiSuccess({ message: 'Pengaturan berhasil disimpan' });
  } catch (error) {
    console.error('[SETTINGS] Update error:', error);
    return apiInternal('Gagal menyimpan pengaturan');
  }
}
