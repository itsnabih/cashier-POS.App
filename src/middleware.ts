import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { canAccessRoute } from '@/lib/rbac';

// ============================================================
// Next.js Edge Middleware
// Runs on EVERY matched request before it reaches the page/API
//
// Responsibilities:
// 1. Verify JWT session from cookie
// 2. Redirect unauthenticated users to /login
// 3. Enforce RBAC route rules
// 4. Inject user info into request headers for downstream use
// ============================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'babypos-default-secret-change-in-production'
);

const COOKIE_NAME = 'babypos-session';

// Public routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// Static/system paths to skip entirely
const SKIP_PATHS = ['/_next', '/favicon.ico', '/manifest.json', '/icons', '/sw.js'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and system routes
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // ---- 1. Extract and verify JWT ----
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(request, 'unauthenticated');
  }

  let payload;
  try {
    const result = await jwtVerify(token, JWT_SECRET);
    payload = result.payload as {
      userId: string;
      username: string;
      fullName: string;
      role: string;
    };
  } catch {
    // Invalid or expired token
    const response = redirectToLogin(request, 'session_expired');
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // ---- 2. Enforce RBAC route rules ----
  // Determine the "app path" — strip leading slash for route matching
  // Dashboard routes are under /(dashboard)/ group which maps to /products, /categories, etc.
  // POS routes are under /(pos)/ group which maps to /pos
  if (!canAccessRoute(payload.role, pathname)) {
    // API routes get 403 JSON, page routes redirect to their allowed area
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Anda tidak memiliki akses untuk fitur ini',
          },
        },
        { status: 403 }
      );
    }

    // Redirect to default allowed page based on role
    const defaultPath = getDefaultPathForRole(payload.role);
    return NextResponse.redirect(new URL(defaultPath, request.url));
  }

  // ---- 3. Inject user info into headers for API routes / Server Components ----
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-username', payload.username);
  requestHeaders.set('x-user-fullname', payload.fullName);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// ============================================================
// Helpers
// ============================================================

function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const loginUrl = new URL('/login', request.url);
  if (reason) {
    loginUrl.searchParams.set('reason', reason);
  }
  // Remember where they were trying to go
  if (request.nextUrl.pathname !== '/') {
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}

function getDefaultPathForRole(role: string): string {
  switch (role) {
    case 'owner':
      return '/dashboard';
    case 'admin':
      return '/dashboard';
    case 'kasir':
      return '/pos';
    default:
      return '/login';
  }
}

// ============================================================
// Matcher: which routes this middleware applies to
// ============================================================

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js).*)',
  ],
};
