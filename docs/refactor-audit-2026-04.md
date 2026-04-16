# Elsewhere Books 代码审计与重构记录


---

## 一、审计范围

对 `elsewhere-books` 全部 29+ 源文件进行逐一检查，覆盖：

| 层级 | 路径 | 说明 |
|------|------|------|
| Vercel API | `api/*.js` | 9 个 serverless 端点 |
| React 前端 | `src/components/`, `src/pages/` | 所有页面与组件 |
| 工具库 | `src/lib/`, `src/constants/` | 定价引擎、Supabase 客户端 |
| 构建配置 | `vite.config.js` | 含开发代理 |
| Python 桌面端 | `scripts/bookstore_app_v7.1.py` | POS 同步应用 |

---

## 二、新增文件

### 1. `api/_shared.js` — API 共享工具

集中管理所有 serverless 函数的公共逻辑，消除跨文件重复：

```
geminiUrl(apiKey)       → 拼接 Gemini API 完整 URL（模型版本统一管理）
getGeminiKey()          → 读取 GEMINI_API_KEY，缺失时抛错
getLumaCalendarId()     → 读取 LUMA_CALENDAR_ID（带 fallback）
verifyAdmin(req)        → 校验 x-admin-token（无 secret 时默认放行）
getSupabaseConfig()     → 返回 { url, key }，缺失时抛错
setCorsHeaders(res)     → 统一设置 CORS 响应头
EXCHANGE_RATE_API       → 汇率接口 URL
TRACKED_CURRENCIES      → 追踪的 11 种货币列表
```

### 2. `src/constants/site.js` — 前端共享常量

所有前端组件共用的业务数据，单一数据源：

```
CATEGORIES              → 26 个书籍分类（Sidebar、POS、Scanner 共用）
LUMA_PROFILE_URL        → Luma 活动页链接
VOLUNTEER_GROUPS        → 5 个志愿者小组定义
QUOTES                  → 首页滚动语录
READING_LISTS           → 书单展示数据
STATIC_BOOKS            → 静态书目数据
```

### 3. `.env.example` — 环境变量模板

```env
VITE_SUPABASE_URL=          # 浏览器端 Supabase
VITE_SUPABASE_ANON_KEY=     # 浏览器端匿名 Key
SUPABASE_URL=               # 服务端 Supabase
SUPABASE_SERVICE_KEY=       # 服务端 Service Key
GEMINI_API_KEY=             # Gemini AI
ADMIN_SECRET=               # 管理接口令牌
LUMA_CALENDAR_ID=           # Luma 日历 ID
```

---

## 三、文件修改清单

### API 层（`api/`）

| 文件 | 改动 | 影响 |
|------|------|------|
| `events.js` | 硬编码 Calendar ID → `getLumaCalendarId()`；手写 CORS → `setCorsHeaders()` | 消除重复 |
| `exchange-rates.js` | 硬编码 URL + 货币列表 → `EXCHANGE_RATE_API` + `TRACKED_CURRENCIES` | 单一数据源 |
| `scan.js` | 硬编码 Gemini URL → `geminiUrl()`；手写 CORS → `setCorsHeaders()` | 模型版本集中管理 |
| `price-lookup.js` | 硬编码 Gemini URL → `geminiUrl()` + `getGeminiKey()` | 同上 |
| `save-book.js` | 内联 admin/supabase 逻辑 → `verifyAdmin()` + `getSupabaseConfig()` | 认证逻辑一致 |
| `record-sale.js` | 同上 | 同上 |
| `sync-sales.js` | 同上 | 同上 |
| `health.js` | 移除 `keyPrefix`（泄露 API Key 前缀）→ 仅返回布尔 `has*` 标识 | 安全修复 |

### 前端组件（`src/`）

| 文件 | 改动 |
|------|------|
| `LoginPage.jsx` | `'elsewhere2024'` → `import.meta.env.VITE_ADMIN_PASSWORD \|\| 'dev'` |
| `Footer.jsx` | `© 2024` → `© {new Date().getFullYear()}` |
| `Sidebar.jsx` | 26 项内联分类数组 → `import { CATEGORIES, LUMA_PROFILE_URL }` |
| `POS.jsx` | 重复的分类数组 → `import { CATEGORIES }` |
| `BookCatalog.jsx` | ~70 行内联数据 → `import { QUOTES, READING_LISTS, STATIC_BOOKS }` |
| `Volunteers.jsx` | 内联志愿者分组 → `import { VOLUNTEER_GROUPS }` |

