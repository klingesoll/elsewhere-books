import { useState, useEffect, useRef } from 'react'
import { calculatePrice, CURRENCIES, BOOK_TYPES, DEFAULT_RATES } from '../lib/pricing'
import { CATEGORIES } from '../constants/site'
import './POS.css'

const MANAGERS_KEY = 'eb_pos_managers'
const ACTIVE_MGR_KEY = 'eb_pos_active_mgr'

function loadManagers() {
  try { return JSON.parse(localStorage.getItem(MANAGERS_KEY)) || [] } catch { return [] }
}
function saveManagers(list) { localStorage.setItem(MANAGERS_KEY, JSON.stringify(list)) }

function emptyItem(type = 'new') {
  return {
    id: Date.now() + Math.random(),
    type,
    title: '',
    category: '',
    currency: 'CNY',
    originalPrice: '',
    recommended: false,
  }
}

export default function POS() {
  const [manager, setManager] = useState(() => localStorage.getItem(ACTIVE_MGR_KEY) || '')
  const [managers, setManagers] = useState(loadManagers)
  const [showManagerPicker, setShowManagerPicker] = useState(!manager)
  const [newMgrName, setNewMgrName] = useState('')

  const [items, setItems] = useState([])
  const [purchaseType, setPurchaseType] = useState(null) // 'member' | 'standard'
  const [rates, setRates] = useState(DEFAULT_RATES)
  const [ratesStatus, setRatesStatus] = useState('loading') // loading | ok | error
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(null) // { type: 'success' | 'error', msg }
  const [history, setHistory] = useState([]) // session sales
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef()

  // Fetch exchange rates on mount
  useEffect(() => { fetchRates() }, [])

  async function fetchRates() {
    setRatesStatus('loading')
    try {
      const r = await fetch('/api/exchange-rates')
      const data = await r.json()
      if (data.ok) { setRates(data.rates); setRatesStatus('ok') }
      else setRatesStatus('error')
    } catch { setRatesStatus('error') }
  }

  // Manager selection
  function selectManager(name) {
    setManager(name)
    localStorage.setItem(ACTIVE_MGR_KEY, name)
    if (!managers.includes(name)) {
      const updated = [...managers, name]
      setManagers(updated)
      saveManagers(updated)
    }
    setShowManagerPicker(false)
  }

  // Item helpers
  function addItem(type) {
    setItems(prev => [...prev, emptyItem(type)])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function updateItem(id, field, value) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  // Calculate prices for all items
  function getItemPrices(item) {
    const price = parseFloat(item.originalPrice) || 0
    return calculatePrice({
      type: item.type,
      originalPrice: price,
      currency: item.currency,
      recommended: item.recommended,
      rates,
    })
  }

  const totals = items.reduce((acc, it) => {
    const p = getItemPrices(it)
    return {
      standard: acc.standard + p.standardPrice,
      member: acc.member + p.memberPrice,
    }
  }, { standard: 0, member: 0 })

  // Save sale
  async function confirmSale() {
    if (!purchaseType) { setFlash({ type: 'error', msg: '请选择购买类型（会员/非会员）' }); return }
    if (items.length === 0) { setFlash({ type: 'error', msg: '请先添加书籍' }); return }

    const saleItems = items.map(it => {
      const p = getItemPrices(it)
      return {
        title: it.title || '未命名',
        category: it.category,
        type: it.type,
        currency: it.currency,
        originalPrice: parseFloat(it.originalPrice) || 0,
        standardPrice: p.standardPrice,
        memberPrice: p.memberPrice,
        recommended: it.recommended,
      }
    })

    const totalAUD = purchaseType === 'member' ? totals.member : totals.standard

    setSaving(true)
    try {
      const r = await fetch('/api/record-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: saleItems, purchaseType, manager }),
      })
      const data = await r.json()

      const saleRecord = {
        id: Date.now(),
        items: saleItems,
        purchaseType,
        manager,
        total: totalAUD,
        time: new Date().toISOString(),
        savedToDb: data.saved !== false,
      }
      setHistory(prev => [saleRecord, ...prev])
      setItems([])
      setPurchaseType(null)
      setFlash({ type: 'success', msg: `已结账 A$${totalAUD} · ${saleItems.length}本` })
      setTimeout(() => setFlash(null), 3000)
    } catch (err) {
      setFlash({ type: 'error', msg: '保存失败: ' + err.message })
    }
    setSaving(false)
  }

  // Void a sale (remove from session history + mark voided in DB)
  async function voidSale(saleId) {
    const sale = history.find(s => s.id === saleId)
    if (!sale) return

    try {
      await fetch('/api/void-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId, source: 'web_pos', reason: `${manager} 手动作废` }),
      })
    } catch {
      // Even if cloud void fails, still remove locally
    }

    setHistory(prev => prev.filter(s => s.id !== saleId))
    setFlash({ type: 'success', msg: '已作废该笔订单' })
    setTimeout(() => setFlash(null), 3000)
  }

  // CSV export
  function exportCsv() {
    const headers = ['时间','店长','类型','书名','分类','货币','原价','标准价AUD','会员价AUD','购买类型','推荐']
    const rows = []
    for (const sale of history) {
      for (const it of sale.items) {
        rows.push([
          sale.time, sale.manager, it.type, it.title, it.category,
          it.currency, it.originalPrice, it.standardPrice, it.memberPrice,
          sale.purchaseType, it.recommended ? '是' : '否',
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      }
    }
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `elsewhere-sales-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // ─── Manager Picker ───────────────────────────────────────────────
  if (showManagerPicker) {
    return (
      <div className="pos-shell">
        <div className="pos-manager-picker">
          <h2 className="pos-mp-title">店长登录</h2>
          <p className="pos-mp-sub">选择你的名字开始值班</p>
          <div className="pos-mp-list">
            {managers.map(name => (
              <button key={name} className="pos-mp-btn" onClick={() => selectManager(name)}>
                {name}
              </button>
            ))}
          </div>
          <form className="pos-mp-form" onSubmit={e => { e.preventDefault(); if (newMgrName.trim()) selectManager(newMgrName.trim()) }}>
            <input
              className="pos-mp-input"
              placeholder="输入新名字..."
              value={newMgrName}
              onChange={e => setNewMgrName(e.target.value)}
            />
            <button type="submit" className="pos-mp-go" disabled={!newMgrName.trim()}>开始值班</button>
          </form>
        </div>
      </div>
    )
  }

  // ─── History View ─────────────────────────────────────────────────
  if (showHistory) {
    const totalRevenue = history.reduce((s, h) => s + h.total, 0)
    const totalBooks = history.reduce((s, h) => s + h.items.length, 0)
    return (
      <div className="pos-shell">
        <div className="pos-topbar">
          <button className="pos-back" onClick={() => setShowHistory(false)}>← 返回收银台</button>
          <span className="pos-topbar-title">📊 本次值班记录</span>
          {history.length > 0 && (
            <button className="pos-export-btn" onClick={exportCsv}>📥 导出CSV</button>
          )}
        </div>
        <div className="pos-stats-bar">
          <div className="pos-stat"><span className="pos-stat-num">{history.length}</span><span className="pos-stat-label">笔订单</span></div>
          <div className="pos-stat"><span className="pos-stat-num">{totalBooks}</span><span className="pos-stat-label">本书</span></div>
          <div className="pos-stat"><span className="pos-stat-num">A${totalRevenue}</span><span className="pos-stat-label">总收入</span></div>
        </div>
        <div className="pos-history-list">
          {history.length === 0 && <p className="pos-empty">暂无记录</p>}
          {history.map(sale => (
            <div key={sale.id} className={`pos-history-card${sale.voiding ? ' pos-hc--voiding' : ''}`}>
              <div className="pos-hc-header">
                <span className="pos-hc-time">{new Date(sale.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="pos-hc-type">{sale.purchaseType === 'member' ? '🎫 会员' : '👥 非会员'}</span>
                <span className="pos-hc-total">A${sale.total}</span>
                <button
                  className="pos-hc-void"
                  title="作废此笔"
                  onClick={() => {
                    if (window.confirm(`确认作废此笔订单？\n${sale.items.length}本 · A$${sale.total}`)) {
                      voidSale(sale.id)
                    }
                  }}
                >✕ 作废</button>
              </div>
              {sale.items.map((it, j) => (
                <div key={j} className="pos-hc-item">
                  <span className="pos-hc-title">{it.title}</span>
                  <span className="pos-hc-price">A${sale.purchaseType === 'member' ? it.memberPrice : it.standardPrice}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Main POS ─────────────────────────────────────────────────────
  return (
    <div className="pos-shell">
      {/* Top bar */}
      <div className="pos-topbar">
        <a href="/" className="pos-back">← 书库</a>
        <span className="pos-topbar-title">📚 收银台</span>
        <div className="pos-topbar-right">
          <span className="pos-rate-badge" data-status={ratesStatus} onClick={fetchRates} title="点击刷新汇率">
            {ratesStatus === 'ok' ? '✓ 汇率已更新' : ratesStatus === 'loading' ? '↻ 更新中...' : '⚠ 汇率离线'}
          </span>
          <span className="pos-mgr-name">{manager}</span>
          <button className="pos-icon-btn" onClick={() => setShowManagerPicker(true)} title="切换店长">🔄</button>
          <button className="pos-icon-btn" onClick={() => setShowHistory(true)} title="销售记录">📊</button>
        </div>
      </div>

      {/* Flash message */}
      {flash && <div className={`pos-flash pos-flash--${flash.type}`}>{flash.msg}</div>}

      {/* Items */}
      <div className="pos-items">
        {items.length === 0 && (
          <div className="pos-empty-state">
            <p>点击下方按钮添加书籍</p>
          </div>
        )}
        {items.map((item, idx) => {
          const prices = getItemPrices(item)
          const isFixed = item.type === 'used' || item.type === 'corner'
          return (
            <div key={item.id} className={`pos-card pos-card--${item.type}`}>
              <div className="pos-card-header">
                <span className="pos-card-num">#{idx + 1}</span>
                <span className="pos-card-type">{BOOK_TYPES.find(t => t.key === item.type)?.label}</span>
                <button className="pos-card-remove" onClick={() => removeItem(item.id)}>✕</button>
              </div>
              <div className="pos-card-body">
                <div className="pos-field">
                  <label>📖 书名</label>
                  <input value={item.title} onChange={e => updateItem(item.id, 'title', e.target.value)} placeholder="输入书名..." />
                </div>
                <div className="pos-field pos-field-half">
                  <label>📚 分类</label>
                  <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)}>
                    <option value="">选择分类</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {!isFixed && (
                  <>
                    <div className="pos-field pos-field-half">
                      <label>💴 货币 + 原价</label>
                      <div className="pos-price-input">
                        <select value={item.currency} onChange={e => updateItem(item.id, 'currency', e.target.value)}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item.originalPrice}
                          onChange={e => updateItem(item.id, 'originalPrice', e.target.value)}
                          placeholder="原价"
                        />
                      </div>
                    </div>
                    <div className="pos-field pos-field-check">
                      <label>
                        <input type="checkbox" checked={item.recommended} onChange={e => updateItem(item.id, 'recommended', e.target.checked)} />
                        ⭐ 推荐（会员85折）
                      </label>
                    </div>
                  </>
                )}
                {isFixed && (
                  <div className="pos-field pos-field-half">
                    <label>💰 AUD 售价</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.originalPrice}
                      onChange={e => updateItem(item.id, 'originalPrice', e.target.value)}
                      placeholder={item.type === 'used' ? '5' : '输入价格'}
                    />
                  </div>
                )}
              </div>
              <div className="pos-card-prices">
                <div className="pos-price-col pos-price-member">
                  <span className="pos-price-label">会员价</span>
                  <span className="pos-price-val">A${prices.memberPrice}</span>
                </div>
                <div className="pos-price-col pos-price-standard">
                  <span className="pos-price-label">标准价</span>
                  <span className="pos-price-val">A${prices.standardPrice}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Bottom bar */}
      <div className="pos-bottom">
        {/* Add buttons */}
        <div className="pos-add-row">
          {BOOK_TYPES.map(t => (
            <button key={t.key} className="pos-add-btn" onClick={() => addItem(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <>
            <div className="pos-totals">
              <div className={`pos-total-box ${purchaseType === 'member' ? 'pos-total-box--active' : ''}`} onClick={() => setPurchaseType('member')}>
                <span className="pos-total-label">🎫 会员购买</span>
                <span className="pos-total-val">A${totals.member}</span>
              </div>
              <div className={`pos-total-box ${purchaseType === 'standard' ? 'pos-total-box--active' : ''}`} onClick={() => setPurchaseType('standard')}>
                <span className="pos-total-label">👥 非会员购买</span>
                <span className="pos-total-val">A${totals.standard}</span>
              </div>
            </div>

            <button
              className="pos-confirm-btn"
              onClick={confirmSale}
              disabled={saving || !purchaseType}
            >
              {saving ? '保存中...' : `✓ 确认售出并保存 · A$${purchaseType === 'member' ? totals.member : purchaseType === 'standard' ? totals.standard : '—'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
