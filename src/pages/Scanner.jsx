import { useState, useRef } from 'react'
import './Scanner.css'

const emptyBook = {
  titleCn: '', titleEn: '', author: '', publisher: '',
  year: '', isbn: '', category: '', price: '', excerpt: '', sku: '',
}

function genSku() {
  return 'B-' + String(Math.floor(Math.random() * 9000) + 1000)
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1])
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片讀取失敗')) }
    img.src = url
  })
}

async function callScan(b64, mode) {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: b64, mimeType: 'image/jpeg', mode }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data.result
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Scanner() {
  // step: menu | spine | spine-scanning | price | price-scanning | review | saved
  const [step, setStep]       = useState('menu')
  const [book, setBook]       = useState(emptyBook)
  const [spinePreview, setSpinePreview] = useState(null)
  const [pricePreview, setPricePreview] = useState(null)
  const [queue, setQueue]     = useState([])   // confirmed books this session
  const [error, setError]     = useState(null)
  const [lookingUp, setLookingUp] = useState(false)

  const spineInputRef  = useRef()
  const libraryInputRef = useRef()
  const priceInputRef  = useRef()
  const priceLibRef    = useRef()

  // ── helpers ───────────────────────────────────────────────────────────────
  const reset = () => {
    setBook(emptyBook)
    setSpinePreview(null)
    setPricePreview(null)
    setError(null)
    setStep('menu')
  }

  const exportCsv = () => {
    const headers = ['SKU','中文書名','英文書名','作者','出版社','年份','ISBN','分類','定價','精選語句']
    const rows = queue.map(b => [
      b.sku, b.titleCn, b.titleEn, b.author, b.publisher,
      b.year, b.isbn, b.category, b.price, b.excerpt,
    ].map(v => `"${(v||'').replace(/"/g,'""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `elsewhere-进货单-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  // ── STEP 1: spine scan ────────────────────────────────────────────────────
  const handleSpineFile = async (file) => {
    if (!file) return
    setError(null)
    setStep('spine-scanning')
    try {
      const b64 = await compressImage(file)
      setSpinePreview('data:image/jpeg;base64,' + b64)
      const result = await callScan(b64, 'spine')
      setBook({ ...emptyBook, ...result, sku: genSku() })
      setStep('price')
    } catch (err) {
      setError('書脊識別失敗：' + err.message)
      setStep('menu')
    }
  }

  // ── STEP 2: price scan ────────────────────────────────────────────────────
  const handlePriceFile = async (file) => {
    if (!file) return
    setError(null)
    setStep('price-scanning')
    try {
      const b64 = await compressImage(file)
      setPricePreview('data:image/jpeg;base64,' + b64)
      const result = await callScan(b64, 'price')
      if (result.price) {
        setBook(b => ({ ...b, price: result.price }))
        setStep('review')
      } else {
        // Price not visible — try auto-lookup
        await lookupPrice()
      }
    } catch (err) {
      setError('定價識別失敗：' + err.message)
      setStep('price')
    }
  }

  const lookupPrice = async () => {
    setLookingUp(true)
    setStep('price-scanning')
    try {
      const params = new URLSearchParams()
      if (book.isbn) params.set('isbn', book.isbn)
      else { params.set('title', book.titleCn || book.titleEn); params.set('author', book.author) }
      const res = await fetch(`/api/price-lookup?${params}`)
      const data = await res.json()
      if (data.ok && data.price) {
        setBook(b => ({ ...b, price: data.price }))
        setError(null)
      } else {
        setError('未找到官方定價，請在確認頁手動填寫')
      }
    } catch (e) {
      setError('查詢定價失敗：' + e.message)
    }
    setLookingUp(false)
    setStep('review')
  }

  const skipPrice = () => {
    setStep('review')
  }

  // ── STEP 3: confirm & add to queue ────────────────────────────────────────
  const confirmBook = () => {
    setQueue(q => [{ ...book, spinePreview, id: Date.now() }, ...q])
    setStep('saved')
    setTimeout(() => reset(), 1400)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (step === 'menu') return (
    <div className="sc-shell">
      <div className="sc-topbar">
        <a href="/" className="sc-back">← 書庫</a>
        <span className="sc-topbar-title">批量掃書</span>
        {queue.length > 0 && (
          <button className="sc-badge-btn" onClick={exportCsv}>
            {queue.length} 本 · 導出 CSV
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="sc-instructions">
        <div className="sc-step-guide">
          <div className="sc-guide-step">
            <span className="sc-guide-num">①</span>
            <div>
              <p className="sc-guide-title">拍書脊</p>
              <p className="sc-guide-hint">豎拍書脊或封面，確保書名、作者清晰可見</p>
            </div>
          </div>
          <div className="sc-guide-arrow">↓</div>
          <div className="sc-guide-step">
            <span className="sc-guide-num">②</span>
            <div>
              <p className="sc-guide-title">拍定價</p>
              <p className="sc-guide-hint">拍封底條碼區或定價標籤。看不到定價可自動查詢</p>
            </div>
          </div>
          <div className="sc-guide-arrow">↓</div>
          <div className="sc-guide-step">
            <span className="sc-guide-num">③</span>
            <div>
              <p className="sc-guide-title">確認入庫</p>
              <p className="sc-guide-hint">核對信息後加入本批次，繼續掃下一本</p>
            </div>
          </div>
        </div>
      </div>

      {/* Start buttons */}
      <div className="sc-menu-actions">
        <div className="sc-photo-row">
          <div className="sc-capture-zone sc-capture-half" onClick={() => spineInputRef.current.click()}>
            <CameraIcon />
            <p className="sc-camera-label">拍照掃書</p>
          </div>
          <div className="sc-capture-zone sc-capture-half sc-library-zone" onClick={() => libraryInputRef.current.click()}>
            <GalleryIcon />
            <p className="sc-camera-label">從相冊選擇</p>
          </div>
        </div>
        <input ref={spineInputRef}  type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => handleSpineFile(e.target.files[0])} />
        <input ref={libraryInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleSpineFile(e.target.files[0])} />
      </div>

      {error && <div className="sc-error">{error}</div>}

      {/* Queue */}
      {queue.length > 0 && (
        <div className="sc-saved-panel">
          <div className="sc-saved-header-row">
            <p className="sc-saved-header">本批次已錄入 {queue.length} 本</p>
            <button className="sc-export-btn" onClick={exportCsv}>↓ 導出進貨單</button>
          </div>
          {queue.map(b => (
            <div key={b.id} className="sc-saved-row">
              {b.spinePreview
                ? <img src={b.spinePreview} alt="" className="sc-saved-thumb" />
                : <div className="sc-saved-thumb sc-thumb-placeholder" />}
              <div className="sc-saved-info">
                <div className="sc-saved-name">{b.titleCn || b.titleEn}</div>
                <div className="sc-saved-meta">{b.author}{b.price ? ` · ¥${b.price}` : ''} · {b.sku}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Scanning overlay (spine or price) ─────────────────────────────────────
  if (step === 'spine-scanning' || step === 'price-scanning') return (
    <div className="sc-shell sc-shell-dark">
      {(spinePreview || pricePreview) && (
        <img src={step === 'price-scanning' ? (pricePreview || spinePreview) : spinePreview} alt="" className="sc-bg-img" />
      )}
      <div className="sc-scanning-overlay">
        <div className="sc-scan-line" />
        <p className="sc-scanning-text">
          {step === 'spine-scanning' ? 'AI 識別書脊中...' : lookingUp ? '查詢官方定價中...' : 'AI 識別定價中...'}
        </p>
      </div>
    </div>
  )

  // ── Step 2: price ─────────────────────────────────────────────────────────
  if (step === 'price') return (
    <div className="sc-shell">
      <div className="sc-topbar">
        <button className="sc-back" onClick={() => setStep('spine')}>← 重拍書脊</button>
        <span className="sc-topbar-title">② 拍定價</span>
        <button className="sc-back" onClick={skipPrice}>跳過 →</button>
      </div>

      {/* Book identified so far */}
      <div className="sc-identified-bar">
        {spinePreview && <img src={spinePreview} alt="" className="sc-id-thumb" />}
        <div>
          <p className="sc-id-title">{book.titleCn || book.titleEn || '—'}</p>
          <p className="sc-id-author">{book.author}</p>
        </div>
        <span className="sc-id-check">✓ 書脊已識別</span>
      </div>

      <div className="sc-price-hint">
        <p>請拍攝書的<strong>封底條碼區</strong>或<strong>定價標籤</strong></p>
        <p className="sc-hint-sub">看不到定價？點「跳過」系統會自動查詢</p>
      </div>

      <div className="sc-photo-row" style={{ margin: '0 1rem' }}>
        <div className="sc-capture-zone sc-capture-half" onClick={() => priceInputRef.current.click()}>
          <CameraIcon />
          <p className="sc-camera-label">拍定價</p>
        </div>
        <div className="sc-capture-zone sc-capture-half sc-library-zone" onClick={() => priceLibRef.current.click()}>
          <GalleryIcon />
          <p className="sc-camera-label">從相冊選</p>
        </div>
      </div>

      <input ref={priceInputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => handlePriceFile(e.target.files[0])} />
      <input ref={priceLibRef}   type="file" accept="image/*" style={{ display:'none' }} onChange={e => handlePriceFile(e.target.files[0])} />

      {error && <div className="sc-error" style={{ margin: '0 1rem' }}>{error}</div>}

      <button className="sc-lookup-btn" onClick={lookupPrice} disabled={lookingUp}>
        {lookingUp ? '查詢中...' : '🔍 用書名自動查詢定價'}
      </button>
    </div>
  )

  // ── Step 3: review ────────────────────────────────────────────────────────
  if (step === 'review') return (
    <div className="sc-shell">
      <div className="sc-topbar">
        <button className="sc-back" onClick={() => setStep('price')}>← 重拍定價</button>
        <span className="sc-topbar-title">③ 確認入庫</span>
        <button className="sc-save-btn" onClick={confirmBook}>入庫 →</button>
      </div>

      <div className="sc-preview-strip">
        {spinePreview && <img src={spinePreview} alt="" className="sc-review-thumb" />}
        {pricePreview && <img src={pricePreview} alt="" className="sc-review-thumb sc-review-thumb-price" />}
        <div className="sc-sku-badge">{book.sku}</div>
      </div>

      <div className="sc-fields">
        {[
          ['中文書名', 'titleCn'],
          ['英文書名', 'titleEn'],
          ['作者',     'author'],
          ['出版社',   'publisher'],
          ['年份',     'year'],
          ['ISBN',     'isbn'],
          ['分類',     'category'],
          ['定價 ¥',   'price'],
        ].map(([label, key]) => (
          <div className="sc-row" key={key}>
            <span className="sc-row-label">{label}</span>
            <input className="sc-row-input" value={book[key] || ''}
              onChange={e => setBook(b => ({ ...b, [key]: e.target.value }))} />
          </div>
        ))}
        <div className="sc-row sc-row-full">
          <span className="sc-row-label">精選語句</span>
          <textarea className="sc-row-input sc-row-textarea" value={book.excerpt || ''}
            onChange={e => setBook(b => ({ ...b, excerpt: e.target.value }))} />
        </div>
      </div>

      <button className="sc-save-full" onClick={confirmBook}>加入批次 →</button>
    </div>
  )

  // ── Saved flash ───────────────────────────────────────────────────────────
  if (step === 'saved') return (
    <div className="sc-shell sc-shell-purple">
      <div className="sc-saved-confirm">
        <div className="sc-check">✓</div>
        <p className="sc-saved-msg">已入隊</p>
        <p className="sc-saved-book">{book.titleCn || book.titleEn}</p>
        <p className="sc-saved-sku">{book.sku}{book.price ? ` · ¥${book.price}` : ''}</p>
      </div>
    </div>
  )

  return null
}

// ── Icon components ──────────────────────────────────────────────────────────
function CameraIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="27" stroke="white" strokeWidth="1.5" strokeDasharray="5 3"/>
      <circle cx="28" cy="29" r="10" stroke="white" strokeWidth="1.5"/>
      <rect x="19" y="17" width="18" height="4" rx="1" stroke="white" strokeWidth="1.5"/>
      <circle cx="28" cy="29" r="4" fill="white"/>
    </svg>
  )
}
function GalleryIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 56 56" fill="none">
      <rect x="4" y="10" width="48" height="36" rx="3" stroke="white" strokeWidth="1.5"/>
      <circle cx="18" cy="22" r="5" stroke="white" strokeWidth="1.5"/>
      <path d="M4 36 L16 24 L26 34 L34 26 L52 40" stroke="white" strokeWidth="1.5" fill="none"/>
    </svg>
  )
}
