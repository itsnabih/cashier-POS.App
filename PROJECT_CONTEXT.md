# PROJECT CONTEXT

## 1. PROJECT OVERVIEW
**Purpose:**
This project is a Point of Sale (POS) and Inventory Management System designed for a retail store ("Sumber Baby Shop"). It is built with offline-first capabilities (PWA) to ensure the POS functions seamlessly even without an internet connection, syncing data back to the server when online.

**Core Tech Stack:**
*   **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React (Icons), Recharts.
*   **Backend:** Next.js API Routes (`src/app/api`).
*   **Database:** PostgreSQL (via `pg`) for the main server, Dexie (IndexedDB wrapper) for local offline storage.
*   **Forms & Validation:** React Hook Form, Zod.
*   **DevOps / Build:** TypeScript, Next.js build system, custom Node scripts for DB migration/seeding.

---

## 2. DIRECTORY STRUCTURE
```text
toko-bayi/
├── public/                 # Static assets (images, PWA manifest, icons)
├── scripts/                # Database migration and seeding scripts (e.g., migrate.ts, seed.ts)
├── src/
│   ├── app/                # Next.js App Router (Pages, Layouts, API Routes)
│   │   ├── (auth)/         # Authentication route group
│   │   ├── (dashboard)/    # Admin/Manager dashboard route group
│   │   ├── (pos)/          # Point of Sale route group
│   │   └── api/            # Backend API Routes (RESTful endpoints)
│   ├── components/         # Reusable React components (UI, layouts, inventory, pos)
│   ├── hooks/              # Custom React hooks (e.g., useToast)
│   ├── lib/                # Core backend logic, DB connections, auth, and offline sync
│   ├── types/              # TypeScript interfaces and type definitions
│   └── utils/              # Helper utilities (formatting, exports, hardware integration)
├── package.json            # Project dependencies and scripts
└── next.config.ts          # Next.js configuration
```
*   `src/app`: Contains the routing logic for both the UI (pages) and the backend (API routes). Uses Next.js Route Groups for organization.
*   `src/components`: Houses all presentational and interactive UI components.
*   `src/lib`: Contains essential libraries for interacting with databases (`db.ts`, `offline-db.ts`), authentication (`auth.ts`), role-based access control (`rbac.ts`), and synchronization logic (`transaction-sync.ts`).
*   `src/utils`: Contains pure functions for exporting reports (Excel/PDF), formatting data, and integrating with hardware (thermal printers).

---

## 3. ARCHITECTURE & DATA FLOW
**Architectural Pattern:**
The project implements a **Next.js App Router** architecture mixing React Server Components and Client Components. It utilizes a layered approach separating API routes (`src/app/api`), Database interactions (`src/lib`), and UI (`src/components`). It also heavily implements an **Offline-First (PWA)** pattern for the POS module.

**Standard Data Flow (Online):**
1.  **Client:** User interacts with a React component (e.g., submitting a form).
2.  **API Route:** Component makes a fetch request to a Next.js API route (e.g., `/api/products`).
3.  **Database logic:** The API route validates the input using Zod, checks RBAC, and calls queries via `src/lib/db.ts` (which manages a PostgreSQL connection pool).
4.  **Response:** The API responds with a standardized format (from `src/lib/api-response.ts`), and the client updates the UI.

**Standard Data Flow (Offline / POS):**
1.  **Client:** Cashier makes a transaction in the POS interface.
2.  **Local DB:** Data is written instantly to the local IndexedDB using `src/lib/offline-db.ts` (Dexie).
3.  **Background Sync:** When the internet connection is restored, `src/lib/transaction-sync.ts` runs in the background (potentially via Service Workers) to sync local transactions with the main PostgreSQL database via API routes.

---

## 4. CORE MODULES & FUNCTIONS
*   **Business Logic:** Found primarily in `src/app/api/` for endpoint definitions, and `src/lib/` for core processes like Role-Based Access Control (`rbac.ts`) and syncing (`transaction-sync.ts`).
*   **API Configurations:** Next.js Route Handlers (`route.ts`) are used in `src/app/api/*` folders. Standardized responses are handled by `src/lib/api-response.ts`.
*   **State Management:** React local state, Context API, and React Hook Form are used for UI state. Offline data state is managed by Dexie (`src/lib/offline-db.ts`).
*   **Key Utility Functions:**
    *   `src/utils/thermal-printer.ts`: Integrates with thermal printers for POS receipts.
    *   `src/utils/export-excel.ts` & `src/utils/export-pdf.ts`: Generate downloadable reports.
    *   `src/lib/db.ts`: Singleton PostgreSQL connection pool optimized for mini PCs.

---

## 5. CODING CONVENTIONS & RULES
*   **Naming Conventions:**
    *   React Components: `PascalCase` (e.g., `BatchLabelModal.tsx`).
    *   Utility/Lib files: `kebab-case` (e.g., `offline-db.ts`, `transaction-sync.ts`).
    *   Variables/Functions: `camelCase` (e.g., `formatCurrency`, `handleCheckout`).
*   **Design Patterns (Strict Rules):**
    *   **SQL Queries:** ALWAYS use parameterized queries (`$1, $2`) via the `query` wrapper in `src/lib/db.ts` to prevent SQL injection. Never use string interpolation.
    *   **Validation:** Use Zod for all request body/query validation in API routes.
    *   **Error Handling:** Use the standard API response structure (likely via `src/lib/api-response.ts`) rather than throwing raw errors to the client.
    *   **Component Architecture:** Maintain separation of concerns. UI components should not contain raw SQL queries.
*   **Styling:** Strictly use **TailwindCSS** (v4) utility classes. Do not use styled-components or raw CSS modules unless absolutely necessary.
*   **Icons:** Use `lucide-react` for all icons.

---

## 6. COMMANDS & SCRIPTS
*   **Install Dependencies:**
    `npm install`
*   **Run Local Development Server:**
    `npm run dev`
*   **Build for Production:**
    `npm run build`
*   **Start Production Server:**
    `npm run start`
*   **Database Management:**
    *   Run migrations: `npm run db:migrate` (or `npm run migrate`)
    *   Seed database: `npm run db:seed`
    *   Full DB setup (Migrate + Seed): `npm run db:setup`
