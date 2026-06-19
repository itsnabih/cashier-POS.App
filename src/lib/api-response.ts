import { NextResponse } from 'next/server';

// ============================================================
// Standardized API Response Helpers
// Consistent shape for all API responses
// ============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// Success Responses
// ============================================================

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, 201);
}

export function apiPaginated<T>(
  data: T[],
  meta: { page: number; limit: number; total: number }
): NextResponse<ApiSuccessResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.limit),
    },
  });
}

// ============================================================
// Error Responses
// ============================================================

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    },
    { status }
  );
}

export function apiBadRequest(message = 'Bad Request', details?: unknown) {
  return apiError('BAD_REQUEST', message, 400, details);
}

export function apiUnauthorized(message = 'Silakan login terlebih dahulu') {
  return apiError('UNAUTHORIZED', message, 401);
}

export function apiForbidden(message = 'Anda tidak memiliki akses untuk fitur ini') {
  return apiError('FORBIDDEN', message, 403);
}

export function apiNotFound(message = 'Data tidak ditemukan') {
  return apiError('NOT_FOUND', message, 404);
}

export function apiConflict(message = 'Data sudah ada') {
  return apiError('CONFLICT', message, 409);
}

export function apiInternal(message = 'Terjadi kesalahan server') {
  console.error('[API] Internal error:', message);
  return apiError('INTERNAL_ERROR', message, 500);
}
