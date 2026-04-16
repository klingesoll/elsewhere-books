import { useState } from 'react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'dev'
const SESSION_KEY = 'eb_admin_auth'

export function useAdminAuth() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

export function adminLogin(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true')
    return true
  }
  return false
}

export function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY)
}

export default function LoginPage({ onSuccess }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (adminLogin(pw)) {
      onSuccess()
    } else {
      setError(true)
      setShaking(true)
      setPw('')
      setTimeout(() => setShaking(false), 400)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2vw',
    }}>
      <div style={{
        border: '1px solid var(--line-color)',
        background: 'var(--bg-color)',
        width: '100%',
        maxWidth: '420px',
      }}>

        {/* Header strip — same as main site */}
        <div style={{
          borderBottom: '1px solid var(--line-color)',
          padding: '1.25rem 1.5rem',
          background: 'var(--pure-white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <a href="/" style={{
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              color: 'var(--line-color)',
            }}>
              ELSEWHERE BOOKS
            </a>
            <p style={{
              fontFamily: 'var(--font-literary)',
              fontSize: '0.9rem',
              letterSpacing: '0.2em',
              marginTop: '0.1rem',
            }}>別處書社</p>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            border: '1px solid var(--line-color)',
            padding: '0.15rem 0.4rem',
            letterSpacing: '0.05em',
          }}>ADMIN</span>
        </div>

        {/* Login form */}
        <div style={{ padding: '2rem 1.5rem' }}>
          <span className="label">Access</span>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            marginBottom: '1.5rem',
            color: '#555',
            lineHeight: 1.5,
          }}>
            管理員専用入口<br />
            RESTRICTED AREA
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.4rem',
                color: '#555',
              }}>
                密碼 Password
              </label>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(false) }}
                autoFocus
                style={{
                  width: '100%',
                  background: error ? '#fff0f0' : 'var(--pure-white)',
                  border: `1px solid ${error ? '#c00' : 'var(--line-color)'}`,
                  padding: '0.6rem 0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  letterSpacing: '0.15em',
                  outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                  animation: shaking ? 'shake 0.35s ease' : 'none',
                }}
                placeholder="••••••••"
              />
              {error && (
                <p style={{
                  marginTop: '0.4rem',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#c00',
                  letterSpacing: '0.05em',
                }}>
                  密碼錯誤 / Incorrect password
                </p>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'var(--line-color)',
                color: 'var(--pure-white)',
                border: 'none',
                padding: '0.75rem',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginTop: '0.25rem',
              }}
            >
              進入後台 →
            </button>
          </form>
        </div>

        {/* Footer strip */}
        <div style={{
          borderTop: '1px solid var(--line-color)',
          padding: '0.6rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <a href="/" style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#888',
            letterSpacing: '0.03em',
          }}>← 返回主頁</a>
          <span style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: '#aaa',
          }}>SESSION-SCOPED</span>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
