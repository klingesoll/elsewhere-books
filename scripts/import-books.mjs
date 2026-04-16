/**
 * 批量导入进货单 Excel → Supabase books 表
 *
 * 用法:
 *   node scripts/import-books.mjs scripts/data/報價單__日期_20260205.xls
 *   node scripts/import-books.mjs scripts/data/大陆进货单.pdf
 *   node scripts/import-books.mjs scripts/data/*.xls    (多个文件)
 *
 * 支持格式: .xls, .xlsx, .pdf
 * 每个供应商格式不同，通过 SUPPLIER_CONFIGS 配置。
 * 脚本自动根据文件特征检测供应商。
 * 需要 .env 里配好 SUPABASE_URL 和 SUPABASE_SERVICE_KEY
 */

import { readFileSync } from 'fs'
import { resolve, basename, extname } from 'path'
import { read, utils } from 'xlsx'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config() // 加载 .env

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY，请检查 .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── 供应商配置 ──────────────────────────────────────────────
// 每个供应商有不同的 Excel 格式，这里统一描述
const SUPPLIER_CONFIGS = {
  feidi: {
    name: '荷兰飞地书店',
    // 文件名含「報價單」或来自 ACHKI 品牌
    detect: (filename, rows) =>
      filename.includes('報價單') || rows.some(r => JSON.stringify(r).includes('ACHKI')),
    headerRow: 8,       // 0-indexed: 第 9 行是表头
    columns: {
      barcode:  '條碼',
      title:    '品名',
      author:   '作者',
      brand:    '品牌',
      price:    '售價',   // 用折后售价（EUR）
      quantity: '數量',
    },
    currency: 'EUR',
    // 跳过运费行和汇总行
    skipRow: (row) => {
      const code = String(row['條碼'] || '')
      const title = String(row['品名'] || '')
      return code.startsWith('freight') || title === '' || code === '合計'
    },
    parseBook: (row, cols) => ({
      barcode:   String(row[cols.barcode] || '').trim() || null,
      title_en:  String(row[cols.title] || '').trim() || null,
      title_cn:  null,
      author:    String(row[cols.author] || '').trim() || null,
      publisher: String(row[cols.brand] || '').trim() || null,
      price:     parseFloat(row[cols.price]) || null,
      quantity:  parseInt(row[cols.quantity]) || 1,
      category:  null,  // 飞地单无分类，后续手动补
    }),
  },
  mainland: {
    name: '大陆供应商（通用）',
    detect: (filename, rows) => {
      const first = rows[0] || {}
      return '书名' in first || '書名' in first
    },
    headerRow: 0,      // 第一行就是表头
    columns: {
      isbn:      'ISBN',
      title:     '书名',
      author:    '作者',
      publisher: '出版社',
      brand:     '出版品牌',
      price:     '原价',
      quantity:  '册数',
      cat1:      '类别1',
      cat2:      '类别2',
    },
    currency: 'CNY',
    skipRow: (row) => !String(row['书名'] || row['書名'] || '').trim(),
    parseBook: (row, cols) => {
      const cat1 = String(row[cols.cat1] || row['類別1'] || '').trim()
      const cat2 = String(row[cols.cat2] || row['類別2'] || '').trim()
      const isbn = String(row[cols.isbn] || '').trim()
      const publisher = String(row[cols.publisher] || row['出版社'] || '').trim()
      const brand = String(row[cols.brand] || row['出版品牌'] || '').trim()
      return {
        barcode:   isbn || null,
        title_cn:  String(row[cols.title] || row['書名'] || '').trim() || null,
        title_en:  null,
        author:    String(row[cols.author] || row['作者'] || '').trim() || null,
        publisher: brand ? `${publisher}·${brand}` : publisher || null,
        price:     parseFloat(row[cols.price] || row['原價'] || 0) || null,
        quantity:  parseInt(row[cols.quantity] || row['冊數'] || 1) || 1,
        category:  mapCategory(cat1, cat2),
      }
    },
  },
}

// ── 类别映射（大陆供应商用）─────────────────────────────────
const CATEGORY_MAP = {
  '大陆文学': '小说', '香港文学': '小说', '台湾文学': '台湾文学',
  '日本文学': '日本文学', '东南亚文学': '东南亚文学', '酷儿文学': '小说',
  '女性主义': '女性主义', '哲学': '哲学', '历史': '历史', '政治': '政治',
  '非虚构': '纪实文学', '纪实': '纪实文学', '文艺理论': '文艺批评',
  '剧作': '艺术', '电影': '艺术', '摄影': '摄影', '建筑': '建筑',
  '音乐': '音乐', '诗歌': '诗歌', '漫画': '漫画', '散文': '散文',
  '社科': '社科', '科普': '科普', '传记': '传记', '心灵疗愈': '心灵疗愈',
  '文化研究': '文化研究', '中国研究': '中国研究',
}

