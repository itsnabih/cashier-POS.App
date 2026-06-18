import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

/**
 * RBAC permission matrix.
 * Owner: full access
 * Admin: stock management + dashboard
 * Cashier: POS only
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  CASHIER: 1,
};

/** Check if a role has at least the minimum required level */
export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/** Server-side: get session or redirect to login */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** Server-side: require minimum role or redirect */
export async function requireRole(minRole: Role) {
  const session = await requireAuth();
  if (!hasMinRole(session.user.role, minRole)) {
    redirect("/unauthorized");
  }
  return session;
}

/** Permission check for specific features */
export const permissions = {
  canManageUsers: (role: Role) => role === "OWNER",
  canManageProducts: (role: Role) => hasMinRole(role, "ADMIN"),
  canViewReports: (role: Role) => hasMinRole(role, "ADMIN"),
  canAccessPOS: (role: Role) => hasMinRole(role, "CASHIER"), // All roles
  canManageSettings: (role: Role) => role === "OWNER",
  canDeleteTransactions: (role: Role) => role === "OWNER",
} as const;
