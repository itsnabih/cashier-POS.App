// ============================================================
// Role-Based Access Control (RBAC)
// Roles: owner, admin, kasir
//
// Owner  → Akses penuh tanpa batas
// Admin  → Terbatas pada inventaris (produk, kategori, stok)
// Kasir  → Hanya layar POS, TIDAK bisa lihat harga modal
// ============================================================

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  KASIR: 'kasir',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ============================================================
// Permission definitions (granular action-based)
// ============================================================

export const PERMISSIONS = {
  // ---- Dashboard ----
  DASHBOARD_VIEW: 'dashboard:view',

  // ---- Products ----
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_EDIT: 'product:edit',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_VIEW_BUY_PRICE: 'product:view_buy_price', // harga modal

  // ---- Categories ----
  CATEGORY_VIEW: 'category:view',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_EDIT: 'category:edit',
  CATEGORY_DELETE: 'category:delete',

  // ---- Transactions ----
  TRANSACTION_CREATE: 'transaction:create',
  TRANSACTION_VIEW: 'transaction:view',
  TRANSACTION_VIEW_ALL: 'transaction:view_all', // lihat semua kasir
  TRANSACTION_VOID: 'transaction:void',
  TRANSACTION_EXPORT: 'transaction:export',

  // ---- Reports ----
  REPORT_VIEW: 'report:view',
  REPORT_PROFIT: 'report:profit',   // laporan profit (butuh harga modal)
  REPORT_EXPORT: 'report:export',

  // ---- Users ----
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',

  // ---- Settings ----
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  // ---- Audit ----
  AUDIT_VIEW: 'audit:view',

  // ---- POS ----
  POS_ACCESS: 'pos:access',

  // ---- Suppliers ----
  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_EDIT: 'supplier:edit',
  SUPPLIER_DELETE: 'supplier:delete',

  // ---- Purchases (Penerimaan Barang) ----
  PURCHASE_VIEW: 'purchase:view',
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_RECEIVE: 'purchase:receive',

  // ---- Stock Opname ----
  STOCK_OPNAME_VIEW: 'stock_opname:view',
  STOCK_OPNAME_CREATE: 'stock_opname:create',
  STOCK_OPNAME_FINALIZE: 'stock_opname:finalize',

  // ---- Inventory Adjustments ----
  INVENTORY_ADJUST: 'inventory:adjust',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================
// Role → Permission Mapping
// ============================================================

const OWNER_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

const ADMIN_PERMISSIONS: Permission[] = [
  // Dashboard
  PERMISSIONS.DASHBOARD_VIEW,
  // Inventory management (produk + kategori)
  PERMISSIONS.PRODUCT_VIEW,
  PERMISSIONS.PRODUCT_CREATE,
  PERMISSIONS.PRODUCT_EDIT,
  PERMISSIONS.PRODUCT_DELETE,
  // Admin TIDAK bisa lihat harga modal
  PERMISSIONS.CATEGORY_VIEW,
  PERMISSIONS.CATEGORY_CREATE,
  PERMISSIONS.CATEGORY_EDIT,
  PERMISSIONS.CATEGORY_DELETE,
  // Suppliers
  PERMISSIONS.SUPPLIER_VIEW,
  PERMISSIONS.SUPPLIER_CREATE,
  PERMISSIONS.SUPPLIER_EDIT,
  // Purchases (penerimaan barang)
  PERMISSIONS.PURCHASE_VIEW,
  PERMISSIONS.PURCHASE_CREATE,
  PERMISSIONS.PURCHASE_RECEIVE,
  // Stock opname
  PERMISSIONS.STOCK_OPNAME_VIEW,
  PERMISSIONS.STOCK_OPNAME_CREATE,
  PERMISSIONS.STOCK_OPNAME_FINALIZE,
  PERMISSIONS.INVENTORY_ADJUST,
  // Transactions (view only, bisa void)
  PERMISSIONS.TRANSACTION_VIEW,
  PERMISSIONS.TRANSACTION_VIEW_ALL,
  PERMISSIONS.TRANSACTION_VOID,
  PERMISSIONS.TRANSACTION_EXPORT,
  // Reports (tanpa profit — karena butuh harga modal)
  PERMISSIONS.REPORT_VIEW,
  PERMISSIONS.REPORT_EXPORT,
  // POS access
  PERMISSIONS.POS_ACCESS,
  PERMISSIONS.TRANSACTION_CREATE,
];

const KASIR_PERMISSIONS: Permission[] = [
  // POS only
  PERMISSIONS.POS_ACCESS,
  PERMISSIONS.PRODUCT_VIEW, // lihat produk di POS (tanpa harga modal)
  PERMISSIONS.CATEGORY_VIEW, // filter kategori di POS
  PERMISSIONS.TRANSACTION_CREATE,
  PERMISSIONS.TRANSACTION_VIEW, // lihat transaksi sendiri
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  kasir: KASIR_PERMISSIONS,
};

// ============================================================
// Permission Check Functions
// ============================================================

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

// ============================================================
// Route-level access control
// Maps route prefixes to required permissions
// ============================================================

export interface RouteRule {
  path: string;          // route prefix
  permissions: Permission[]; // ANY of these grants access
  matchType: 'prefix' | 'exact';
}

export const ROUTE_RULES: RouteRule[] = [
  // Dashboard
  { path: '/dashboard', permissions: [PERMISSIONS.DASHBOARD_VIEW], matchType: 'exact' },
  // Products
  { path: '/products', permissions: [PERMISSIONS.PRODUCT_VIEW], matchType: 'prefix' },
  // Categories
  { path: '/categories', permissions: [PERMISSIONS.CATEGORY_VIEW], matchType: 'prefix' },
  // Suppliers
  { path: '/suppliers', permissions: [PERMISSIONS.SUPPLIER_VIEW], matchType: 'prefix' },
  // Purchases
  { path: '/purchases', permissions: [PERMISSIONS.PURCHASE_VIEW], matchType: 'prefix' },
  // Stock Opname
  { path: '/stock-opname', permissions: [PERMISSIONS.STOCK_OPNAME_VIEW], matchType: 'prefix' },
  // Transactions
  { path: '/transactions', permissions: [PERMISSIONS.TRANSACTION_VIEW], matchType: 'prefix' },
  // Reports
  { path: '/reports', permissions: [PERMISSIONS.REPORT_VIEW], matchType: 'prefix' },
  // Settings
  { path: '/settings', permissions: [PERMISSIONS.SETTINGS_VIEW], matchType: 'prefix' },
  // Users
  { path: '/users', permissions: [PERMISSIONS.USER_VIEW], matchType: 'prefix' },
  // Audit logs
  { path: '/audit', permissions: [PERMISSIONS.AUDIT_VIEW], matchType: 'prefix' },
  // POS
  { path: '/pos', permissions: [PERMISSIONS.POS_ACCESS], matchType: 'prefix' },
];

/**
 * Check if a role can access a given path.
 * Returns true if no rule matches (unprotected route).
 */
export function canAccessRoute(role: string, path: string): boolean {
  const matchingRule = ROUTE_RULES.find((rule) => {
    if (rule.matchType === 'exact') {
      return path === rule.path;
    }
    return path.startsWith(rule.path);
  });

  // No rule found → unprotected route → allow
  if (!matchingRule) return true;

  // Check if role has ANY of the required permissions
  return hasAnyPermission(role, matchingRule.permissions);
}