### 工具与配置

| 文件 | 改动 |
|------|------|
| `src/lib/pricing.js` | 魔法数字 `1.15`、`0.9`、`0.85` → 具名常量 `SHIPPING_MARKUP`、`MEMBER_DISCOUNT`、`RECOMMENDED_DISCOUNT` |
| `vite.config.js` | 硬编码 Calendar ID → `process.env.LUMA_CALENDAR_ID`；内联货币列表 → 命名常量 |

---

## 四、架构原则

```
┌──────────────────────────────────────────────┐
│  .env / Vercel Environment Variables         │  ← 所有敏感值
├──────────────────────────────────────────────┤
│  api/_shared.js                              │  ← 服务端共享工具
│  src/constants/site.js                       │  ← 前端共享常量
├──────────────────────────────────────────────┤
│  api/*.js          src/components/*.jsx      │  ← 业务代码（只导入，不定义常量）
│  src/pages/*.jsx   src/lib/*.js              │
└──────────────────────────────────────────────┘
```

**规则：**
1. **零硬编码密钥** — 所有秘密值从 `process.env` / `import.meta.env` 读取
2. **单一数据源** — 分类、货币、URL 等在一处定义，全项目导入
3. **集中鉴权** — `verifyAdmin()` 统一处理，不在各端点重复实现
4. **Gemini 模型统一** — 模型名和 base URL 在 `_shared.js` 管理，升级只改一处
5. **CORS 统一** — `setCorsHeaders()` 保证所有端点行为一致
6. **定价透明** — 所有乘数使用命名常量，业务含义一目了然

---

## 五、如何添加新的 API 端点

```js
import { verifyAdmin, getSupabaseConfig, setCorsHeaders } from './_shared.js'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { url, key } = getSupabaseConfig()
  const supabase = createClient(url, key)

  // ... 业务逻辑
}
```

---

## 六、环境配置

本地开发前复制 `.env.example` → `.env` 并填入实际值：

```bash
cp .env.example .env
```

Vercel 部署通过 Dashboard → Settings → Environment Variables 配置，无需改动代码。

---

## 七、系统设计复盘：books ↔ sales 精确关联

### 问题

`books` 表（进货单导入）和 `sales` 表（桌面App/POS写入）之间没有关联，库存状态靠 `status` 字段手动切换，卖书时用 title ilike 模糊匹配——脆弱、不可靠、不可维护。

```
books                              sales
┌──────────────────┐               ┌──────────────────┐
│ title_cn: 桥头楼上│       ❌      │ items: [{title:  │
│ isbn: 978...666  │   没有关联     │   "桥头楼上",...}]│
│ status: active   │               │ total_aud: 25    │
└──────────────────┘               └──────────────────┘
```

### 设计三问（面试思路推演）

**Q1：卖了一本书，怎么知道卖的是 books 表里的哪一条？**

初版用 `title ilike '%桥头楼上%'` 模糊匹配。3 本同名书无法区分，空格/大小写差异直接匹配失败。模糊匹配是脆弱的。

**Q2：最少加什么，就能把两张表连起来？**

不是新建 `sale_items` 关联表（过度设计），而是：

```sql
alter table books add column sold_in_sale_id bigint references sales(id);
```

- `NULL` = 在库，`有值` = 已卖（卖在哪笔交易里）
- 库存是派生状态：`WHERE sold_in_sale_id IS NULL`
- 作废还原一句搞定：`UPDATE books SET sold_in_sale_id = NULL WHERE sold_in_sale_id = X`
- 不需要 `status` 字段，不需要 `deductBook` 模糊匹配，不需要 `restoreBooks` 反向查找

**Q3：桌面端离线卖书，不知道 Supabase book_id，怎么关联？**

