import { useState, useRef } from 'react'
import './Scanner.css'

const emptyBook = {
  titleCn: '', titleEn: '', author: '', publisher: '',
  year: '', isbn: '', category: '', price: '', excerpt: '', sku: '',
}

export default function Scanner() {
  const [phase, setPhase] = useState('capture') // capture | scanning | review | saved
  const [preview, setPreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [book, setBook] = useState(emptyBook)
  const [savedBooks, setSavedBooks] = useState([])
  const [error, setError] = useState(null)
  const fileInputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      setImageBase64(e.target.result.split(',')[1])
      setPhase('scanning')
      setError(null)
      scanBook(e.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const scanBook = async (b64) => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
              { type: 'text', text: `识别书封/书脊，严格返回JSON，无其他文字：
{"titleCn":"中文书名","titleEn":"英文书名","author":"作者","publisher":"出版社","year":"年份","isbn":"ISBN","category":"文學/哲學/建築/攝影/藝術/設計/其他","price":"建议零售价数字","excerpt":"一句精髓语句中文60字内","sku":""}` }
            ]
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      parsed.sku = 'B-' + String(Math.floor(Math.random() * 900) + 100)
      setBook(parsed)
      setPhase('review')
    } catch (e) {
      setError('识别失败，请重试')
      setPhase('capture')
    }
  }

  const handleSave = () => {
    setSavedBooks(prev => [{ ...book, preview, id: Date.now() }, ...prev])
    setPhase('saved')
    setTimeout(() => {
      setPreview(null); setImageBase64(null)
      setBook(emptyBook); setPhase('capture')
    }, 1500)
  }

  const retake = () => {
    setPreview(null); setImageBase64(null)
    setBook(emptyBook); setPhase('capture')
  }

  // ── UI ─────────────────────────────────────────────────────────────

  if (phase === 'capture') return (
    <div className="sc-shell">
      <div className="sc-topbar">
        <a href="/" className="sc-back">← 書庫</a>
        <span className="sc-topbar-title">掃書上架</span>
        {savedBooks.length > 0 && (
          <span className="sc-badge">{savedBooks.length} 本</span>
        )}
      </div>

      <div className="sc-capture-zone" onClick={() => fileInputRef.current.click()}>
        <div className="sc-camera-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="white" strokeWidth="1.5" strokeDasharray="5 3"/>
            <circle cx="28" cy="29" r="10" stroke="white" strokeWidth="1.5"/>
            <rect x="19" y="17" width="18" height="4" rx="1" stroke="white" strokeWidth="1.5"/>
            <circle cx="28" cy="29" r="4" fill="white"/>
          </svg>
        </div>
        <p className="sc-camera-label">拍書封 / 書脊</p>
        <p className="sc-camera-hint">點擊啟動相機</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {error && <div className="sc-error">{error}</div>}

      {savedBooks.length > 0 && (
        <div className="sc-saved-panel">
          <p className="sc-saved-header">本次已錄入 {savedBooks.length} 本</p>
          {savedBooks.map(b => (
            <div key={b.id} className="sc-saved-row">
              <img src={b.preview} alt="" className="sc-saved-thumb" />
              <div>
                <div className="sc-saved-name">{b.titleCn || b.titleEn}</div>
                <div className="sc-saved-meta">{b.author} · {b.sku} · ¥{b.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (phase === 'scanning') return (
    <div className="sc-shell sc-shell-dark">
      <img src={preview} alt="" className="sc-bg-img" />
      <div className="sc-scanning-overlay">
        <div className="sc-scan-line" />
        <p className="sc-scanning-text">AI 識別中...</p>
      </div>
    </div>
  )

  if (phase === 'saved') return (
    <div className="sc-shell sc-shell-purple">
      <div className="sc-saved-confirm">
        <div className="sc-check">✓</div>
        <p className="sc-saved-msg">已入庫</p>
        <p className="sc-saved-book">{book.titleCn || book.titleEn}</p>
        <p className="sc-saved-sku">{book.sku}</p>
      </div>
    </div>
  )

  // phase === 'review'
  return (
    <div className="sc-shell">
      <div className="sc-topbar">
        <button className="sc-back" onClick={retake}>← 重拍</button>
        <span className="sc-topbar-title">確認書目</span>
        <button className="sc-save-btn" onClick={handleSave}>入庫 →</button>
      </div>

      <div className="sc-review">
        <div className="sc-preview-strip">
          <img src={preview} alt="" className="sc-review-thumb" />
          <div className="sc-sku-badge">{book.sku}</div>
        </div>

        <div className="sc-fields">
          {[
            ['中文書名', 'titleCn'],
            ['英文書名', 'titleEn'],
            ['作者', 'author'],
            ['出版社', 'publisher'],
            ['年份', 'year'],
            ['ISBN', 'isbn'],
            ['分類', 'category'],
            ['定價 ¥', 'price'],
          ].map(([label, key]) => (
            <div className="sc-row" key={key}>
              <span className="sc-row-label">{label}</span>
              <input
                className="sc-row-input"
                value={book[key] || ''}
                onChange={e => setBook(b => ({ ...b, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="sc-row sc-row-full">
            <span className="sc-row-label">精選語句</span>
            <textarea
              className="sc-row-input sc-row-textarea"
              value={book.excerpt || ''}
              onChange={e => setBook(b => ({ ...b, excerpt: e.target.value }))}
            />
          </div>
        </div>

        <button className="sc-save-full" onClick={handleSave}>
          加入書庫 →
        </button>
      </div>
    </div>
  )
}
