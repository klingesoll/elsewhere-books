/**
 * Sync local sales_records.json → Supabase via /api/sync-sales
 *
 * Usage:
 *   node scripts/sync-to-supabase.js
 *
 * Environment variables (or edit the constants below):
 *   SYNC_API_URL   — your deployed API (default: https://your-site.vercel.app)
 *   ADMIN_SECRET   — same token as your Vercel env var
 *   SALES_JSON     — path to sales_records.json (auto-detected if not set)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// ─── Config ────────────────────────────────────────────────────────
const API_URL = process.env.SYNC_API_URL || 'https://elsewhere-books.vercel.app'
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''
const SALES_PATH = process.env.SALES_JSON || join(homedir(), '.bookstore_data', 'sales_records.json')
const SYNC_LOG = join(homedir(), '.bookstore_data', 'last_sync.json')

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log(`[sync] ${new Date().toLocaleString('zh-CN')}`)
  console.log(`[sync] Reading: ${SALES_PATH}`)

  if (!existsSync(SALES_PATH)) {
    console.log('[sync] sales_records.json not found, nothing to sync.')
    return
  }

  const raw = readFileSync(SALES_PATH, 'utf-8')
  let allSales
  try {
    allSales = JSON.parse(raw)
  } catch (e) {
    console.error('[sync] Failed to parse JSON:', e.message)
    return
  }

  if (!Array.isArray(allSales) || allSales.length === 0) {
    console.log('[sync] No sales records found.')
    return
  }

  // Load last sync marker to only push new records
  let lastSyncId = null
  if (existsSync(SYNC_LOG)) {
    try {
      const log = JSON.parse(readFileSync(SYNC_LOG, 'utf-8'))
      lastSyncId = log.lastId
    } catch {}
  }

  // Filter: only records after last synced ID
  let toSync = allSales
  if (lastSyncId) {
    const idx = allSales.findIndex(s => s.id === lastSyncId)
    if (idx >= 0) {
      toSync = allSales.slice(idx + 1)
    }
  }

  if (toSync.length === 0) {
    console.log('[sync] All records already synced.')
    return
  }

  console.log(`[sync] Pushing ${toSync.length} new records (total in file: ${allSales.length})...`)

  // Push in batches of 50
  const BATCH = 50
  let totalInserted = 0
  let totalSkipped = 0

  for (let i = 0; i < toSync.length; i += BATCH) {
    const batch = toSync.slice(i, i + BATCH)
    try {
      const resp = await fetch(`${API_URL}/api/sync-sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': ADMIN_SECRET,
        },
        body: JSON.stringify({ sales: batch }),
      })
      const data = await resp.json()

      if (!resp.ok) {
        console.error(`[sync] Batch ${i / BATCH + 1} failed: ${data.error}`)
        continue
      }

      totalInserted += data.inserted || 0
      totalSkipped += data.skipped || 0
      console.log(`[sync] Batch ${i / BATCH + 1}: +${data.inserted} new, ${data.skipped} skipped`)
    } catch (err) {
      console.error(`[sync] Network error on batch ${i / BATCH + 1}:`, err.message)
    }
  }

  // Save sync marker
  const lastRecord = toSync[toSync.length - 1]
  writeFileSync(SYNC_LOG, JSON.stringify({
    lastId: lastRecord.id,
    syncedAt: new Date().toISOString(),
    inserted: totalInserted,
    skipped: totalSkipped,
  }, null, 2))

  console.log(`[sync] Done! Inserted: ${totalInserted}, Skipped: ${totalSkipped}`)
}

main().catch(err => {
  console.error('[sync] Fatal error:', err)
  process.exit(1)
})