用 barcode/ISBN 做自然键（全球唯一）。没有 ISBN 的独立 zine → 导入时自动生成内部编号 `EB-00001`。标题变成快照（receipt 用），barcode 才是连接键。

### 最终设计

```
books                              sales
┌────────────────────┐             ┌──────────────────┐
│ id: 1              │             │ id: 1            │
│ barcode: 978...666 │◄──精确匹配──│ items: [{barcode:│
│ title: 桥头楼上     │             │  "978...666"...}]│
│ sold_in_sale_id: 1 │─────FK─────►│ total_aud: 25    │
│ price_aud: 25      │             │ source: desktop  │
└────────────────────┘             └──────────────────┘
```

### 改动清单

| 文件 | 改动 |
|------|------|
| `migrate-001-sold-in-sale.sql` | 新增 `barcode` + `sold_in_sale_id` 列、索引、RLS 策略更新 |
| `api/_shared.js` | `deductBook(supabase, saleId, {barcode})` 精确匹配 + `restoreBooks(supabase, saleId)` 一句还原 |
| `api/record-sale.js` | 传 `sale.id` 给 `deductBook`，按 barcode 关联 |
| `api/sync-sales.js` | insert 返回 sale ID → 建 map → 精确关联 |
| `api/void-sale.js` | `restoreBooks(supabase, sale.id)` 一句清空 |
| `src/components/BookCatalog.jsx` | `.is('sold_in_sale_id', null)` 替代 `.eq('status', 'active')` |
| `scripts/import-books.mjs` | 供应商配置驱动、自动检测格式、无码 zine 生成 `EB-XXXXX` |
| `scripts/supabase-init.sql` | 新装环境包含 `barcode` + `sold_in_sale_id` |

### 设计原则

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| 关联方式 | title ilike 模糊匹配 | barcode 精确匹配 |
| 库存状态 | `status` 字段手动切换 | `sold_in_sale_id IS NULL` 派生 |
| 作废还原 | 逐条循环找 sold 的书 | `SET sold_in_sale_id = NULL` 一句 |
| 无码书 | 无法关联 | 自动生成 `EB-XXXXX` 内部编号 |
好，我换个角色。以下是我作为面试官的视角。

---

## 面试官笔记：Elsewhere Books 项目评估

### 第一轮：产品感觉（5分钟）

> 「你为什么选这个架构，而不是直接用 Shopify？」

**期待的回答**：独立书店不需要电商——没有物流、没有线上支付、没有SKU管理。顾客来店里翻书、聊天、买走。需要的是：进货能记、卖书能扫、库存能查、网站能展示。Shopify 月费 $39，功能 90% 用不上。

**加分项**：能说出「我的用户画像是一个人（我自己）」——这决定了所有技术选型。Vercel 免费、Supabase 免费、零运维。**约束驱动设计**，不是技术驱动。

---

### 第二轮：我会追问的 6 个系统设计点

#### 1. 离线优先 + 同步冲突

> 「市集现场没网，卖了 5 本书。回来连网同步，发现其中 2 本已经被网站 POS 卖掉了。怎么办？」

| 你现在的处理 | 面试官期待 |
|---|---|
| `source_id` 去重，跳过已存在的 sale | ✅ 去重是对的 |
| `deductBook` 按 barcode 找一本在库的书关联 | ⚠️ 如果这本书已经被另一笔 sale 关联了呢？ |
| 没有冲突检测 | ❌ 应该返回 `conflict: [{barcode, already_sold_in: sale_id}]` |

**亮点回答**：「同一本书不可能卖两次，所以 `sold_in_sale_id` 天然是乐观锁——UPDATE 时加 `WHERE sold_in_sale_id IS NULL`，0 rows affected 就说明冲突了。不需要额外的锁机制。」

#### 2. 库存超卖

> 「同时两个人扫了同一个 barcode 的最后一本书，都走到 `deductBook`，会怎样？」

你现在的代码：
```js
.update({ sold_in_sale_id: saleId })
.eq('barcode', code)
.is('sold_in_sale_id', null)
.limit(1)
```

**实际上是安全的**——Postgres 的 `UPDATE ... WHERE ... LIMIT 1` 是行锁级别的，两个并发请求不会同时匹配到同一行。但你能不能**说出为什么安全**，而不是碰巧安全，这是区别。