function mapCategory(cat1, cat2) {
  for (const raw of [cat1, cat2]) {
    if (raw && CATEGORY_MAP[raw.trim()]) return CATEGORY_MAP[raw.trim()]
  }
  return '其他'
}

// ── 自动检测供应商 ──────────────────────────────────────────
function detectSupplier(filename, rows) {
  for (const [key, cfg] of Object.entries(SUPPLIER_CONFIGS)) {
    if (cfg.detect(filename, rows)) return { key, cfg }
  }
  return null
}

// ── 生成内部条码（无 ISBN 的 zine 等）──────────────────────
async function getNextInternalBarcode() {
  const { data } = await supabase
    .from('books')
    .select('barcode')
    .like('barcode', 'EB-%')
    .order('barcode', { ascending: false })
    .limit(1)

  if (data?.length) {
    const num = parseInt(data[0].barcode.replace('EB-', '')) || 0
    return `EB-${String(num + 1).padStart(5, '0')}`
  }
  return 'EB-00001'
}

// ── 解析 Excel ─────────────────────────────────────────────
function parseExcel(filePath, supplierCfg) {
  const buf = readFileSync(filePath)
  const wb = read(buf, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]

  let rows
  if (supplierCfg.headerRow > 0) {
    // 有装饰行的格式：先读 raw rows，跳到表头行
    const allRows = utils.sheet_to_json(ws, { header: 1, defval: '' })
    const headers = allRows[supplierCfg.headerRow]
    const dataRows = allRows.slice(supplierCfg.headerRow + 1)
    rows = dataRows.map(r => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = r[i] ?? '' })
      return obj
    })
  } else {
    rows = utils.sheet_to_json(ws, { defval: '' })
  }

  return rowsToBooks(rows, supplierCfg)
}

// ── 解析 PDF 表格 ──────────────────────────────────────────
async function parsePDF(text, supplierCfg) {

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const rows = []

  for (const line of lines) {
    const parts = line.split('|||').map(s => s.trim())
    if (parts.length < 3) continue

    // 必须以 13 位 ISBN 开头
    const isbnMatch = parts[0].match(/^(\d{13})\s+(.+)/)
    if (!isbnMatch) continue

    const isbn = isbnMatch[1]
    const title = isbnMatch[2].trim()
    const author = parts[1]

    // 从 col[2] 开始分类：文本(出版社/品牌)、数字(册数/价格)、分类(中文末尾)
    const rest = parts.slice(2)
    const textFields = []
    const numbers = []
    const cats = []

    for (let i = 0; i < rest.length; i++) {
      const val = rest[i]

      // 纯整数
      if (/^\d+$/.test(val)) {
        numbers.push({ val: parseInt(val), isInt: true })
        continue
      }

      // 纯小数
      if (/^[\d.]+$/.test(val)) {
        numbers.push({ val: parseFloat(val), isInt: false })
        continue
      }

      // 纯中文 → 靠近末尾的是分类，靠前的是出版社/品牌
      if (/^[\u4e00-\u9fff]/.test(val) && !/\d/.test(val)) {
        if (i >= rest.length - 2) {
          cats.push(val)
        } else {
          textFields.push(val)
        }
        continue
      }

      // 混合：数字+中文（如 "0.5 女性主义" 或 "16.87 0.30125女性主义"）
      const catMatch = val.match(/([\u4e00-\u9fff][\u4e00-\u9fff\s·/]*)$/)
      if (catMatch) {
        cats.push(catMatch[1].trim())
        const numPart = val.slice(0, val.indexOf(catMatch[1])).trim()
        const nums = numPart.match(/[\d.]+/g)
        if (nums) nums.forEach(n => numbers.push({ val: parseFloat(n), isInt: Number.isInteger(parseFloat(n)) }))
        continue
      }

      // 多个数字合并（如 "29.3 0.5549242424"）
      const nums = val.match(/[\d.]+/g)
      if (nums) nums.forEach(n => numbers.push({ val: parseFloat(n), isInt: Number.isInteger(parseFloat(n)) }))
    }

    // 册数 = 第一个 ≤10 的整数，原价 = 第一个 >10 的数
    const qty = numbers.find(n => n.isInt && n.val > 0 && n.val <= 10)?.val || 1
    const price = numbers.find(n => n.val > 10)?.val || 0

    rows.push({
      'ISBN': isbn,
      '书名': title,
      '作者': author,
      '出版社': textFields[0] || '',
      '出版品牌': textFields[1] || '',
      '册数': qty,
      '原价': price,
      '类别1': cats[0] || '',
      '类别2': cats[1] || '',
    })
  }

  console.log(`   📄 PDF 解析到 ${rows.length} 行数据`)
  return rowsToBooks(rows, supplierCfg)
}

