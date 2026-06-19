import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';

// ============================================================
// Authentication Library
// JWT via jose (Edge-compatible), bcrypt password hashing
// Session stored in httpOnly cookie (NOT localStorage)
// ============================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'babypos-default-secret-change-in-production'
);

const COOKIE_NAME = 'babypos-session';
const TOKEN_EXPIRY = '8h'; // Shift-length session
const BCRYPT_ROUNDS = 10;

// ============================================================
// Types
// ============================================================

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  fullName: string;
  role: 'owner' | 'admin' | 'kasir';
}

export interface AuthUser {
  userId: string;
  username: string;
  fullName: string;
  role: 'owner' | 'admin' | 'kasir';
}

// ============================================================
// Password Hashing
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// ============================================================
// JWT Token Management
// ============================================================

export async function createToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ============================================================
// Cookie-based Session
// ============================================================

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ============================================================
// Get current authenticated user from cookie
// Used in Server Components and API routes
// ============================================================

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionCookie();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    username: payload.username,
    fullName: payload.fullName,
    role: payload.role,
  };
}

// ============================================================
// Verify auth from request header (for middleware)
// Middleware can't use cookies() helper, reads from request
// ============================================================

export async function verifyAuthFromRequest(
  request: Request
): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  const payload = await verifyToken(match[1]);
  if (!payload) return null;

  return {
    userId: payload.userId,
    username: payload.username,
    fullName: payload.fullName,
    role: payload.role,
  };
}