**加分回答**：「Supabase 底层是 Postgres，UPDATE 会对匹配行加排他锁。两个请求竞争同一行时，第二个会等第一个 commit 后再执行 WHERE 条件——这时 `sold_in_sale_id` 已经不是 NULL 了，所以匹配不到。返回 0 rows，sale 照常记录，只是 deducted=0。」

#### 3. 数据一致性 vs 可用性

> 「`deductBook` 失败了，sale 还是记录成功了。这是 bug 还是设计？」

**期待回答**：是设计。

```
卖书 = 收钱 + 记账 + 扣库存
       ^^^^^^^^         ^^^^^^^^
       必须成功          尽力而为
```

收钱是不可逆的（顾客已经付了），所以 sale 必须记录。库存关联是**最终一致**——最坏情况是库存数字差一本，下次盘点就能发现。**不能因为库存系统挂了就拒绝卖书。**

这就是 AP 优先（可用性 > 一致性）。小书店的正确选择。

#### 4. 进货单供应商适配

> 「新来一个台湾供应商，表格格式完全不同。加一个要改几个文件？」

**你现在的设计**：

```js
const SUPPLIER_CONFIGS = {
  feidi: { name: '荷兰飞地书店', headerRow: 8, columns: {...}, parseBook: ... },
  mainland: { name: '大陆供应商', headerRow: 0, columns: {...}, parseBook: ... },
}
```

**回答**：加一个 `taiwan: {...}` 对象。一个文件，一个对象。零改动核心逻辑。

**可以追问**：「如果供应商格式经常变，你会怎么做？」→ 把 config 提到 JSON 文件或数据库，不用改代码。但现在供应商就 2-3 家，过早抽象是浪费。

#### 5. 安全边界

> 「你的 admin 认证是怎么做的？」

```js
export function verifyAdmin(req) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return true  // ← 这行
  return req.headers['x-admin-token'] === secret
}
```

**面试官会指出**：没配 secret 时**默认放行**。开发方便，但如果生产环境漏配了 `ADMIN_SECRET`，所有写接口裸奔。

**期待改进**：在生产环境强制要求 secret：
```js
if (!secret) {
  if (process.env.VERCEL_ENV === 'production') throw new Error('ADMIN_SECRET required in production')
  return true
}
```

#### 6. 观测性

> 「线上出了 bug，你怎么排查？」

你现在有 `console.log`。Vercel 有 Function Logs。但：
- 没有结构化日志（JSON format）
- 没有 request ID 串联一次请求的所有日志
- 没有告警（库存关联失败率突然升高）

**对 junior 不强求**，但能提到「我会加 request ID」就加分。

---

### 第三轮：我最想听到的亮点

| 亮点 | 为什么加分 |
|---|---|
| **「库存是派生状态，不是存储状态」** | 说明理解了 single source of truth |
| **「sold_in_sale_id 是自带的乐观锁」** | 说明理解了并发，不是背八股 |
| **「sale 必须成功，库存尽力而为」** | 说明能做 trade-off，不追求完美一致性 |
| **「一个人运维，所以选零运维架构」** | 说明约束驱动设计，不是技术炫技 |
| **「供应商格式是配置，不是代码」** | 说明理解了 Open-Closed 原则（对扩展开放，对修改封闭）|
| **「barcode 是自然键，title 是快照」** | 说明理解了什么该做主键、什么该做冗余 |

---

### 总评

**强项**：产品判断力好，知道什么不该做（不上 Shopify、不建关联表、不加微服务）。数据建模从模糊匹配演进到精确关联，思路清晰。

**提升空间**：
1. 并发安全能说清楚原理（不只是碰巧安全）
2. 生产环境的防御性编程（`verifyAdmin` 的默认放行）
3. 可观测性意识（结构化日志 + request ID）
4. 离线同步的冲突检测（返回 conflict 列表而不是静默跳过）

**结论**：通过。不是因为代码完美，而是因为**每个决策都能说出为什么**。
**零新表、一个新列、消灭所有模糊匹配。**
