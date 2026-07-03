# Showroom Inventory Control System (IcS)

An interactive, responsive full-stack inventory and billing management application for showroom desks (specialized in Tiles & Sanitary wares). Built with Next.js 16, TypeScript, and Supabase, featuring real-time stock level auditing, client-side pagination, PDF picking slip generator, and automated email alerts.

Live deployment: [showroom-inventory-control-system.vercel.app](https://showroom-inventory-control-system.vercel.app)

---

## ⚡ Key Features

*   **Public Showroom Search**: Quick-lookup tool for salesmen to search stock items by Reference Code (SKU), inspect physical quantities, and print Picking Slips for warehouse dispatch without displaying confidential buying prices.
*   **Billing Invoice Builder**: Interactive checkout console for salesmen to compile sales items, dynamically quote square meters/boxes, print customer invoices, and deduct stock.
*   **Executive Dashboard**: Real-time sales telemetry including overall revenue performance charts (PKR), top product sales metrics, current stock asset valuations, and automated low-stock warnings.
*   **Stock Ledger & History**: Transactional audit ledger with a one-click Undo/Revert operation that automatically restores deleted stock quantities back to storage.
*   **CRUD Inventory Management**: Administrative interface to add, edit, or archive products, track buying price margins, and view individual product edit audit logs.
*   **Showroom Setup & CSV Import**: Configure dynamic categories, storage locations, run bulk import products via CSV files, and set up alert configurations.
*   **Automated Low-Stock Alerts**: Real-time threshold warnings sent via Resend API when products drop below warning limits. Built-in fallback mocks alerts to a client-side inbox for easy sandbox verification.

---

## 🚀 Quick Start

### Requirements
*   Node.js 20+
*   npm / yarn / pnpm / bun

### Install & Run
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment variable keys:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_ALERT_RECIPIENT_EMAILS=admin@showroom.com,manager@showroom.com
   # Optional: add Resend key to send live email alerts in production
   NEXT_PUBLIC_RESEND_API_KEY=re_your_api_key
   ```
   *(Note: If no Supabase environment keys are detected, the system will automatically activate a local mock database using `localStorage` so you can test all features instantly).*

3. Run the development server:
   ```bash
   npm.cmd run dev
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Scripts
```bash
npm run lint    # Run ESLint diagnostics
npm run build   # Production-ready Next.js build bundle
```

---

## 📂 Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── inventory/
│   │   │   │   └── page.tsx    # Inventory control page (with client-side pagination)
│   │   │   ├── invoice/
│   │   │   │   └── page.tsx    # Admin invoice checkout portal
│   │   │   ├── sales/
│   │   │   │   └── page.tsx    # Transactional sales ledger (with pagination)
│   │   │   ├── setup/
│   │   │   │   └── page.tsx    # Setup panel (Categories/Locations & Stock Alerts Console)
│   │   │   ├── layout.tsx      # Sidebar administrative shell layout
│   │   │   └── page.tsx        # Executive telemetry dashboard
│   │   ├── invoice/
│   │   │   └── page.tsx        # Public salesman invoice builder
│   │   ├── login/
│   │   │   └── page.tsx        # Admin authentication dashboard
│   │   ├── globals.css         # Styling system & dark-mode HSL variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Showroom lookup desk (Public Search)
│   ├── lib/
│   │   ├── db.ts               # DB switcher dispatcher (Supabase client vs Mock LocalStorage DB)
│   │   ├── alerts.ts           # Stock alert triggers & Resend SMTP fetch integration
│   │   └── supabaseClient.ts   # Supabase client instantiation
│   └── middleware.ts           # Security route guard protecting /admin/*
├── supabase/
│   └── migrations/
│       └── schema.sql          # Postgres DB layout, seed data, and Row Level Security policies
└── next.config.ts
```

---

## 🛠️ Tech Stack
*   **Framework**: Next.js 16 (App Router) + TypeScript 5
*   **Database**: Supabase (Postgres Database) + local fallback database via Web Storage APIs.
*   **Styling**: Custom CSS variables with responsive layout grids (no external heavy UI libraries).
*   **Integrations**: Resend API (automated notifications) & Lucide Icons.

---

## 📂 Database Schema Setup (Postgres)
To run in production with a live database, run the SQL script located in [`supabase/migrations/schema.sql`](file:///c:/Users/hp%20pavilion/Desktop/IcS/supabase/migrations/schema.sql) in your Supabase SQL Editor. 

To enable alert state tracking, make sure you execute:
```sql
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE;
```