// ── 行数据 → 书籍对象 ──────────────────────────────────────
function rowsToBooks(rows, supplierCfg) {
  const books = []
  for (const row of rows) {
    if (supplierCfg.skipRow(row)) continue
    const book = supplierCfg.parseBook(row, supplierCfg.columns)
    if (!book.title_cn && !book.title_en) continue
    books.push(book)
  }
  return books
}

// ── 导入单个文件 ───────────────────────────────────────────
async function importFile(filePath) {
  const absPath = resolve(filePath)
  const fname = basename(absPath)
  const ext = extname(fname).toLowerCase()
  const isPDF = ext === '.pdf'
  console.log(`\n📖 读取: ${absPath} (${isPDF ? 'PDF' : 'Excel'})`)

  // 先粗读检测供应商
  let peekRows
  let pdfText
  if (isPDF) {
    // PDF: 提取文本一次，复用于检测和解析
    const buf = readFileSync(absPath)
    const p = new PDFParse({ data: buf })
    await p.load()
    const { text } = await p.getText({ cellThreshold: 3, cellSeparator: '|||' })
    pdfText = text
    const fakeRow = {}
    if (text.includes('书名') || text.includes('書名')) fakeRow['书名'] = '_'
    if (text.includes('ISBN')) fakeRow['ISBN'] = '_'
    if (text.includes('品名')) fakeRow['品名'] = '_'
    if (text.includes('條碼')) fakeRow['條碼'] = '_'
    peekRows = [fakeRow]
  } else {
    const buf = readFileSync(absPath)
    const wb = read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    peekRows = utils.sheet_to_json(ws, { defval: '' }).slice(0, 5)
  }

  const supplier = detectSupplier(fname, peekRows)
  if (!supplier) {
    console.error(`   ❌ 无法识别供应商格式：${fname}`)
    console.error('   请在 SUPPLIER_CONFIGS 中添加此供应商的配置')
    return 0
  }
  console.log(`   📋 供应商: ${supplier.cfg.name}`)

  const books = isPDF
    ? await parsePDF(pdfText, supplier.cfg)
    : parseExcel(absPath, supplier.cfg)
  console.log(`   解析到 ${books.length} 种书`)

  if (books.length === 0) return 0

  // 检查已有 barcode 避免重复
  const barcodes = books.filter(b => b.barcode).map(b => b.barcode)
  const { data: existing } = barcodes.length
    ? await supabase.from('books').select('barcode').in('barcode', barcodes)
    : { data: [] }
  const existingBarcodes = new Set((existing || []).map(r => r.barcode))

  // 获取内部编号起始值（给无条码的书）
  let nextInternal = await getNextInternalBarcode()
  let nextNum = parseInt(nextInternal.replace('EB-', ''))

  // 展开数量 + 跳过重复 + 分配条码
  const rows = []
  let skipped = 0
  for (const book of books) {
    if (book.barcode && existingBarcodes.has(book.barcode)) {
      skipped++
      continue
    }
    const qty = book.quantity
    const { quantity, ...row } = book
    for (let i = 0; i < qty; i++) {
      const finalBarcode = row.barcode || `EB-${String(nextNum++).padStart(5, '0')}`
      rows.push({ ...row, barcode: finalBarcode, isbn: row.barcode, status: 'active' })
    }
  }

  if (rows.length === 0) {
    console.log(`   ⏭️  全部已存在，跳过`)
    return 0
  }

  // 分批插入（每批 50 条）
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('books').insert(batch)
    if (error) {
      console.error(`   ❌ 批次 ${Math.floor(i / BATCH) + 1} 失败:`, error.message)
    } else {
      inserted += batch.length
    }
  }

  console.log(`   ✅ 导入 ${inserted} 条 | 跳过 ${skipped} 种（已存在）| 供应商: ${supplier.cfg.name}`)
  return inserted
}

// ── Main ──
const files = process.argv.slice(2)
if (files.length === 0) {
  console.log('用法: node scripts/import-books.mjs <excel文件路径> [更多文件...]')
  console.log('示例: node scripts/import-books.mjs scripts/data/報價單__日期_20260205.xls')
  console.log('\n已配置的供应商:')
  for (const [key, cfg] of Object.entries(SUPPLIER_CONFIGS)) {
    console.log(`  - ${key}: ${cfg.name}`)
  }
  process.exit(0)
}

let total = 0
for (const f of files) {
  total += await importFile(f)
}
console.log(`\n🎉 完成！共导入 ${total} 条记录到 books 表`)
