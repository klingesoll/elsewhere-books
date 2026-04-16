-- ============================================================
--  Elsewhere Books · Supabase 初始化 SQL
--  在 Supabase Dashboard → SQL Editor 中运行此文件
-- ============================================================

-- ── 1. 书籍表 ──────────────────────────────────────────────
create table if not exists books (
  id              bigint generated always as identity primary key,
  barcode         text,                                      -- ISBN 或内部编号 EB-XXXXX
  title_cn        text,
  title_en        text,
  author          text,
  publisher       text,
  year            text,
  isbn            text,
  category        text,
  price           numeric(10, 2),
  excerpt         text,
  sku             text,
  cover_url       text,
  sold_in_sale_id bigint,                                    -- NULL=在库, 有值=已卖
  status          text not null default 'active',            -- legacy, 以 sold_in_sale_id 为准
  created_at      timestamptz not null default now()
);

-- 索引
create index if not exists idx_books_barcode on books (barcode);
create index if not exists idx_books_sold_in_sale on books (sold_in_sale_id);
create index if not exists idx_books_category on books (category);

-- ── 2. 销售表 ──────────────────────────────────────────────
create table if not exists sales (
  id              bigint generated always as identity primary key,
  source_id       text,                                      -- 桌面端同步 ID（如 20260416_143052）
  timestamp       timestamptz default now(),
  items           jsonb not null,                             -- 书籍明细 JSON 数组
  purchase_type   text not null check (purchase_type in ('member', 'standard')),
  manager         text,
  total_aud       numeric(10, 2) not null default 0,
  total_member    numeric(10, 2),
  total_standard  numeric(10, 2),
  item_count      int not null default 0,
  source          text not null default 'web_pos',            -- 'web_pos' | 'desktop_app'
  status          text not null default 'active',             -- 'active' | 'voided'
  voided_at       timestamptz,
  void_reason     text,
  created_at      timestamptz not null default now()
);

-- 桌面端去重索引
create unique index if not exists idx_sales_source_id on sales (source_id) where source_id is not null;
-- 查询活跃订单
create index if not exists idx_sales_status on sales (status);
create index if not exists idx_sales_created on sales (created_at desc);

-- ── 3. Row Level Security (RLS) ────────────────────────────
-- 启用 RLS
alter table books enable row level security;
alter table sales enable row level security;

-- 前端只能看在库的书（sold_in_sale_id IS NULL = 在库）
create policy "Public can read in-stock books"
  on books for select
  using (sold_in_sale_id is null);

-- 前端不能直接读 sales（所有写操作通过 service_key 的 API 完成）
-- 如果日后需要前端展示销售统计，再加 select policy

-- Service key 绕过 RLS，所以 API 端点的写操作不受影响
