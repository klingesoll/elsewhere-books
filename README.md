# 別處書社 Elsewhere Books

Independent Chinese bookshop in Melbourne — web storefront, POS system, and inventory tools.

**Production** → [elsewhere-books.vercel.app](https://elsewhere-books.vercel.app)

## Architecture

```
React 19 + Vite 8          ← SPA storefront
Vercel Serverless Functions ← API layer (api/)
Supabase (PostgreSQL)       ← Database + RLS
Gemini 2.5 Flash            ← AI book scanning
Python CustomTkinter        ← Desktop POS (offline-first)
```

### Project Structure

```
api/                     Vercel serverless endpoints
  _shared.js               Shared auth, CORS, inventory logic
  record-sale.js            Record a sale + deduct inventory
  void-sale.js              Void a sale + restore inventory
  sync-sales.js             Bulk sync from desktop app
  scan.js                   Gemini AI — spine/price recognition
  save-book.js              Insert a single book
  isbn-lookup.js            Google Books → Open Library fallback
  price-lookup.js           Gemini + Google Search grounding
  events.js                 Luma calendar proxy (5min cache)
  exchange-rates.js         AUD exchange rates (1hr cache)
  health.js                 Health check
src/
  App.jsx                 Routes: / (store), /scan (admin), /pos (admin)
  components/
    BookCatalog.jsx         Accordion book browser (Supabase → fallback)
    BookCover.jsx           Hand-designed SVG covers per SKU
    BookCard.jsx            Card with hover excerpt
    Header / Footer / Hero / Sidebar / Volunteers
    AdminRoute.jsx          Password gate for admin pages
  pages/
    POS.jsx                 Point-of-sale — cart, pricing, history, CSV export
    Scanner.jsx             Step-based AI scanner (spine → price → save)
    LoginPage.jsx           Admin login
  lib/
    supabase.js             Client init (defensive null check)
    pricing.js              calculatePrice() — new/used/corner book pricing
  constants/
    site.js                 Categories, quotes, reading lists, static books
scripts/
  import-books.mjs        Batch import from Excel/PDF purchase orders
  sync-to-supabase.js     Sync local sales JSON → cloud
  bookstore_app_v7.1.py   Desktop POS app (Python, offline-first)
  supabase-init.sql        DB schema (books + sales tables)
```

## Database Design

Inventory uses **derived state** — no separate `status` field:

```
books.sold_in_sale_id = NULL  → in stock
books.sold_in_sale_id = 42    → sold in sale #42
```

Voiding a sale: `UPDATE books SET sold_in_sale_id = NULL WHERE sold_in_sale_id = ?`

Two tables: `books` (barcode, title, author, price, category, sold_in_sale_id) and `sales` (items JSONB, totals, source, status). RLS restricts public reads to in-stock books only.

## Setup

```bash
git clone https://github.com/klingesoll/elsewhere-books.git
cd elsewhere-books
npm install
cp .env.example .env   # fill in keys
npm run dev             # http://localhost:5173
```

### Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anon key (RLS-gated) |
| `SUPABASE_URL` | Server | Same URL, for API functions |
| `SUPABASE_SERVICE_KEY` | Server | Service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Server | Google Gemini 2.5 Flash |
| `ADMIN_SECRET` | Server | Token for admin API endpoints |
| `LUMA_CALENDAR_ID` | Server | Luma events calendar ID |

## Deploy

```bash
npx vercel --prod
```

Vercel auto-deploys `api/` as serverless functions. SPA fallback is configured in `vercel.json`.

## Scripts

```bash
# Import books from supplier purchase orders (Excel or PDF)
node scripts/import-books.mjs scripts/data/報價單__日期_20260205.xls
node scripts/import-books.mjs scripts/data/大陆进货单.pdf

# Sync desktop app sales to cloud
node scripts/sync-to-supabase.js
```

Supplier configs are extensible via `SUPPLIER_CONFIGS` in `import-books.mjs` — add a `detect` + `parseBook` function per supplier format.

## Key Design Decisions

- **Inventory = derived state**: `sold_in_sale_id` FK eliminates status sync bugs
- **Barcode-first deduction**: Exact match by barcode, title ilike as fallback
- **Supplier configs (Open/Closed)**: New supplier formats without touching parsing logic
- **Desktop → Cloud sync**: Offline-first POS with idempotent `source_id` dedup
- **Static fallback**: Site works without Supabase (renders `STATIC_BOOKS`)

## Tech Stack

React 19 · Vite 8 · Supabase · Vercel · Gemini 2.5 Flash · Python CustomTkinter
