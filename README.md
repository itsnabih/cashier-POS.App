# BabyPOS

A modern, fast, and scalable Point of Sale (POS) and Inventory Management system tailored for retail stores. Built with Next.js, React, Tailwind CSS, and PostgreSQL.

## Core Features

- **Role-Based Access Control (RBAC):** Secure access separation between Owner, Admin, and Cashier roles.
- **Mouseless Cashier POS:** Highly optimized keyboard-first interface to significantly speed up transaction processing.
- **Multi-Tab Queuing:** Ability to park or hold up to 5 customer transactions simultaneously without losing data.
- **Real-time Inventory:** Stock tracking, category management, pricing (buy/sell), and low-stock alerts.
- **Responsive & Modern UI:** Clean, fast, and responsive user interface.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL
- **Styling:** Tailwind CSS + Lucide React icons
- **Authentication:** Custom JWT (jose)
- **Deployment:** Ready for Vercel / Docker

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure `.env.local` based on the example:
   ```bash
   cp .env.example .env.local
   ```

3. Initialize and seed the database:
   ```bash
   npm run db:setup
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application. Log in using the default accounts provided in the seeder file.

## License

Private / Proprietary. All rights reserved.
