-- ============================================================
--  Migration 001: sold_in_sale_id + barcode
--  精确关联设计：用 barcode 匹配，sold_in_sale_id 追踪卖在哪笔
--  在 Supabase Dashboard → SQL Editor 中运行
-- ============================================================

-- ── 1. 新增 barcode 列 ─────────────────────────────────────
alter table books add column if not exists barcode text;

-- 把已有 isbn 填入 barcode（isbn 就是条码）
update books set barcode = isbn where isbn is not null and barcode is null;

-- barcode 索引（用于卖书时精确匹配）
create index if not exists idx_books_barcode on books (barcode);

-- ── 2. 新增 sold_in_sale_id 列 ─────────────────────────────
alter table books add column if not exists sold_in_sale_id bigint references sales(id);

-- sold_in_sale_id 索引（用于作废时批量还原）
create index if not exists idx_books_sold_in_sale on books (sold_in_sale_id);

-- 迁移旧数据：status='sold' 的书保留 sold_in_sale_id=null（无法追溯）
-- 新设计以 sold_in_sale_id 为准，status 列保留但不再用于库存判断

-- ── 3. 更新 RLS 策略 ──────────────────────────────────────
-- 删旧策略
drop policy if exists "Public can read active books" on books;

-- 新策略：前端只能看在库的书（sold_in_sale_id IS NULL）
create policy "Public can read in-stock books"
  on books for select
  using (sold_in_sale_id is null);
