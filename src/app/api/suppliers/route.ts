import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/rbac';
import { sanitizeString, sanitizePagination } from '@/lib/sanitize';
import { apiSuccess, apiPaginated, apiBadRequest, apiUnauthorized, apiForbidden, apiInternal, apiCreated } from '@/lib/api-response';
import { auditLog } from '@/lib/audit';
import { type SupplierRow, mapSupplierRow } from '@/types/supplier';

// ============================================================
// GET /api/suppliers
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.SUPPLIER_VIEW)) return apiForbidden();

    const params = request.nextUrl.searchParams;
    const all = params.get('all') === 'true';

    if (all) {
      const rows = await query<SupplierRow>(
        'SELECT * FROM suppliers WHERE is_active = true ORDER BY name ASC'
      );
      return apiSuccess(rows.map(mapSupplierRow));
    }

    const { page, limit, offset } = sanitizePagination(
      params.get('page') ?? undefined,
      params.get('limit') ?? undefined
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM suppliers WHERE is_active = true'
    );
    const total = Number(countResult?.count ?? 0);

    const rows = await query<SupplierRow>(
      `SELECT * FROM suppliers WHERE is_active = true ORDER BY name ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return apiPaginated(rows.map(mapSupplierRow), { page, limit, total });
  } catch (error) {
    console.error('[SUPPLIERS] List error:', error);
    return apiInternal('Gagal mengambil data supplier');
  }
}

// ============================================================
// POST /api/suppliers
// ============================================================
const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi').max(200).transform(sanitizeString),
  phone: z.string().max(30).transform(sanitizeString).nullable().optional(),
  address: z.string().max(500).transform(sanitizeString).nullable().optional(),
  contactPerson: z.string().max(100).transform(sanitizeString).nullable().optional(),
  notes: z.string().max(500).transform(sanitizeString).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiUnauthorized();
    if (!hasPermission(user.role, PERMISSIONS.SUPPLIER_CREATE)) return apiForbidden();

    const body = await request.json();
    const parsed = CreateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest('Input tidak valid', parsed.error.flatten().fieldErrors);
    }

    const d = parsed.data;
    const row = await queryOne<SupplierRow>(
      `INSERT INTO suppliers (name, phone, address, contact_person, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [d.name, d.phone ?? null, d.address ?? null, d.contactPerson ?? null, d.notes ?? null]
    );

    if (!row) return apiInternal('Gagal membuat supplier');

    await auditLog(user, 'CREATE', 'supplier', row.id, {
      newValues: { name: d.name },
      request,
    });

    return apiCreated(mapSupplierRow(row));
  } catch (error) {
    console.error('[SUPPLIERS] Create error:', error);
    return apiInternal('Gagal membuat supplier');
  }
}
